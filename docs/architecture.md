# Architecture decisions

## Why the data is not committed to Git

The five official source domains expose 84,191 streams. Cadence-based StadtRAD, cycle-counter and motor-traffic feeds represent about 459 million potentially backfillable observations; event-driven traffic-light and charging data adds further volume. Committing the complete history would make the repository slow and expensive to clone.

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

## Honest volume accounting

- `totalStreams` is an exact API count, with a dated verified fallback when the public count endpoint times out.
- `verifiedSampleRows` is the exact line count of the committed Gzip/JSONL artifact and is protected by SHA-256 in its manifest.
- `estimatedScheduledRows` is a coverage × cadence estimate only for scheduled feeds.
- Event-driven traffic-light and charging observations are excluded from the estimate rather than being guessed.

## Cloud migration path

The local design maps directly to common cloud services: bronze/silver files to Azure Data Lake Storage or S3, DuckDB to Databricks/Snowflake, Airflow to Azure Data Factory/MWAA and GitHub Actions to Azure DevOps. The transformation contracts remain unchanged.
