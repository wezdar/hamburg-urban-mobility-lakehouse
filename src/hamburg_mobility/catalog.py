"""Authoritative catalogue of Hamburg mobility SensorThings feeds."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from typing import Any

from .client import API_ROOT, SensorThingsClient, SensorThingsError

TRAFFIC_LIGHTS_API_ROOT = "https://tld.iot.hamburg.de/v1.1"


@dataclass(frozen=True)
class SourceSpec:
    """Configuration and provenance for one public mobility data domain."""

    id: str
    name: str
    short_name: str
    domain: str
    service_name: str
    layer_name: str | None
    api_root: str
    official_url: str
    coverage_start: str
    cadence_minutes: int | None
    description: str
    color: str
    verified_stream_count: int
    count_verified_at: str = "2026-08-09"

    @property
    def filter_expression(self) -> str:
        expression = f"properties/serviceName eq '{self.service_name}'"
        if self.layer_name:
            expression += f" and properties/layerName eq '{self.layer_name}'"
        return expression


SOURCES: tuple[SourceSpec, ...] = (
    SourceSpec(
        id="traffic-lights",
        name="Traffic lights & detectors",
        short_name="Traffic control",
        domain="signals",
        service_name="HH_STA_traffic_lights",
        layer_name=None,
        api_root=TRAFFIC_LIGHTS_API_ROOT,
        official_url="https://suche.transparenz.hamburg.de/dataset/traffic-lights-data-hamburg3",
        coverage_start="2009-01-01T00:00:00Z",
        cadence_minutes=None,
        description="Signals, detector calls, public-transport requests and cycle phases.",
        color="#ff725e",
        verified_stream_count=80_276,
    ),
    SourceSpec(
        id="ev-charging",
        name="Public EV charging",
        short_name="EV charging",
        domain="energy",
        service_name="HH_STA_E-Ladestationen",
        layer_name="Status_E-Ladepunkt",
        api_root=API_ROOT,
        official_url="https://suche.transparenz.hamburg.de/dataset/elektro-ladestandorte-hamburg40",
        coverage_start="2026-02-08T00:00:00Z",
        cadence_minutes=None,
        description="Availability status for public charging points across Hamburg.",
        color="#63d9c9",
        verified_stream_count=2_367,
    ),
    SourceSpec(
        id="motor-traffic",
        name="Motor traffic counters",
        short_name="Motor traffic",
        domain="road",
        service_name="HH_STA_Verkehrsdaten_Kfz_Infrarotdetektoren",
        layer_name="Anzahl_Kfz_Zaehlstelle_15-Min",
        api_root=API_ROOT,
        official_url="https://suche.transparenz.hamburg.de/dataset?query=Verkehrsdaten%20Kfz%20Infrarotdetektoren",
        coverage_start="2026-07-25T22:15:00Z",
        cadence_minutes=15,
        description="Quarter-hour vehicle volumes from automated infrared counters.",
        color="#d9ff62",
        verified_stream_count=829,
    ),
    SourceSpec(
        id="cycle-counters",
        name="City bicycle counters",
        short_name="Cycle counters",
        domain="cycling",
        service_name="HH_STA_HamburgerRadzaehlnetz",
        layer_name="Anzahl_Fahrraeder_Zaehlfeld_5-Min",
        api_root=API_ROOT,
        official_url="https://suche.transparenz.hamburg.de/dataset/verkehrsdaten-rad-infrarotdetektoren-hamburg7",
        coverage_start="2020-01-17T00:00:00Z",
        cadence_minutes=5,
        description="Five-minute bicycle flows from Hamburg's permanent counting network.",
        color="#efbe46",
        verified_stream_count=359,
    ),
    SourceSpec(
        id="stadtrad",
        name="StadtRAD availability",
        short_name="StadtRAD",
        domain="shared mobility",
        service_name="HH_STA_StadtRad",
        layer_name="Fahrraeder",
        api_root=API_ROOT,
        official_url="https://suche.transparenz.hamburg.de/dataset/stadtrad-stationen-hamburg39",
        coverage_start="2019-07-26T09:00:43.213000Z",
        cadence_minutes=5,
        description="Live bicycle availability and historical station observations.",
        color="#9d7bff",
        verified_stream_count=360,
    ),
)

SOURCE_BY_ID = {source.id: source for source in SOURCES}


def source_spec(source_id: str) -> SourceSpec:
    try:
        return SOURCE_BY_ID[source_id]
    except KeyError as exc:
        choices = ", ".join(SOURCE_BY_ID)
        raise ValueError(f"Unknown source {source_id!r}; choose one of: {choices}") from exc


def _cadence_estimate(source: SourceSpec, streams: int, generated_at: datetime) -> int | None:
    if source.cadence_minutes is None:
        return None
    start = datetime.fromisoformat(source.coverage_start.replace("Z", "+00:00"))
    periods = max(0, int((generated_at - start).total_seconds() / (source.cadence_minutes * 60)))
    return streams * periods


def build_source_catalog(
    *,
    generated_at: datetime | None = None,
    clients: dict[str, SensorThingsClient] | None = None,
    stadtrad_estimate: int | None = None,
    stream_counts: dict[str, int] | None = None,
    refresh_counts: bool = False,
) -> list[dict[str, Any]]:
    """Read exact stream counts and attach transparent coverage-based estimates."""
    now = generated_at or datetime.now(UTC)
    api_clients = clients or {}
    known_counts = stream_counts or {}
    catalog: list[dict[str, Any]] = []
    for source in SOURCES:
        api = api_clients.get(source.api_root) or SensorThingsClient(source.api_root)
        streams = known_counts.get(source.id)
        count_status = "live" if streams is not None else "verified snapshot"
        if streams is None and refresh_counts:
            try:
                streams = api.datastream_count(source.filter_expression)
                count_status = "live"
            except SensorThingsError:
                streams = source.verified_stream_count
        if streams is None:
            streams = source.verified_stream_count
        estimate = _cadence_estimate(source, streams, now)
        if source.id == "stadtrad" and stadtrad_estimate is not None:
            estimate = stadtrad_estimate
        row = asdict(source)
        row.update(
            {
                "streamCount": streams,
                "coverageStart": row.pop("coverage_start"),
                "cadenceMinutes": row.pop("cadence_minutes"),
                "estimatedRows": estimate,
                "shortName": row.pop("short_name"),
                "officialUrl": row.pop("official_url"),
                "apiRoot": row.pop("api_root"),
                "countVerifiedAt": row.pop("count_verified_at"),
                "countStatus": count_status,
            }
        )
        row.pop("verified_stream_count")
        row.pop("service_name")
        row.pop("layer_name")
        catalog.append(row)
    return catalog
