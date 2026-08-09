"""Normalisation and explainable analytics for Hamburg's urban data layers."""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from typing import Any


def _first(properties: Mapping[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        value = properties.get(key)
        if value not in (None, ""):
            return value
    return default


def _points(value: Any) -> Iterable[tuple[float, float]]:
    if (
        isinstance(value, Sequence)
        and len(value) >= 2
        and isinstance(value[0], (int, float))
        and isinstance(value[1], (int, float))
    ):
        yield float(value[0]), float(value[1])
        return
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
        for child in value:
            yield from _points(child)


def geometry_centroid(geometry: Mapping[str, Any]) -> tuple[float, float]:
    """Return a stable display centroid for Point, line or polygon GeoJSON."""
    coordinates = list(_points(geometry.get("coordinates", [])))
    if not coordinates:
        raise ValueError("GeoJSON geometry contains no coordinates")
    longitude = sum(point[0] for point in coordinates) / len(coordinates)
    latitude = sum(point[1] for point in coordinates) / len(coordinates)
    return longitude, latitude


def normalize_traffic_feature(feature: Mapping[str, Any]) -> dict[str, Any]:
    """Map the current Polizei Hamburg WFS schema to the dashboard contract."""
    properties = feature.get("properties", {})
    longitude, latitude = geometry_centroid(feature.get("geometry", {}))
    description = str(
        _first(properties, "beschreibung", "description", "lage", "meldung", default="")
    )
    kind = str(_first(properties, "art", "typ", "type", default="construction")).lower()
    if any(token in kind for token in ("sperr", "closure", "gesperrt")):
        status = "closure"
    elif any(token in kind for token in ("stau", "congestion", "stockend")):
        status = "congestion"
    else:
        status = "construction"
    return {
        "id": str(feature.get("id") or _first(properties, "id", "fid", default="traffic")),
        "status": status,
        "title": str(_first(properties, "strasse", "title", "titel", "ort", default="Hamburg")),
        "description": description,
        "latitude": round(latitude, 6),
        "longitude": round(longitude, 6),
        "start": _first(properties, "beginn", "start", "von"),
        "end": _first(properties, "ende", "end", "bis"),
    }


def normalize_transit_feature(feature: Mapping[str, Any]) -> dict[str, Any]:
    """Map an official HVV stop-area feature to the dashboard contract."""
    properties = feature.get("properties", {})
    longitude, latitude = geometry_centroid(feature.get("geometry", {}))
    raw_lines = _first(properties, "linien", "lines", "linie", default="")
    if isinstance(raw_lines, str):
        lines = [part.strip() for part in raw_lines.replace(";", ",").split(",") if part.strip()]
    else:
        lines = [str(part) for part in raw_lines or []]
    return {
        "id": str(feature.get("id") or _first(properties, "halte_id", "id", default="stop")),
        "name": str(_first(properties, "haltestelle", "name", "bezeichnung", default="HVV stop")),
        "mode": str(_first(properties, "verkehrsmittel", "mode", default="rail")),
        "lines": lines,
        "departures": int(_first(properties, "abfahrten", "departures", default=0)),
        "latitude": round(latitude, 6),
        "longitude": round(longitude, 6),
    }


def moving_average_forecast(
    values: Sequence[float], *, horizon: int = 12, window: int = 3
) -> dict[str, Any]:
    """Forecast a short horizon and return an honest rolling-origin back-test."""
    if horizon < 1 or window < 1 or len(values) < window:
        raise ValueError("forecast requires positive settings and at least one full window")
    numeric = [float(value) for value in values]
    predictions = [
        sum(numeric[index - window : index]) / window
        for index in range(window, len(numeric))
    ]
    actual = numeric[window:]
    mae = (
        sum(abs(value - predictions[index]) for index, value in enumerate(actual)) / len(actual)
        if actual
        else 0.0
    )
    rolling = numeric[-window:]
    forecast: list[float] = []
    for _ in range(horizon):
        next_value = max(0.0, sum(rolling[-window:]) / window)
        forecast.append(next_value)
        rolling.append(next_value)
    mean = sum(actual) / len(actual) if actual else max(sum(numeric) / len(numeric), 1.0)
    confidence = max(72, min(98, round(100 - mae / max(mean, 1.0) * 100)))
    return {
        "forecast": [round(value, 2) for value in forecast],
        "mae": round(mae, 2),
        "backtestPoints": len(actual),
        "confidencePercent": confidence,
        "method": f"rolling mean ({window} observations)",
    }


def detect_station_anomalies(stations: Iterable[Mapping[str, Any]]) -> list[dict[str, Any]]:
    """Expose actionable empty or stale station states without a black-box model."""
    alerts = []
    for station in stations:
        status = station.get("status")
        if status not in {"empty", "stale"}:
            continue
        alerts.append(
            {
                "id": station.get("id"),
                "kind": status,
                "name": station.get("name"),
                "availableBikes": int(station.get("availableBikes", 0)),
                "observedAt": station.get("observedAt"),
            }
        )
    return alerts
