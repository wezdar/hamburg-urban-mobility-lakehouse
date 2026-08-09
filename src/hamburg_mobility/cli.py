"""Command-line entry point for local development and orchestration."""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

from .catalog import SOURCE_BY_ID
from .pipeline import backfill, compact, parse_date, quality_report
from .sample import build_multimodal_sample
from .snapshot import build_dashboard_snapshot


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(prog="hamburg-mobility")
    result.add_argument("--data-root", type=Path, default=Path("data"))
    commands = result.add_subparsers(dest="command", required=True)

    snapshot = commands.add_parser("snapshot", help="Refresh the Git-safe dashboard dataset")
    snapshot.add_argument("--output", type=Path, default=Path("app/data/dashboard.json"))
    snapshot.add_argument("--public-copy", type=Path, default=Path("public/data/dashboard.json"))
    snapshot.add_argument("--history-stations", type=int, default=64)
    snapshot.add_argument(
        "--sample-manifest",
        type=Path,
        default=Path("public/data/multimodal-sample.manifest.json"),
    )
    snapshot.add_argument("--refresh-catalog", action="store_true")

    sample = commands.add_parser(
        "sample",
        help="Download a substantial verified multi-source sample",
    )
    sample.add_argument(
        "--output",
        type=Path,
        default=Path("public/data/multimodal-sample.jsonl.gz"),
    )
    sample.add_argument(
        "--manifest",
        type=Path,
        default=Path("public/data/multimodal-sample.manifest.json"),
    )
    sample.add_argument("--streams-per-source", type=int, default=5)

    history = commands.add_parser("backfill", help="Backfill historical real observations")
    yesterday = (datetime.now(UTC) - timedelta(days=1)).date().isoformat()
    today = datetime.now(UTC).date().isoformat()
    history.add_argument("--start", type=parse_date, default=parse_date(yesterday))
    history.add_argument("--end", type=parse_date, default=parse_date(today))
    history.add_argument("--source", choices=SOURCE_BY_ID, default="stadtrad")
    history.add_argument("--station-limit", type=int)
    history.add_argument("--max-pages", type=int)
    history.add_argument("--overwrite", action="store_true")

    commands.add_parser("compact", help="Build deduplicated silver Parquet partitions")
    commands.add_parser("quality", help="Run the warehouse data contract")
    return result


def main() -> None:
    args = parser().parse_args()
    if args.command == "snapshot":
        result = build_dashboard_snapshot(
            args.output,
            history_station_count=args.history_stations,
            sample_manifest=args.sample_manifest,
            refresh_catalog=args.refresh_catalog,
        )
        if args.public_copy:
            args.public_copy.parent.mkdir(parents=True, exist_ok=True)
            args.public_copy.write_bytes(args.output.read_bytes())
        summary = {
            "stations": result["metrics"]["stations"],
            "snapshot_rows": result["metrics"]["snapshotRows"],
            "total_streams": result["universe"]["totalStreams"],
            "estimated_scheduled_rows": result["universe"]["estimatedScheduledRows"],
            "verified_sample_rows": result["universe"]["verifiedSampleRows"],
        }
    elif args.command == "sample":
        summary = build_multimodal_sample(
            args.output,
            manifest_output=args.manifest,
            stream_limit=args.streams_per_source,
        )
    elif args.command == "backfill":
        summary = backfill(
            args.data_root,
            start=args.start,
            end=args.end,
            source=args.source,
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
