# Architecture decisions

## Why the data is not committed to Git

The official StadtRAD streams expose five-minute observations going back to 2019. At the current station count, the API coverage represents roughly 210 million potentially backfillable records. Committing those files would make the repository slow and expensive to clone.

The repository therefore contains a verified, recent dashboard snapshot. The full history is reproduced from the source API and stored locally or in object storage:

```text
data/
├── bronze/source=stadtrad/year=YYYY/month=MM/stream_id=ID/*.jsonl.gz
├── silver/stadtrad_observations/year=YYYY/month=MM/*.parquet
└── warehouse.duckdb
```

Bronze files are immutable and replayable. Silver Parquet files are deduplicated by observation ID, compressed with Zstandard and pruned by year/month. DuckDB and dbt build serving marts without requiring an expensive managed warehouse.

## Reliability choices

- Half-open time windows prevent overlaps at month boundaries.
- Deterministic partition paths make reruns idempotent.
- Partial downloads are atomically renamed only after success.
- HTTP retries are bounded and use exponential backoff.
- Observation IDs are deduplicated during compaction.
- Data-contract checks fail the scheduled job on missing keys, duplicates or negative bike counts.
- The dashboard keeps a recent verified snapshot if the live API is temporarily unavailable.

## Cloud migration path

The local design maps directly to common cloud services: bronze/silver files to Azure Data Lake Storage or S3, DuckDB to Databricks/Snowflake, Airflow to Azure Data Factory/MWAA and GitHub Actions to Azure DevOps. The transformation contracts remain unchanged.
