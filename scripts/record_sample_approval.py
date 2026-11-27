"""Record the labelled sample of human approval: scripted agents, an offline target, and a person who rejects the
first patch the Auditor passes, then approves the next one.

    cd backend && uv run python ../scripts/record_sample_approval.py

Writes runs/sample_approval_run.jsonl, which the dashboard offers as a sample. It is not a live run: the agents are the
scripted fake brain and the person is this script, so the dashboard labels it "simulated".
"""

from __future__ import annotations

import asyncio
import os
import shutil
from pathlib import Path

os.environ.update(
    {"BRAIN_PROVIDER": "fake", "BAND_ENABLED": "false", "TARGET_MODEL": "fake", "TARGET_URL": "inprocess"}
)

from kavach.config import REPO_ROOT, Settings  # noqa: E402
from kavach.runtime import build_run, save_extras  # noqa: E402

OUT = REPO_ROOT / "runs" / "sample_approval_run.jsonl"


async def reviewer(run) -> None:
    """Reject the first patch that asks, approve the second."""
    decisions = [
        ("reject", "it should escalate a Hinglish refund, not refuse it"),
        ("approve", None),
    ]
    seen = None
    while decisions:
        pending = run.state.approval
        if pending is not None and pending is not seen:
            await asyncio.sleep(2.5)  # a person reads the numbers before deciding
            decision, reason = decisions.pop(0)
            pending.decide(decision, "Harsh (sample)", "band", reason)
            seen = pending
        await asyncio.sleep(0.05)


async def main() -> None:
    tmp = REPO_ROOT / "runs" / ".sample-approval"
    tmp.mkdir(exist_ok=True)
    s = Settings()
    s.runs_dir = str(tmp)
    s.approval_required = True
    s.approval_timeout_s = 60
    s.fake_delay_s = 0.4
    run = build_run(s)
    helper = asyncio.create_task(reviewer(run))
    state = await run.run()
    helper.cancel()
    save_extras(state, run.bus.log_path)
    shutil.copyfile(run.bus.log_path, OUT)
    shutil.rmtree(tmp, ignore_errors=True)
    r1 = state.summary.rounds[0]
    print(f"{OUT.relative_to(REPO_ROOT)}: round 1 breach {r1.breach_rate:.0%}, vetoes {r1.vetoes}, applied {r1.applied_version}")


if __name__ == "__main__":
    asyncio.run(main())
