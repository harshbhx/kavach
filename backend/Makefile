.PHONY: install target api test lint fmt check smoke probe

install:
	uv sync

target:
	uv run uvicorn kavach.target.service:app --port 8001 --reload

api:
	uv run uvicorn kavach.api.app:app --port 8000 --reload

test:
	uv run pytest -q

lint:
	uv run ruff check . && uv run ruff format --check .

fmt:
	uv run ruff check --fix . && uv run ruff format .

check: lint test

# Offline 3-round run: fake brains, no Band, scripted fake target, in-process target
smoke:
	BRAIN_PROVIDER=fake BAND_ENABLED=false TARGET_MODEL=fake TARGET_URL=inprocess uv run python -m kavach.cli run --rounds 3

probe:
	uv run python ../scripts/probe_v1.py
