"""Command-line entry point for local development and orchestration."""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

from .pipeline import backfill, compact, parse_date, quality_report
from .snapshot import build_dashboard_snapshot


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(prog="hamburg-mobility")
    result.add_argument("--data-root", type=Path, default=Path("data"))
    commands = result.add_subparsers(dest="command", required=True)

    snapshot = commands.add_parser("snapshot", help="Refresh the Git-safe dashboard dataset")
    snapshot.add_argument("--output", type=Path, default=Path("app/data/dashboard.json"))
    snapshot.add_argument("--public-copy", type=Path, default=Path("public/data/dashboard.json"))
    snapshot.add_argument("--history-stations", type=int, default=16)

    history = commands.add_parser("backfill", help="Backfill historical real observations")
    yesterday = (datetime.now(UTC) - timedelta(days=1)).date().isoformat()
    today = datetime.now(UTC).date().isoformat()
    history.add_argument("--start", type=parse_date, default=parse_date(yesterday))
    history.add_argument("--end", type=parse_date, default=parse_date(today))
    history.add_argument("--station-limit", type=int)
    history.add_argument("--max-pages", type=int)
    history.add_argument("--overwrite", action="store_true")

    commands.add_parser("compact", help="Build deduplicated silver Parquet partitions")
    commands.add_parser("quality", help="Run the warehouse data contract")
    return result


def main() -> None:
    args = parser().parse_args()
    if args.command == "snapshot":
        result = build_dashboard_snapshot(args.output, history_station_count=args.history_stations)
        if args.public_copy:
            args.public_copy.parent.mkdir(parents=True, exist_ok=True)
            args.public_copy.write_bytes(args.output.read_bytes())
        summary = {
            "stations": result["metrics"]["stations"],
            "snapshot_rows": result["metrics"]["snapshotRows"],
            "estimated_backfillable_rows": result["coverage"]["estimatedBackfillableRows"],
        }
    elif args.command == "backfill":
        summary = backfill(
            args.data_root,
            start=args.start,
            end=args.end,
            station_limit=args.station_limit,
            max_pages=args.max_pages,
            overwrite=args.overwrite,
        )
    elif args.command == "compact":
        summary = compact(args.data_root)
    else:
        summary = quality_report(args.data_root)
    print(json.dumps(summary, indent=2, default=str))
    if args.command == "quality" and not summary["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
