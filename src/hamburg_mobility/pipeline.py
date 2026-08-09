"""Replay-safe bronze and silver lakehouse jobs."""

from __future__ import annotations

import gzip
import json
import os
import uuid
from collections.abc import Iterator
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from .catalog import source_spec
from .client import SensorThingsClient


def parse_date(value: str) -> date:
    return date.fromisoformat(value)


def month_windows(start: date, end: date) -> Iterator[tuple[date, date]]:
    """Yield half-open calendar-month windows clipped to [start, end)."""
    cursor = start
    while cursor < end:
        month_end = (
            date(cursor.year + 1, 1, 1)
            if cursor.month == 12
            else date(cursor.year, cursor.month + 1, 1)
        )
        window_end = min(month_end, end)
        yield cursor, window_end
        cursor = window_end


def sensor_instant(value: date) -> str:
    return f"{value.isoformat()}T00:00:00Z"


def raw_partition_path(
    root: Path,
    stream_id: int,
    start: date,
    source: str = "stadtrad",
) -> Path:
    return (
        root
        / "bronze"
        / f"source={source}"
        / f"year={start.year:04d}"
        / f"month={start.month:02d}"
        / f"stream_id={stream_id}"
        / "observations.jsonl.gz"
    )


def write_observations(
    destination: Path,
    stream_id: int,
    observations: Iterator[dict[str, Any]],
    *,
    ingested_at: str,
    source: str = "stadtrad",
) -> int:
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(f".{destination.name}.{uuid.uuid4().hex}.partial")
    count = 0
    try:
        with gzip.open(temporary, "wt", encoding="utf-8") as output:
            for observation in observations:
                record = {
                    "observation_id": observation.get("@iot.id"),
                    "source": source,
                    "datastream_id": stream_id,
                    "result": observation.get("result"),
                    "phenomenon_time": observation.get("phenomenonTime"),
                    "result_time": observation.get("resultTime"),
                    "parameters": observation.get("parameters"),
                    "ingested_at": ingested_at,
                }
                output.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
                count += 1
        os.replace(temporary, destination)
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise
    return count


def backfill(
    data_root: Path,
    *,
    start: date,
    end: date,
    source: str = "stadtrad",
    station_limit: int | None = None,
    max_pages: int | None = None,
    overwrite: bool = False,
    client: SensorThingsClient | None = None,
) -> dict[str, int | str]:
    """Download real observations into immutable, month-partitioned bronze files."""
    if end <= start:
        raise ValueError("end must be after start")
    spec = source_spec(source)
    api = client or SensorThingsClient(spec.api_root)
    streams = api.datastreams(spec.filter_expression)
    if station_limit:
        streams = streams[:station_limit]

    ingested_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    downloaded_rows = 0
    written_files = 0
    skipped_files = 0
    for window_start, window_end in month_windows(start, end):
        for stream in streams:
            stream_id = int(stream["@iot.id"])
            destination = raw_partition_path(data_root, stream_id, window_start, source)
            if destination.exists() and not overwrite:
                skipped_files += 1
                continue
            observations = api.observations(
                stream_id,
                start=sensor_instant(window_start),
                end=sensor_instant(window_end),
                max_pages=max_pages,
            )
            downloaded_rows += write_observations(
                destination,
                stream_id,
                observations,
                ingested_at=ingested_at,
                source=source,
            )
            written_files += 1
    return {
        "source": source,
        "downloaded_rows": downloaded_rows,
        "written_files": written_files,
        "skipped_files": skipped_files,
        "datastreams": len(streams),
    }


