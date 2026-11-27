.PHONY: help install setup check-setup target api offline test lint fmt check smoke probe band demo referee gate

OFFLINE = BRAIN_PROVIDER=fake BAND_ENABLED=false TARGET_MODEL=fake TARGET_URL=inprocess

help: ## list the commands
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-12s %s\n", $$1, $$2}'

install: ## install Python dependencies
	uv sync

setup: install ## ask for keys, create the Lyzr and Band agents, write .env, check everything
	uv run python -m kavach.setup $(ARGS)

check-setup: ## re-run only the connection checks
	uv run python -m kavach.setup check

target: ## DiwaliMart target bot on :8001
	uv run uvicorn kavach.target.service:app --port 8001 --reload

api: ## Kavach API on :8000
	uv run uvicorn kavach.api.app:app --port 8000 --reload

offline: ## Kavach API on :8000 with scripted agents and target (no keys)
	$(OFFLINE) FAKE_DELAY_S=1 uv run uvicorn kavach.api.app:app --port 8000

test: ## unit tests (offline)
	uv run pytest -q

lint: ## ruff check + format check
	uv run ruff check . && uv run ruff format --check .

fmt: ## autofix lint and format
	uv run ruff check --fix . && uv run ruff format .

check: lint test ## lint + tests

smoke: ## full 3-round offline run
	$(OFFLINE) uv run python -m kavach.cli run --rounds 3

probe: ## is v1 breakable by the real TARGET_MODEL? (needs >= 50%)
	uv run python ../scripts/probe_v1.py

band: ## verify the 7 Band identities and post a test message
	uv run python ../scripts/band_setup.py

demo: ## run live until the story is good, then save runs/demo_run.jsonl
	uv run python -m kavach.record_demo $(ARGS)

referee: ## live Referee: answers people who @mention it in the Band room (needs agent_config.yaml)
	uv run --extra live python -m kavach.band.live_referee

gate: ## CI mode on the hardened config: fails if its breach rate rises above data/ci/baseline.json
	$(OFFLINE) uv run python -m kavach.cli ci --prompt ../data/ci/hardened_prompt.md --policy ../data/ci/hardened_policy.json --baseline ../data/ci/baseline.json
