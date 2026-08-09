.PHONY: install snapshot backfill compact quality dashboard test

install:
	python -m pip install -e ".[dev,dbt]"
	pnpm install

snapshot:
	python -m hamburg_mobility.cli snapshot

backfill:
	python -m hamburg_mobility.cli backfill --start 2019-07-26 --end 2026-08-10

compact:
	python -m hamburg_mobility.cli compact

quality:
	python -m hamburg_mobility.cli quality

dashboard:
	pnpm dev

test:
	pytest
	pnpm test
