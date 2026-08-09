# ElbeFlow · Hamburg Urban Mobility Lakehouse

![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=0B1220)
![DuckDB](https://img.shields.io/badge/DuckDB-Parquet-FFF000?logo=duckdb&logoColor=111827)
![dbt](https://img.shields.io/badge/dbt-data%20quality-FF694B?logo=dbt&logoColor=white)
![Airflow](https://img.shields.io/badge/Airflow-orchestration-017CEE?logo=apacheairflow&logoColor=white)
![Terraform](https://img.shields.io/badge/Terraform-cloud%20reference-844FBA?logo=terraform&logoColor=white)
![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-observability-111827?logo=opentelemetry&logoColor=white)
![Languages](https://img.shields.io/badge/UI-DE%20%7C%20EN%20%7C%20FR%20%7C%20AR-7C3AED)

An end-to-end data engineering portfolio project that combines five official Hamburg SensorThings domains with current Polizei Hamburg traffic notices and HVV geodata. It delivers a reproducible historical lakehouse, explainable forecasts, operational alerts and a multilingual decision dashboard.

[![German dashboard overview](docs/screenshots/dashboard-de-overview-v2.jpg)](docs/screenshots/dashboard-de-overview-v2.jpg)

> Click any dashboard image to open the full-resolution version.

## Why this project stands out

| Metric | Verified value | Meaning |
|---|---:|---|
| Official data layers | **7** | Five SensorThings domains + Polizei traffic + HVV rail geodata |
| SensorThings streams | **84,191** | Exact source catalogue represented by the application |
| Scheduled observations | **~459 million** | Reproducible coverage × cadence estimate; event feeds excluded |
| Committed real sample | **102,994 rows** | Verified official observations, Gzip-compressed and SHA-256 protected |
| Historical coverage | **2009 → live** | Earliest source coverage through the current official endpoints |
| Operational geodata snapshot | **24 features** | 12 current traffic notices + 12 high-volume HVV hubs |
| Interface languages | **4** | German by default, English, French and Arabic with true RTL layout |

The full history is generated outside Git because it can exceed **459 million scheduled observations**, plus event-driven records. The repository stays quick to clone while still shipping a substantial, inspectable real-data sample.

## Product tour

### 1. One catalogue for the official mobility universe

The source atlas makes scale, cadence, historical reach and ingestion strategy explicit for every domain.

[![Official source atlas](docs/screenshots/dashboard-de-sources-v2.jpg)](docs/screenshots/dashboard-de-sources-v2.jpg)

### 2. A bright, multi-layer Hamburg map

The redesigned map uses a light, legible basemap with the Elbe, roads and rail corridors. Reviewers can isolate StadtRAD, traffic or HVV layers, click a marker and inspect the official detail without leaving the dashboard.

[![Interactive Hamburg mobility map](docs/screenshots/dashboard-de-network-v2.jpg)](docs/screenshots/dashboard-de-network-v2.jpg)

### 3. Explainable forecasting and historical exploration

The 12-hour forecast is a transparent rolling baseline with a displayed back-test MAE and confidence indicator. The year explorer calculates source availability and scheduled capacity from real catalogue coverage; it never invents historical measurements.

[![Predictive mobility and history](docs/screenshots/dashboard-de-intelligence.jpg)](docs/screenshots/dashboard-de-intelligence.jpg)

### 4. Operations, anomalies and environmental impact

Empty or stale stations and official road closures become prioritised alerts. The CO₂ card is explicitly a scenario based on visible assumptions, while the model card exposes method, holdout size and error.

[![Operations and sustainability](docs/screenshots/dashboard-de-operations.jpg)](docs/screenshots/dashboard-de-operations.jpg)

### 5. Data quality that is visible, not implied

The dashboard exposes freshness, completeness, validity, uniqueness and the data contract used by the pipeline.

[![Data quality and contract](docs/screenshots/dashboard-de-quality-v2.jpg)](docs/screenshots/dashboard-de-quality-v2.jpg)

### 6. Recruiter-readable architecture and lineage

The architecture screen connects source APIs to immutable bronze files, Parquet silver data, DuckDB, dbt marts and the product layer.

[![Lakehouse pipeline](docs/screenshots/dashboard-de-pipeline-v2.jpg)](docs/screenshots/dashboard-de-pipeline-v2.jpg)

[![Data lineage and cloud readiness](docs/screenshots/dashboard-de-lineage.jpg)](docs/screenshots/dashboard-de-lineage.jpg)

## Multilingual and responsive UI

German is the default. The language switcher also provides English, French and Arabic; Arabic changes both copy and document direction to RTL. The dashboard is fully responsive.

### English

[![English dashboard](docs/screenshots/dashboard-en-overview-v2.jpg)](docs/screenshots/dashboard-en-overview-v2.jpg)

### French

[![French dashboard](docs/screenshots/dashboard-fr-overview-v2.jpg)](docs/screenshots/dashboard-fr-overview-v2.jpg)

### Arabic with right-to-left layout

[![Arabic RTL dashboard](docs/screenshots/dashboard-ar-overview-v2.jpg)](docs/screenshots/dashboard-ar-overview-v2.jpg)

### Mobile

<a href="docs/screenshots/dashboard-mobile-de-v2.jpg">
  <img src="docs/screenshots/dashboard-mobile-de-v2.jpg" alt="German mobile dashboard" width="390">
</a>

## How a recruiter can review it in five minutes

1. Open the dashboard and use `DE / EN / FR / AR` in the header.
2. Review **Quellen** to compare the five historical SensorThings domains.
3. Open **Netzwerk** and switch between StadtRAD, Polizei traffic and HVV layers.
4. Use **Intelligenz** for the forecast, back-test and historical explorer.
5. Check **Betrieb** for alerts, the CO₂ scenario and the explainable model card.
6. Finish with **Pipeline** and **Lineage** to understand observability and cloud readiness.
7. Read the [English illustrated project report](output/pdf/elbeflow-project-report.pdf) for a screen-by-screen walkthrough.

For exact review commands and the distinction between measured, estimated and modelled values, use the dedicated [recruiter guide](docs/RECRUITER_GUIDE.md).

## Run the dashboard

Requirements: Node.js 22.13+ and pnpm.

```bash
git clone https://github.com/wezdar/hamburg-urban-mobility-lakehouse.git
cd hamburg-urban-mobility-lakehouse
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The UI renders from the verified snapshot immediately, then attempts to refresh from Hamburg's official live endpoint.

Production check:

```bash
pnpm lint
pnpm test
```

Run the production-style dashboard, pipeline and OpenTelemetry collector together:

```bash
docker compose -f compose.production.yml up --build
```

Regenerate the illustrated PDF report after updating the screenshots:

```bash
python -m pip install -e ".[report]"
python scripts/build_project_report.py
```

## Build the data platform

Requirements: Python 3.11+.

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev,dbt]"
```

Refresh the dashboard catalogue and verified live snapshot:

```bash
hamburg-mobility snapshot
```

Refresh the two committed official WFS layers (traffic and HVV):

```bash
python scripts/fetch_urban_intelligence.py --count 500
```

Rebuild the committed multi-source sample of roughly 100K official rows:

```bash
hamburg-mobility sample --streams-per-source 20
```

Run a bounded backfill, compact it to Parquet and validate the result:

```bash
hamburg-mobility backfill \
  --source motor-traffic \
  --start 2026-08-08 \
  --end 2026-08-09 \
  --station-limit 10
hamburg-mobility compact
hamburg-mobility quality
cd transform && dbt build --profiles-dir .
```

The monthly, resumable backfill can be expanded to the full official history:

```bash
hamburg-mobility backfill --source stadtrad --start 2019-07-26 --end 2026-08-10
hamburg-mobility backfill --source cycle-counters --start 2020-01-17 --end 2026-08-10
```

## Architecture

```mermaid
flowchart LR
    API["5 SensorThings domains"] --> INGEST["Python ingestion<br/>pagination · retries · incremental windows"]
    WFS["Polizei traffic + HVV WFS"] --> INGEST
    INGEST --> BRONZE["Bronze<br/>immutable JSONL/Gzip"]
    BRONZE --> SILVER["Silver<br/>partitioned Parquet/ZSTD"]
    SILVER --> DUCK["DuckDB warehouse"]
    DUCK --> DBT["dbt quality + marts"]
    DBT --> UI["ElbeFlow dashboard<br/>DE · EN · FR · AR"]
    UI --> OTEL["OpenTelemetry"]
    TF["Terraform"] -. provisions .-> CLOUD["AWS ECS + S3"]
    AIRFLOW["Airflow"] -. orchestrates .-> INGEST
    AIRFLOW -. validates .-> DBT
    CI["GitHub Actions"] -. tests .-> INGEST
    CI -. builds .-> UI
```

### Storage layout

```text
data/
├── bronze/source=SOURCE/year=YYYY/month=MM/stream_id=ID/*.jsonl.gz
├── silver/mobility_observations/source=SOURCE/year=YYYY/month=MM/*.parquet
└── warehouse.duckdb
```

- Bronze objects are immutable and replayable.
- Silver data is deduplicated by observation ID and compressed with Zstandard.
- Half-open monthly windows prevent boundary overlap.
- Deterministic paths and completion markers make backfills resumable.
- DuckDB and dbt provide local analytical marts without a managed-warehouse bill.

## Official data universe

| Domain | Streams | Coverage | Cadence | Volume treatment |
|---|---:|---:|---:|---|
| Traffic lights and detectors | 80,276 | 2009 → live | Event-driven | Not guessed in volume estimate |
| Public EV charging | 2,367 | 2026 → live | Event-driven | Not guessed in volume estimate |
| Motor traffic counters | 829 | 2026 → live | 15 minutes | Included |
| Permanent cycle counters | 359 | 2020 → live | 5 minutes | Included |
| StadtRAD availability | 360 | 2019 → live | 5 minutes | Included |
| Polizei Hamburg traffic notices | WFS features | Current | Event-driven | Committed operational snapshot |
| HVV rail stop areas | WFS features | Current | Reference/timetable | Committed operational snapshot |

The `estimatedScheduledRows` metric is intentionally conservative: it covers only scheduled feeds. Traffic-light and EV charging events add further records, but the project does not invent a count for them.

## Reliability and data contracts

- bounded HTTP retry with exponential backoff
- atomic completion of downloaded partitions
- source + observation ID deduplication
- explicit normalization of instant and interval SensorThings timestamps
- checks for required keys, duplicate IDs, invalid timestamps and negative bike counts
- exact committed-sample row count and SHA-256 verification
- verified dashboard fallback when a live public API is temporarily unavailable
- automated Python, server-rendered UI, lint and production-build checks
- explainable rolling forecast with an explicit back-test MAE and holdout size
- rule-based anomaly alerts derived directly from station and police states
- Docker, Terraform and OpenTelemetry assets validated without storing cloud credentials

## Repository map

```text
app/                  React/TypeScript dashboard, localization and live API route
src/hamburg_mobility/ Python ingestion, sampling, compaction and quality jobs
airflow/dags/          Scheduled production workflow
transform/             dbt staging models, marts and tests
tests/                 Python and server-rendered dashboard tests
public/data/           Dashboard snapshot + verified 102,994-row real sample
app/data/              Committed Polizei traffic and HVV geodata snapshot
docs/screenshots/      Recruiter-facing product captures
output/pdf/            Illustrated English project report
infra/terraform/       Secure AWS ECS/S3 deployment reference
observability/         OpenTelemetry collector configuration
```

## Data provenance and licence

The data comes from the Freie und Hansestadt Hamburg's official services: [StadtRAD](https://suche.transparenz.hamburg.de/dataset/stadtrad-stationen-hamburg39), [cycle counters](https://suche.transparenz.hamburg.de/dataset/verkehrsdaten-rad-infrarotdetektoren-hamburg7), [motor traffic](https://suche.transparenz.hamburg.de/dataset?query=Verkehrsdaten%20Kfz%20Infrarotdetektoren), [EV charging](https://suche.transparenz.hamburg.de/dataset/elektro-ladestandorte-hamburg40), [traffic-light process data](https://suche.transparenz.hamburg.de/dataset/traffic-lights-data-hamburg3), [current Polizei Hamburg traffic information](https://metaver.de/trefferanzeige?docuuid=9735cbc2-c7e2-4820-ad91-99777858b32b) and [HVV rail stop catchment data](https://metaver.de/trefferanzeige?docuuid=A829AF7B-46F7-4485-93B4-5295231C93CB).

Source data is published under **DL-DE-BY-2.0**. Timestamps are stored in UTC and presented in Europe/Berlin time. Application code is MIT-licensed. See [architecture decisions](docs/architecture.md) for detailed trade-offs and the cloud migration path.
