"""Command line.

python -m kavach.cli run --rounds 3     run Kavach without the API (used by `make smoke`)
python -m kavach.cli ci                 CI mode: fail when the breach rate rises (see kavach/ci.py)
"""

from __future__ import annotations

import argparse
import asyncio
import logging
from pathlib import Path

from kavach.config import Settings
from kavach.runtime import build_run, save_extras


async def _run(rounds: int | None) -> int:
    settings = Settings()
    if rounds:
        settings.rounds = rounds
    run = build_run(settings)
    state = await run.run()
    save_extras(state, run.bus.log_path)
    print(f"\nrun {state.summary.run_id}: {state.summary.status}")
    for r in state.summary.rounds:
        util = "–" if r.utility_applied is None else f"{r.utility_applied:.0%}"
        print(
            f"  round {r.round}: attacked {r.config_attacked}, breach {r.breach_rate:.0%} "
            f"({r.breaching}/{r.total_attacks}), attempts {r.attempts}, vetoes {r.vetoes}, "
            f"applied {r.applied_version or '–'}, utility {util}, status {r.status}"
        )
    print(f"events: {run.bus.log_path}")
    if state.report_md:
        out = run.bus.log_path.with_suffix(".report.md")
        out.write_text(state.report_md, encoding="utf-8")
        print(f"report: {out}")
    return 0 if state.summary.status == "completed" else 1


def main() -> None:
    p = argparse.ArgumentParser(prog="kavach")
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run", help="run Kavach once")
    r.add_argument("--rounds", type=int, default=None)
    c = sub.add_parser("ci", help="fail when a prompt or policy change raises the breach rate")
    c.add_argument("--prompt", type=Path, default=None, help="system prompt file (default: DiwaliMart v1)")
    c.add_argument("--policy", type=Path, default=None, help="guard policy JSON (default: v1's)")
    c.add_argument(
        "--baseline", type=Path, default=None, help="baseline JSON (default: .kavach/baseline.json)"
    )
    c.add_argument("--library", default="standard", help="attack library: standard or hard")
    c.add_argument("--tolerance", type=float, default=0.0, help="allowed breach-rate rise, e.g. 0.05")
    c.add_argument(
        "--update-baseline", action="store_true", help="record the current numbers as the baseline"
    )
    c.add_argument("--json", type=Path, default=None, help="also write the result as JSON")
    args = p.parse_args()
    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")
    if args.cmd == "ci":
        from kavach.ci import DEFAULT_BASELINE, run_ci

        raise SystemExit(
            asyncio.run(
                run_ci(
                    prompt=args.prompt,
                    policy=args.policy,
                    baseline_path=args.baseline or DEFAULT_BASELINE,
                    library=args.library,
                    tolerance=args.tolerance,
                    update_baseline=args.update_baseline,
                    json_out=args.json,
                )
            )
        )
    raise SystemExit(asyncio.run(_run(args.rounds)))


if __name__ == "__main__":
    main()
