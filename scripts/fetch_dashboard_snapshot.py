#!/usr/bin/env python3
"""Refresh the compact, Git-safe dashboard snapshot from Hamburg Open Data."""

from __future__ import annotations

import sys
from pathlib import Path
from shutil import copyfile

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

if __name__ == "__main__":
    from hamburg_mobility.snapshot import build_dashboard_snapshot

    bundled_snapshot = PROJECT_ROOT / "app/data/dashboard.json"
    public_snapshot = PROJECT_ROOT / "public/data/dashboard.json"
    snapshot = build_dashboard_snapshot(bundled_snapshot)
    public_snapshot.parent.mkdir(parents=True, exist_ok=True)
    copyfile(bundled_snapshot, public_snapshot)
    print(
        "Snapshot refreshed: "
        f"{snapshot['metrics']['stations']} stations, "
        f"{snapshot['metrics']['snapshotRows']} verified rows, "
        f"{snapshot['coverage']['estimatedBackfillableRows']:,} rows backfillable."
    )
