"""Daily incremental ingestion and transformation for Hamburg mobility feeds."""

from __future__ import annotations

from datetime import datetime, timedelta

from airflow.decorators import dag
from airflow.operators.bash import BashOperator

PROJECT_ROOT = "/opt/airflow/project"


@dag(
    dag_id="hamburg_mobility_lakehouse",
    start_date=datetime(2025, 1, 1),
    schedule="15 2 * * *",
    catchup=False,
    max_active_runs=1,
    default_args={"retries": 3, "retry_delay": timedelta(minutes=5)},
    tags=["hamburg", "mobility", "open-data"],
)
def hamburg_mobility_lakehouse():
    snapshot = BashOperator(
        task_id="refresh_dashboard_snapshot",
        bash_command=(
            f"cd {PROJECT_ROOT} && python -m hamburg_mobility.cli snapshot "
            "--output app/data/dashboard.json --public-copy public/data/dashboard.json"
        ),
    )
    ingests = []
    for source in (
        "stadtrad",
        "cycle-counters",
        "motor-traffic",
        "ev-charging",
        "traffic-lights",
    ):
        ingests.append(
            BashOperator(
                task_id=f"ingest_{source.replace('-', '_')}",
                env={
                    "WINDOW_START": "{{ data_interval_start.strftime('%Y-%m-%d') }}",
                    "WINDOW_END": "{{ data_interval_end.strftime('%Y-%m-%d') }}",
                },
                bash_command=(
                    f"cd {PROJECT_ROOT} && python -m hamburg_mobility.cli backfill "
                    f"--source {source} --start $WINDOW_START --end $WINDOW_END"
                ),
            )
        )
    compact = BashOperator(
        task_id="compact_to_parquet",
        bash_command=f"cd {PROJECT_ROOT} && python -m hamburg_mobility.cli compact",
    )
    quality = BashOperator(
        task_id="assert_data_contract",
        bash_command=f"cd {PROJECT_ROOT} && python -m hamburg_mobility.cli quality",
    )
    transform = BashOperator(
        task_id="build_dbt_marts",
        bash_command=f"cd {PROJECT_ROOT}/transform && dbt build --profiles-dir .",
    )

    snapshot >> ingests >> compact >> quality >> transform


hamburg_mobility_lakehouse()
