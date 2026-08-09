from datetime import UTC, datetime

from hamburg_mobility.catalog import API_ROOT, TRAFFIC_LIGHTS_API_ROOT, build_source_catalog


class CountClient:
    def __init__(self, count: int):
        self.count = count

    def datastream_count(self, _filter_expression: str) -> int:
        return self.count


def test_catalog_aggregates_exact_stream_counts_and_cadence_estimates():
    catalog = build_source_catalog(
        generated_at=datetime(2026, 8, 9, tzinfo=UTC),
        clients={
            API_ROOT: CountClient(10),
            TRAFFIC_LIGHTS_API_ROOT: CountClient(100),
        },
        stream_counts={"stadtrad": 360},
        stadtrad_estimate=210_118_023,
        refresh_counts=True,
    )

    assert len(catalog) == 5
    assert sum(source["streamCount"] for source in catalog) == 490
    assert catalog[0]["id"] == "traffic-lights"
    assert catalog[0]["estimatedRows"] is None
    assert catalog[-1]["estimatedRows"] == 210_118_023
