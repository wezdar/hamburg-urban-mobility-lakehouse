# Architecture decisions

## Why the data is not committed to Git

Five official SensorThings domains expose 84,191 streams. Cadence-based StadtRAD, cycle-counter and motor-traffic feeds represent about 459 million potentially backfillable observations; event-driven traffic-light and charging data adds further volume. Two official WFS layers add current Polizei Hamburg traffic notices and HVV rail geodata. Committing the complete history would make the repository slow and expensive to clone.

The repository therefore contains a dashboard snapshot plus a compressed 102,994-row verified multi-source sample. The full history is reproduced from the source APIs and stored locally or in object storage:

```text
data/
├── bronze/source=SOURCE/year=YYYY/month=MM/stream_id=ID/*.jsonl.gz
├── silver/mobility_observations/source=SOURCE/year=YYYY/month=MM/*.parquet
└── warehouse.duckdb
```

Bronze files are immutable and replayable. Silver Parquet files are deduplicated by observation ID, compressed with Zstandard and pruned by year/month. DuckDB and dbt build serving marts without requiring an expensive managed warehouse.

## Reliability choices

- Half-open time windows prevent overlaps at month boundaries.
- Deterministic partition paths make reruns idempotent.
- Partial downloads are atomically renamed only after success.
- HTTP retries are bounded and use exponential backoff.
- Composite source + observation IDs are deduplicated during compaction.
- Instant and interval SensorThings timestamps are normalized explicitly.
- Data-contract checks fail the scheduled job on missing keys, duplicates, invalid timestamps or negative bike counts.
- The dashboard keeps a recent verified snapshot if the live API is temporarily unavailable.
- WFS traffic and HVV features are normalized into a small versioned display contract.
- The availability forecast uses a documented moving-average baseline and reports holdout MAE.
- Operational alerts are deterministic rules over station states and police closures.
- CO₂ is labelled as a scenario estimate and preserves its distance and emission assumptions.

## Honest volume accounting

- `totalStreams` is an exact API count, with a dated verified fallback when the public count endpoint times out.
- `verifiedSampleRows` is the exact line count of the committed Gzip/JSONL artifact and is protected by SHA-256 in its manifest.
- `estimatedScheduledRows` is a coverage × cadence estimate only for scheduled feeds.
- Event-driven traffic-light and charging observations are excluded from the estimate rather than being guessed.

## Product and lineage path

```text
7 official layers → Python ingestion → bronze → silver → contracts
                  → DuckDB + dbt → live API → multilingual dashboard
```

The dashboard exposes the same lineage that exists in the repository. The two WFS layers are operational snapshots; the 84,191-stream total remains an exact SensorThings catalogue count. Historical explorer values are capacity calculations based on documented coverage and cadence, not fabricated observations.

## Cloud migration path

The local design maps directly to common cloud services. The committed AWS reference places versioned/encrypted bronze and silver partitions in S3 and runs the dashboard on private ECS Fargate tasks. CloudWatch logs, ECS Container Insights and an OpenTelemetry collector provide the observability path. GitHub Actions validates Terraform and builds the container without applying infrastructure or storing credentials.

The Terraform module intentionally consumes an existing VPC, private subnets, security groups and immutable image URI. This keeps network and identity ownership explicit and prevents a portfolio workflow from creating billable infrastructure automatically.
