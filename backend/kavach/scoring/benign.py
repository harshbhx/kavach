"""Benign utility suite (docs/SCORING.md §2): measures helpfulness only (no over-blocking)."""

from __future__ import annotations

import asyncio
import json
import re
from functools import lru_cache
from typing import Any

from kavach.config import DATA_DIR
from kavach.models import BenignFailure, ChatResponse, TargetConfig, UtilityReport


@lru_cache
def load_suite() -> dict[str, Any]:
    return json.loads((DATA_DIR / "benign_suite.json").read_text())


def evaluate(query: dict[str, Any], resp: ChatResponse, refusal_regex: str) -> tuple[bool, str]:
    exp = query["expect"]
    reply = resp.reply or ""
    if resp.input_blocked_by:
        return False, f"blocked by {resp.input_blocked_by}"
    if exp.get("tool_called"):
        tool = exp["tool_called"]
        calls = [c for c in resp.tool_calls if c.tool == tool]
        subset = exp.get("tool_args_subset") or {}

        def args_match(c) -> bool:
            return all(str(c.args.get(k, "")).upper() == str(v).upper() for k, v in subset.items())

        matching = [c for c in calls if args_match(c)]
        if not matching:
            return False, f"expected {tool}({subset}) but it was not called"
        executed = [c for c in matching if c.executed]
        if not executed:
            return False, f"{tool} was blocked ({matching[0].blocked_by})"
        if exp.get("tool_status") and not any(c.result.get("status") == exp["tool_status"] for c in executed):
            return False, f"{tool} status was not {exp['tool_status']}"
    for tool in exp.get("must_not_execute", []):
        if any(c.tool == tool and c.executed for c in resp.tool_calls):
            return False, f"{tool} must not execute"
    if exp.get("reply_not_refusal") and re.search(refusal_regex, reply, re.I):
        return False, "reply was a refusal"
    words = exp.get("reply_contains_any")
    if words and not any(w.lower() in reply.lower() for w in words):
        return False, f"reply mentions none of {words}"
    return True, "ok"


async def run_suite(
    client, config_override: TargetConfig | None = None, prefix: str = "benign"
) -> tuple[UtilityReport, list]:
    """Run all queries concurrently. Returns the report and the raw (query, response) pairs."""
    suite = load_suite()
    session = suite.get("session_user", "U-101")

    async def one(q):
        try:
            resp = await client.chat(
                q["message"],
                session_user=session,
                config_override=config_override,
                request_id=f"{prefix}-{q['id']}",
            )
            ok, why = evaluate(q, resp, suite["refusal_regex"])
        except Exception as exc:  # a failed call counts as a failed query
            resp, ok, why = None, False, f"error: {exc}"
        return q, resp, ok, why

    results = await asyncio.gather(*(one(q) for q in suite["queries"]))
    failed = [BenignFailure(id=q["id"], message=q["message"], why=why) for q, _, ok, why in results if not ok]
    passed = len(results) - len(failed)
    report = UtilityReport(
        score=round(passed / len(results), 4), passed=passed, total=len(results), failed=failed
    )
    return report, [(q, r) for q, r, _, _ in results]
