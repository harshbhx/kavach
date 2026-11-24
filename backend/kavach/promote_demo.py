"""Promote a finished recording to the headline demo (runs/demo_run.jsonl), the way the recorder does.

    cd backend && uv run python -m kavach.promote_demo ../runs/kv-XXXX.jsonl --model groq/openai/gpt-oss-20b

`pnpm demo` only saves a run that passes the strict story check (including "at least one patch was vetoed"). When the
Patcher is good enough that nothing needs a veto, this promotes a chosen real recording instead and fills the README results
table and the Devpost breach story from that run's own numbers. It never edits a recording.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

from kavach.models import RoundSummary, RunSummary
from kavach.record_demo import breach_story, fill_markers, results_table


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("run", type=Path, help="a finished runs/kv-*.jsonl recording")
    ap.add_argument("--model", required=True, help="the target model the run used, for the results table")
    args = ap.parse_args()

    rounds: list[RoundSummary] = []
    report_md = ""
    run_id = args.run.stem
    for line in args.run.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        ev = json.loads(line)
        if ev["type"] == "round.scored":
            rounds.append(RoundSummary(**ev["data"]))
        elif ev["type"] == "replay.extras":
            report_md = ev["data"].get("report_md") or ""
        elif ev["type"] == "run.started":
            run_id = ev.get("run_id") or run_id
    if not rounds or not report_md:
        sys.exit("not a finished recording (no rounds, or no report in replay.extras)")

    summary = RunSummary(run_id=run_id, status="completed", rounds=rounds)
    root = args.run.resolve().parents[1]
    runs = root / "runs"
    target = runs / "demo_run.jsonl"
    if target.exists():
        shutil.copy(target, target.with_suffix(".previous.jsonl"))
    shutil.copy(args.run, target)
    (runs / "demo_run.report.md").write_text(report_md, encoding="utf-8")
    print(f"saved {target.relative_to(root)} from {run_id}")
    for rel, name, content in (
        ("README.md", "results", results_table(summary, args.model)),
        ("docs/DEMO_AND_SUBMISSION.md", "breach-story", breach_story(summary)),
    ):
        print(f"  {'filled' if fill_markers(root / rel, name, content) else 'no marker in'} {rel}")


if __name__ == "__main__":
    main()
