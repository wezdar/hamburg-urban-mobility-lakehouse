# ElbeFlow recruiter guide

## Five-minute product review

1. Start the application with `pnpm install && pnpm dev`, then open `http://localhost:3000`.
2. Use `DE / EN / FR / AR` in the header. German is the default and Arabic switches the document to RTL.
3. In **Netzwerk**, drag and zoom the MapLibre vector map from the full Hamburg extent down to street level. Clusters expand into the official StadtRAD coordinates; switch between StadtRAD, Verkehr, HVV and Alle, then select a marker to inspect its detail.
4. In **Intelligenz**, review the 12-hour forecast, displayed back-test quality and the 2009–2026 source-coverage explorer.
5. In **Betrieb**, inspect rule-based alerts, the transparent CO₂ scenario and the explainable model card.
6. Finish with **Pipeline** and the lineage screen to connect the product to bronze/silver storage, data contracts, DuckDB/dbt, containers, Terraform and OpenTelemetry.

## What is real, estimated or modelled?

| Surface | Classification | Evidence |
|---|---|---|
| 84,191 streams | Exact catalogue count | Official Hamburg SensorThings API |
| 102,994 committed rows | Verified sample | Gzip/JSONL + SHA-256 manifest |
| ~459M observations | Scheduled capacity estimate | Coverage × source cadence |
| Traffic notices | Official snapshot | Polizei Hamburg WFS, DL-DE-BY-2.0 |
| HVV hubs | Official snapshot | Hamburg HVV WFS, DL-DE-BY-2.0 |
| StadtRAD map positions | Official coordinates | SensorThings `Thing.Locations[0].location.geometry.coordinates` |
| 12-hour forecast | Explainable model output | Three-point rolling baseline + holdout MAE |
| CO₂ value | Scenario only | Bikes × 3.2 km × 0.148 kg/km |

## Engineering review

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
pytest
ruff check src tests/python
pnpm lint
pnpm test
```

For a production-style local topology:

```bash
docker compose -f compose.production.yml up --build
```

The Terraform reference is validation-only. It never deploys from CI and expects an existing private network plus an immutable dashboard image.

## Map verification

- The basemap is rendered with MapLibre GL and OpenFreeMap vector tiles derived from OpenStreetMap.
- The default camera fits the complete Hamburg operating area; **Ganz Hamburg** restores that view at any time.
- StadtRAD points use all valid committed/live coordinates and cluster only for readability at lower zoom levels.
- Marker radii interpolate with zoom, while every marker remains geographically anchored during pan and zoom.
- The status control reports both the current zoom and the number of stations inside the viewport.
