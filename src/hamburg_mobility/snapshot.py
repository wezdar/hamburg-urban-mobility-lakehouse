"""Build the small verified snapshot rendered by the public dashboard."""

from __future__ import annotations

import json
import math
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .catalog import build_source_catalog
from .client import SensorThingsClient

SOURCE_URL = "https://suche.transparenz.hamburg.de/dataset/stadtrad-stationen-hamburg39"


def _parse_instant(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _period_bounds(value: str | None) -> tuple[datetime, datetime] | None:
    if not value or "/" not in value:
        return None
    start, end = value.split("/", 1)
    return _parse_instant(start), _parse_instant(end)


def _region(latitude: float, longitude: float) -> str:
    if latitude < 53.51:
        return "south"
    if latitude > 53.61:
        return "north"
    if longitude < 9.94:
        return "west"
    if longitude > 10.06:
        return "east"
    return "central"


def _status(available: int, observed_at: str, newest: datetime) -> str:
    age_minutes = (newest - _parse_instant(observed_at)).total_seconds() / 60
    if age_minutes > 180:
        return "stale"
    if available == 0:
        return "empty"
    if available <= 2:
        return "low"
    return "healthy"


def _latest_station(stream: dict[str, Any], newest: datetime) -> dict[str, Any] | None:
    locations = stream.get("Thing", {}).get("Locations", [])
    observations = stream.get("Observations", [])
    if not locations or not observations:
        return None
    coordinates = locations[0].get("location", {}).get("geometry", {}).get("coordinates")
    if not coordinates or len(coordinates) != 2:
        return None
    observation = observations[0]
    observed_at = observation.get("phenomenonTime")
    if not observed_at:
        return None
    longitude, latitude = map(float, coordinates)
    available = max(0, int(float(observation.get("result") or 0)))
    name = stream.get("Thing", {}).get("description") or f"Station {stream['@iot.id']}"
    name = name.removeprefix("StadtRad-Station ")
    return {
        "id": stream["@iot.id"],
        "name": name,
        "latitude": latitude,
        "longitude": longitude,
        "availableBikes": available,
        "observedAt": observed_at,
        "status": _status(available, observed_at, newest),
        "region": _region(latitude, longitude),
    }


def _fetch_recent_history(client: SensorThingsClient, stream_id: int) -> list[dict[str, Any]]:
    return list(client.observations(stream_id, limit=288, descending=True, max_pages=4))


def _hourly_history(observations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    buckets: dict[str, list[float]] = defaultdict(list)
    for observation in observations:
        timestamp = observation.get("phenomenonTime")
        result = observation.get("result")
        if timestamp is None or result is None:
            continue
        hour = _parse_instant(timestamp).replace(minute=0, second=0, microsecond=0)
        buckets[hour.isoformat().replace("+00:00", "Z")].append(float(result))
    return [
        {
            "hour": hour,
            "availableBikes": round(sum(values) / len(values)),
            "observations": len(values),
        }
        for hour, values in sorted(buckets.items())[-24:]
    ]


def build_dashboard_snapshot(
    output: Path,
    *,
    history_station_count: int = 64,
    sample_manifest: Path | None = Path("public/data/multimodal-sample.manifest.json"),
    refresh_catalog: bool = False,
    client: SensorThingsClient | None = None,
) -> dict[str, Any]:
    api = client or SensorThingsClient()
    streams = api.bike_datastreams(include_latest=True)
    bounds = [
        bound
        for stream in streams
        if (bound := _period_bounds(stream.get("phenomenonTime")))
    ]
    if not bounds:
        raise RuntimeError("The API returned no valid StadtRAD coverage periods")
    first = min(start for start, _ in bounds)
    newest = max(end for _, end in bounds)
    stations = [station for stream in streams if (station := _latest_station(stream, newest))]
    stations.sort(key=lambda station: station["id"])

    candidates = sorted(
        stations,
        key=lambda station: (station["status"] == "stale", -station["availableBikes"]),
    )[:history_station_count]
    history_rows: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=min(8, max(1, len(candidates)))) as pool:
        futures = {
            pool.submit(_fetch_recent_history, api, station["id"]): station
            for station in candidates
        }
        for future in as_completed(futures):
            history_rows.extend(future.result())

    estimated_rows = sum(
        max(0, math.floor((end - start).total_seconds() / 300))
        for start, end in bounds
    )
    generated_at = datetime.now(UTC)
    catalog = build_source_catalog(
        generated_at=generated_at,
        stadtrad_estimate=estimated_rows,
        stream_counts={"stadtrad": len(streams)},
        refresh_counts=refresh_catalog,
    )
    verified_sample_rows = 0
    if sample_manifest and sample_manifest.exists():
        manifest = json.loads(sample_manifest.read_text(encoding="utf-8"))
        verified_sample_rows = int(manifest.get("rowCount", 0))
    scheduled_estimate = sum(
        int(source["estimatedRows"])
        for source in catalog
        if source["estimatedRows"] is not None
    )
    fresh_stations = [station for station in stations if station["status"] != "stale"]
    result = {
        "generatedAt": generated_at.isoformat().replace("+00:00", "Z"),
        "source": {
            "name": "Hamburg Urban Data Platform — StadtRAD",
            "url": SOURCE_URL,
            "license": "DL-DE-BY-2.0",
        },
        "coverage": {
            "firstObservation": first.isoformat().replace("+00:00", "Z"),
            "lastObservation": newest.isoformat().replace("+00:00", "Z"),
            "cadenceMinutes": 5,
            "estimatedBackfillableRows": estimated_rows,
        },
        "metrics": {
            "stations": len(stations),
            "availableBikes": sum(station["availableBikes"] for station in stations),
            "activeStations": sum(station["availableBikes"] > 0 for station in stations),
            "freshPercent": round(len(fresh_stations) / len(stations) * 100, 1),
            "snapshotRows": len(stations) + len(history_rows),
        },
        "universe": {
            "sourceCount": len(catalog),
            "totalStreams": sum(int(source["streamCount"]) for source in catalog),
            "estimatedScheduledRows": scheduled_estimate,
            "verifiedSampleRows": verified_sample_rows,
            "earliestObservation": min(source["coverageStart"] for source in catalog),
        },
        "catalog": catalog,
        "stations": stations,
        "history": _hourly_history(history_rows),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return result
