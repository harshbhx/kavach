"""Record the demo run: `make demo` (from backend/).

Runs Kavach live with the current .env, checks that the run tells the story the video needs, and if it does copies it
to runs/demo_run.jsonl (plus the audit report). Retries up to --attempts times.

A good demo run has: round 1 breached (>= 50%), at least one vetoed patch, a breach rate that falls by the last round,
and final utility >= 90%.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import re
import shutil
import sys
from pathlib import Path

from kavach.config import Settings
from kavach.models import RunSummary
from kavach.runtime import build_run, save_extras


def story_problems(summary: RunSummary) -> list[str]:
    """Empty list = the run is demo-worthy."""
    rounds = sorted(summary.rounds, key=lambda r: r.round)
    if not rounds:
        return ["no rounds finished"]
    problems: list[str] = []
    if summary.status != "completed":
        problems.append(f"run ended as {summary.status}")
    first, last = rounds[0], rounds[-1]
    if first.breach_rate < 0.5:
        problems.append(
            f"round 1 breach rate is {first.breach_rate:.0%} (needs >= 50%; try a weaker TARGET_MODEL)"
        )
    if sum(r.vetoes for r in rounds) == 0:
        problems.append("no patch was vetoed (the utility-trap moment is missing)")
    if len(rounds) > 1 and last.breach_rate >= first.breach_rate:
        problems.append(f"breach rate did not fall ({first.breach_rate:.0%} -> {last.breach_rate:.0%})")
    utility = next((r.utility_applied for r in reversed(rounds) if r.utility_applied is not None), None)
    if utility is None or utility < 0.9:
        problems.append(f"final utility is {utility if utility is not None else 'unknown'} (needs >= 90%)")
    return problems


def _pct(x: float | None) -> str:
    return "–" if x is None else f"{x:.0%}"


def results_table(summary: RunSummary, model: str) -> str:
    """The README results table for a recorded run."""
    rows = [
        "| Round | Config attacked | Attacks | Breach rate | Patch applied | Utility | Vetoes |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in sorted(summary.rounds, key=lambda r: r.round):
        rows.append(
            f"| {r.round} | {r.config_attacked} | {r.total_attacks} | {_pct(r.breach_rate)} | "
            f"{r.applied_version or '–'} | {_pct(r.utility_applied)} | {r.vetoes} |"
        )
    rows.append("")
    rows.append(
        f"<sub>Run `{summary.run_id}`, target model `{model}`. Replay it: `runs/demo_run.jsonl`.</sub>"
    )
    return "\n".join(rows)


def breach_story(summary: RunSummary) -> str:
    """ "100% → 0% → 0%" for the Devpost text."""
    return " → ".join(_pct(r.breach_rate) for r in sorted(summary.rounds, key=lambda r: r.round))


def fill_markers(path: Path, name: str, content: str) -> bool:
    """Replace the text between <!-- name:start --> and <!-- name:end --> in a docs file."""
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(rf"(<!-- {name}:start -->)(.*?)(<!-- {name}:end -->)", re.S)
    if not pattern.search(text):
        return False
    sep = "\n" if "\n" in content else ""
    path.write_text(
        pattern.sub(lambda m: f"{m.group(1)}{sep}{content}{sep}{m.group(3)}", text, count=1), encoding="utf-8"
    )
    return True


async def record(attempts: int, rounds: int | None) -> int:
    settings = Settings()
    if rounds:
        settings.rounds = rounds
    target = settings.runs_path / "demo_run.jsonl"
    for n in range(1, attempts + 1):
        print(
            f"\nattempt {n}/{attempts}: brains={settings.brain_provider} target={settings.target_model} band={settings.band_enabled}"
        )
        run = build_run(settings)
        state = await run.run()
        save_extras(state, run.bus.log_path)
        for r in state.summary.rounds:
            util = "–" if r.utility_applied is None else f"{r.utility_applied:.0%}"
            print(
                f"  round {r.round}: breach {r.breach_rate:.0%}, vetoes {r.vetoes}, utility {util}, {r.status}"
            )
        problems = story_problems(state.summary)
        if not problems:
            if target.exists():
                shutil.copy(target, target.with_suffix(".previous.jsonl"))
            shutil.copy(run.bus.log_path, target)
            if state.report_md:
                (settings.runs_path / "demo_run.report.md").write_text(state.report_md, encoding="utf-8")
            print(f"\nsaved {target.relative_to(settings.runs_path.parent)} from {state.summary.run_id}.")
            root = settings.runs_path.parent
            filled = [
                f
                for f, ok in (
                    (
                        "README.md",
                        fill_markers(
                            root / "README.md", "results", results_table(state.summary, settings.target_model)
                        ),
                    ),
                    (
                        "docs/DEMO_AND_SUBMISSION.md",
                        fill_markers(
                            root / "docs" / "DEMO_AND_SUBMISSION.md",
                            "breach-story",
                            breach_story(state.summary),
                        ),
                    ),
                )
                if ok
            ]
            if filled:
                print("filled the results into " + ", ".join(filled))
            print(
                "Commit it: git add runs/demo_run.jsonl README.md docs && git commit -m 'chore(runs): record the demo run'"
            )
            return 0
        print("  not demo-worthy: " + "; ".join(problems))
    print(
        f"\nno demo-worthy run in {attempts} attempt(s). Logs are in runs/. Adjust the model or prompts and retry."
    )
    return 1


def main() -> None:
    ap = argparse.ArgumentParser(
        prog="make demo", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--attempts", type=int, default=3)
    ap.add_argument("--rounds", type=int, default=None)
    args = ap.parse_args()
    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")
    sys.exit(asyncio.run(record(args.attempts, args.rounds)))


if __name__ == "__main__":
    main()
