from __future__ import annotations

import gzip
import json
from datetime import date

from hamburg_mobility.pipeline import month_windows, raw_partition_path, write_observations


def test_month_windows_clip_boundaries():
    assert list(month_windows(date(2025, 1, 15), date(2025, 3, 3))) == [
        (date(2025, 1, 15), date(2025, 2, 1)),
        (date(2025, 2, 1), date(2025, 3, 1)),
        (date(2025, 3, 1), date(2025, 3, 3)),
    ]


def test_raw_partition_path_is_deterministic(tmp_path):
    result = raw_partition_path(tmp_path, 17302, date(2025, 8, 1))
    assert result.relative_to(tmp_path).as_posix() == (
        "bronze/source=stadtrad/year=2025/month=08/stream_id=17302/observations.jsonl.gz"
    )


def test_raw_partition_path_supports_multiple_sources(tmp_path):
    result = raw_partition_path(
        tmp_path,
        921,
        date(2026, 8, 1),
        "motor-traffic",
    )
    assert result.relative_to(tmp_path).as_posix().startswith(
        "bronze/source=motor-traffic/year=2026/month=08/"
    )


def test_write_observations_flattens_api_records(tmp_path):
    destination = tmp_path / "observations.jsonl.gz"
    observations = iter([
        {
            "@iot.id": 42,
            "result": 11,
            "phenomenonTime": "2025-08-01T10:00:00Z",
            "resultTime": "2025-08-01T10:00:01Z",
        }
    ])
    written = write_observations(
        destination,
        17302,
        observations,
        ingested_at="2025-08-01T10:01:00Z",
    )
    assert written == 1
    with gzip.open(destination, "rt", encoding="utf-8") as source:
        record = json.loads(source.readline())
    assert record["observation_id"] == 42
    assert record["source"] == "stadtrad"
    assert record["datastream_id"] == 17302
    assert record["result"] == 11
