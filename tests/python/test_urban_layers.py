import pytest

from hamburg_mobility.urban_layers import (
    detect_station_anomalies,
    geometry_centroid,
    moving_average_forecast,
    normalize_traffic_feature,
    normalize_transit_feature,
)


def test_geometry_centroid_supports_polygons():
    geometry = {"type": "Polygon", "coordinates": [[[10.0, 53.5], [10.2, 53.7]]]}
    assert geometry_centroid(geometry) == pytest.approx((10.1, 53.6))


def test_official_wfs_features_are_normalized():
    traffic = normalize_traffic_feature(
        {
            "id": "event-1",
            "geometry": {"type": "Point", "coordinates": [10.01, 53.55]},
            "properties": {"strasse": "Gänsemarkt", "art": "Sperrung", "lage": "closed"},
        }
    )
    stop = normalize_transit_feature(
        {
            "id": "stop-1",
            "geometry": {"type": "Point", "coordinates": [10.0, 53.56]},
            "properties": {"haltestelle": "Rathaus", "linien": "U3, S1", "abfahrten": 42},
        }
    )
    assert traffic["status"] == "closure"
    assert traffic["title"] == "Gänsemarkt"
    assert stop["lines"] == ["U3", "S1"]
    assert stop["departures"] == 42


def test_forecast_reports_reproducible_backtest_quality():
    result = moving_average_forecast([10, 12, 14, 16, 18, 20], horizon=3, window=3)
    assert result["forecast"] == pytest.approx([18.0, 18.67, 18.89], abs=0.01)
    assert result["mae"] == pytest.approx(4.0)
    assert result["backtestPoints"] == 3
    assert 72 <= result["confidencePercent"] <= 98


def test_only_actionable_station_states_become_alerts():
    alerts = detect_station_anomalies(
        [
            {"id": 1, "name": "A", "status": "healthy", "availableBikes": 4},
            {"id": 2, "name": "B", "status": "empty", "availableBikes": 0},
            {"id": 3, "name": "C", "status": "stale", "availableBikes": 8},
        ]
    )
    assert [alert["kind"] for alert in alerts] == ["empty", "stale"]
