#!/usr/bin/env python3
"""Refresh the committed Polizei Hamburg and HVV GeoJSON snapshot."""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from hamburg_mobility.urban_layers import normalize_traffic_feature, normalize_transit_feature

LAYERS = {
    "traffic": {
        "url": "https://geodienste.hamburg.de/wfs_verkehrsinformation",
        "feature_type": "de.hh.up:hauptmeldungen_aktuell",
    },
    "transit": {
        "url": "https://geodienste.hamburg.de/HH_WFS_HVV_Einzugsbereiche",
        "feature_type": "de.hh.up:haltestellenbereiche_bahn",
    },
}


def fetch_layer(url: str, feature_type: str, *, count: int) -> list[dict[str, Any]]:
    query = urlencode(
        {
            "SERVICE": "WFS",
            "VERSION": "2.0.0",
            "REQUEST": "GetFeature",
            "TYPENAMES": feature_type,
            "OUTPUTFORMAT": "application/geo+json",
            "SRSNAME": "EPSG:4326",
            "COUNT": count,
        }
    )
    request = Request(
        f"{url}?{query}",
        headers={
            "User-Agent": "hamburg-urban-mobility-lakehouse/2.0",
            "Accept": "application/json",
        },
    )
    with urlopen(request, timeout=60) as response:  # noqa: S310
        return json.load(response).get("features", [])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("app/data/urban-intelligence.json"))
    parser.add_argument("--count", type=int, default=500)
    args = parser.parse_args()

    previous = json.loads(args.output.read_text(encoding="utf-8")) if args.output.exists() else {}
    traffic = fetch_layer(**LAYERS["traffic"], count=args.count)
    transit = fetch_layer(**LAYERS["transit"], count=args.count)
    payload = {
        "generatedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "provenance": previous.get("provenance", {}),
        "trafficEvents": [normalize_traffic_feature(feature) for feature in traffic],
        "transitStops": [normalize_transit_feature(feature) for feature in transit],
        "emissionsModel": previous.get(
            "emissionsModel",
            {"avoidedCarKgPerKm": 0.148, "assumedTripKm": 3.2, "method": "Scenario only."},
        ),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Wrote {len(traffic)} traffic events and {len(transit)} transit stops to {args.output}")


if __name__ == "__main__":
    main()
