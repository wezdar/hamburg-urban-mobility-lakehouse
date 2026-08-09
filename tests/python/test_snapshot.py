from datetime import UTC, datetime

from hamburg_mobility.snapshot import _hourly_history, _period_bounds, _region, _status


def test_period_bounds_accept_sensor_things_interval():
    result = _period_bounds("2022-10-19T14:10:02Z/2026-08-09T09:43:03Z")
    assert result is not None
    assert result[0].year == 2022
    assert result[1].year == 2026


def test_station_classification():
    newest = datetime(2026, 8, 9, 10, tzinfo=UTC)
    assert _status(8, "2026-08-09T09:55:00Z", newest) == "healthy"
    assert _status(0, "2026-08-09T09:55:00Z", newest) == "empty"
    assert _status(2, "2026-08-09T09:55:00Z", newest) == "low"
    assert _status(9, "2026-08-09T04:00:00Z", newest) == "stale"
    assert _region(53.58, 10.0) == "central"


def test_hourly_history_is_real_aggregation():
    rows = [
        {"phenomenonTime": "2026-08-09T08:05:00Z", "result": 4},
        {"phenomenonTime": "2026-08-09T08:55:00Z", "result": 8},
        {"phenomenonTime": "2026-08-09T09:05:00Z", "result": 9},
    ]
    assert _hourly_history(rows) == [
        {"hour": "2026-08-09T08:00:00Z", "availableBikes": 6, "observations": 2},
        {"hour": "2026-08-09T09:00:00Z", "availableBikes": 9, "observations": 1},
    ]