def compact(data_root: Path) -> dict[str, int | str]:
    """Deduplicate every mobility source into compressed, query-efficient Parquet."""
    try:
        import duckdb
    except ImportError as exc:  # pragma: no cover - exercised in the installed project
        raise RuntimeError("Install the project dependencies before running compact") from exc

    bronze_glob = str(data_root / "bronze" / "**" / "*.jsonl.gz")
    silver_root = data_root / "silver" / "mobility_observations"
    silver_root.mkdir(parents=True, exist_ok=True)
    warehouse = data_root / "warehouse.duckdb"
    connection = duckdb.connect(str(warehouse))
    connection.execute("PRAGMA threads=4")
    connection.execute(
        """
        CREATE OR REPLACE TABLE mobility_observations AS
        SELECT
          CAST(observation_id AS BIGINT) AS observation_id,
          REGEXP_EXTRACT(filename, 'source=([^/]+)', 1) AS source,
          CAST(datastream_id AS BIGINT) AS datastream_id,
          CAST(result AS VARCHAR) AS result,
          TRY_CAST(result AS DOUBLE) AS numeric_result,
          TRY_CAST(SPLIT_PART(phenomenon_time, '/', 1) AS TIMESTAMPTZ) AS observed_at,
          TRY_CAST(
            CASE
              WHEN CONTAINS(phenomenon_time, '/') THEN SPLIT_PART(phenomenon_time, '/', 2)
              ELSE phenomenon_time
            END AS TIMESTAMPTZ
          ) AS observed_until,
          TRY_CAST(result_time AS TIMESTAMPTZ) AS received_at,
          TRY_CAST(ingested_at AS TIMESTAMPTZ) AS ingested_at,
          YEAR(TRY_CAST(SPLIT_PART(phenomenon_time, '/', 1) AS TIMESTAMPTZ)) AS year,
          MONTH(TRY_CAST(SPLIT_PART(phenomenon_time, '/', 1) AS TIMESTAMPTZ)) AS month
        FROM read_json_auto(?, format='newline_delimited', union_by_name=true, filename=true)
        QUALIFY ROW_NUMBER() OVER (
          PARTITION BY source, observation_id
          ORDER BY TRY_CAST(ingested_at AS TIMESTAMPTZ) DESC
        ) = 1
        """,
        [bronze_glob],
    )
    connection.execute(
        """
        CREATE OR REPLACE TABLE stadtrad_observations AS
        SELECT
          observation_id,
          datastream_id,
          TRY_CAST(numeric_result AS INTEGER) AS available_bikes,
          observed_at,
          received_at,
          ingested_at,
          year,
          month
        FROM mobility_observations
        WHERE source = 'stadtrad'
        """
    )
    row_count = connection.execute("SELECT COUNT(*) FROM mobility_observations").fetchone()[0]
    connection.execute(
        """
        COPY mobility_observations TO ? (
          FORMAT PARQUET,
          COMPRESSION ZSTD,
          PARTITION_BY (source, year, month),
          OVERWRITE_OR_IGNORE TRUE
        )
        """,
        [str(silver_root)],
    )
    connection.close()
    return {"rows": int(row_count), "warehouse": str(warehouse), "silver": str(silver_root)}


def quality_report(data_root: Path) -> dict[str, Any]:
    """Evaluate the most important data-contract checks."""
    try:
        import duckdb
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("Install the project dependencies before running quality") from exc

    warehouse = data_root / "warehouse.duckdb"
    if not warehouse.exists():
        raise FileNotFoundError("Run compact before quality")
    connection = duckdb.connect(str(warehouse), read_only=True)
    row = connection.execute(
        """
        SELECT
          COUNT(*) AS rows,
          COUNT(*) FILTER (
            WHERE observation_id IS NULL OR datastream_id IS NULL OR source IS NULL
          ) AS missing_keys,
          COUNT(*) - COUNT(DISTINCT source || ':' || CAST(observation_id AS VARCHAR))
            AS duplicate_ids,
          COUNT(*) FILTER (
            WHERE source = 'stadtrad' AND numeric_result < 0
          ) AS negative_values,
          COUNT(*) FILTER (WHERE observed_at IS NULL) AS invalid_timestamps,
          COUNT(DISTINCT source) AS sources,
          CAST(MIN(observed_at) AS VARCHAR) AS first_observation,
          CAST(MAX(observed_at) AS VARCHAR) AS last_observation
        FROM mobility_observations
        """
    ).fetchone()
    connection.close()
    report = {
        "rows": row[0],
        "missing_keys": row[1],
        "duplicate_ids": row[2],
        "negative_values": row[3],
        "invalid_timestamps": row[4],
        "sources": row[5],
        "first_observation": row[6],
        "last_observation": row[7],
    }
    contract_keys = ("missing_keys", "duplicate_ids", "negative_values", "invalid_timestamps")
    report["passed"] = not any(report[key] for key in contract_keys)
    return report
