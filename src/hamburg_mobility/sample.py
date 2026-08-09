"""Create a Git-friendly but substantial verified multi-source data sample."""

from __future__ import annotations

import gzip
import hashlib
import json
import math
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .catalog import SOURCES, SourceSpec
from .client import SensorThingsClient

DEFAULT_SOURCE_TARGETS = {
    "traffic-lights": 40_000,
    "ev-charging": 5_000,
    "motor-traffic": 15_000,
    "cycle-counters": 25_000,
    "stadtrad": 30_000,
}


def _recent_stream_rows(
    source: SourceSpec,
    stream_id: int,
    limit: int,
    client: SensorThingsClient,
) -> list[dict[str, Any]]:
    return [
        {
            "source": source.id,
            "datastream_id": stream_id,
            "observation_id": observation.get("@iot.id"),
            "phenomenon_time": observation.get("phenomenonTime"),
            "result_time": observation.get("resultTime"),
            "result": observation.get("result"),
            "parameters": observation.get("parameters"),
        }
        for observation in client.observations(
            stream_id,
            limit=limit,
            descending=True,
            max_pages=max(1, math.ceil(limit / 10_000)),
        )
    ]


def build_multimodal_sample(
    output: Path,
    *,
    manifest_output: Path | None = None,
    stream_limit: int = 5,
    source_targets: dict[str, int] | None = None,
    clients: dict[str, SensorThingsClient] | None = None,
) -> dict[str, Any]:
    """Download recent real observations across all configured mobility domains."""
    if stream_limit < 1:
        raise ValueError("stream_limit must be positive")
    targets = source_targets or DEFAULT_SOURCE_TARGETS
    api_clients = clients or {}
    selected: list[tuple[SourceSpec, int, int, SensorThingsClient]] = []
    sampled_streams: Counter[str] = Counter()

    for source in SOURCES:
        target = max(0, targets.get(source.id, 0))
        if not target:
            continue
        api = api_clients.get(source.api_root) or SensorThingsClient(source.api_root)
        streams = api.datastreams(
            source.filter_expression,
            limit=stream_limit,
            orderby="@iot.id asc",
        )
        if not streams:
            continue
        rows_per_stream = math.ceil(target / len(streams))
        for stream in streams:
            selected.append((source, int(stream["@iot.id"]), rows_per_stream, api))
            sampled_streams[source.id] += 1

    rows_by_source: dict[str, list[dict[str, Any]]] = {source.id: [] for source in SOURCES}
    with ThreadPoolExecutor(max_workers=min(10, max(1, len(selected)))) as pool:
        futures = {
            pool.submit(_recent_stream_rows, source, stream_id, limit, api): source
            for source, stream_id, limit, api in selected
        }
        for future in as_completed(futures):
            source = futures[future]
            rows_by_source[source.id].extend(future.result())

    rows: list[dict[str, Any]] = []
    source_rows: dict[str, int] = {}
    for source in SOURCES:
        source_sample = rows_by_source[source.id][: targets.get(source.id, 0)]
        source_rows[source.id] = len(source_sample)
        rows.extend(source_sample)
    rows.sort(
        key=lambda row: (
            row["source"],
            row.get("phenomenon_time") or "",
            row.get("observation_id") or 0,
        )
    )

    output.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(output, "wt", encoding="utf-8", compresslevel=9) as destination:
        for row in rows:
            destination.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")

    timestamps = [row["phenomenon_time"] for row in rows if row.get("phenomenon_time")]
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    manifest = {
        "generatedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "format": "gzip-compressed newline-delimited JSON",
        "license": "DL-DE-BY-2.0",
        "rowCount": len(rows),
        "sourceRows": source_rows,
        "sampledStreams": dict(sampled_streams),
        "firstObservation": min(timestamps) if timestamps else None,
        "lastObservation": max(timestamps) if timestamps else None,
        "compressedBytes": output.stat().st_size,
        "sha256": digest,
    }
    manifest_path = manifest_output or output.with_suffix(".manifest.json")
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return manifest
