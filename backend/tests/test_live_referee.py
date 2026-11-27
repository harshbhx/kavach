"""The live Referee answers people in the Band room with code-computed numbers, and never answers agents."""

from __future__ import annotations

from types import SimpleNamespace

import httpx
import pytest
import respx

from kavach.band import live_referee as lr
from kavach.config import REPO_ROOT
from kavach.models import RoundSummary, RunSummary

DEMO = REPO_ROOT / "runs" / "demo_run.jsonl"


def _summary() -> RunSummary:
    return RunSummary(
        run_id="kv-test",
        status="completed",
        current_round=2,
        deployed_version="v2",
        report_ready=True,
        rounds=[
            RoundSummary(
                round=1,
                config_attacked="v1",
                total_attacks=6,
                breaching=5,
                breach_rate=5 / 6,
                findings_by_rule={"REFUND_LIMIT_EXCEEDED": 3, "CROSS_ACCOUNT_ACTION": 2},
                attempts=2,
                vetoes=1,
                applied_version="v2",
                utility_applied=1.0,
                tth_seconds=38.4,
                status="hardened",
            ),
            RoundSummary(round=2, config_attacked="v2", total_attacks=6, breach_rate=0.0, status="no_breach"),
        ],
    )


def test_status_is_the_default_answer():
    text = lr.answer("hey, how is it going?", _summary())
    assert "Breach rate 83% → 0%" in text
    assert "5 of 6 attacks breached" in text and "patched to v2 with utility 100%, 38 s" in text
    assert "nothing to patch" in text and text.endswith("Deployed config: v2.")


def test_breaches_patch_report_and_help():
    s = _summary()
    assert "REFUND_LIMIT_EXCEEDED ×3" in lr.answer("which breaches?", s)
    assert "round 2: no breaches" in lr.answer("what broke", s)
    patch = lr.answer("what patch shipped?", s)
    assert "v2 in round 1 after 2 attempt(s), utility 100%" in patch and "Vetoed: 1" in patch
    assert lr.answer("report please", s, "http://x/report.md").endswith("http://x/report.md")
    assert "ready on the dashboard" in lr.answer("report", s)
    assert lr.answer("help", s) == lr.HELP


def test_no_run_yet():
    assert lr.answer("status", None).startswith("No run has been scored yet")
    assert lr.answer("status", RunSummary(run_id="kv-empty")).startswith("No run has been scored yet")


def test_summary_from_the_recorded_demo_run():
    s = lr.summary_from_jsonl(DEMO)
    assert s and [r.round for r in s.rounds] == [1, 2, 3]
    assert s.rounds[0].breach_rate > 0.5 and s.rounds[1].breach_rate == 0 and s.rounds[2].breach_rate == 0
    assert s.deployed_version == "v2" and s.report_ready
    assert lr.summary_from_jsonl(REPO_ROOT / "runs" / "missing.jsonl") is None


@respx.mock
async def test_latest_summary_reads_the_newest_run():
    respx.get("http://api/api/runs").mock(
        return_value=httpx.Response(200, json=[{"run_id": "old"}, {"run_id": "kv-test"}])
    )
    respx.get("http://api/api/runs/kv-test").mock(
        return_value=httpx.Response(200, json=_summary().model_dump())
    )
    s = await lr.latest_summary("http://api")
    assert s and s.run_id == "kv-test" and s.rounds[0].breaching == 5


@respx.mock
async def test_latest_summary_is_none_when_the_api_is_down_or_empty():
    respx.get("http://down/api/runs").mock(side_effect=httpx.ConnectError("refused"))
    respx.get("http://empty/api/runs").mock(return_value=httpx.Response(200, json=[]))
    assert await lr.latest_summary("http://down") is None
    assert await lr.latest_summary("http://empty") is None


@respx.mock
async def test_default_source_falls_back_to_the_demo_run():
    respx.get("http://down/api/runs").mock(side_effect=httpx.ConnectError("refused"))
    summary, report_url = await lr.default_source("http://down")()
    assert summary and summary.mode == "replay" and report_url is None


def test_only_people_get_answers():
    assert lr.is_person("User") and lr.is_person(None)
    assert not lr.is_person("Agent") and not lr.is_person("System")


class _Tools:
    def __init__(self):
        self.turn = SimpleNamespace(replied=False)
        self.sent: list[tuple[str, list]] = []

    async def send_message(self, content, mentions=None):
        self.sent.append((content, mentions))
        self.turn.replied = True
        return {"id": "m1"}


def _msg(sender_type: str, content: str = "@Referee status?"):
    return SimpleNamespace(
        content=content, sender_type=sender_type, sender_name="Harsh", sender_id="u-1", room_id="r-1"
    )


async def test_adapter_replies_to_a_person_and_ignores_agents():
    pytest.importorskip("band")

    async def source():
        return _summary(), None

    adapter = lr.RefereeAdapter(source=source)
    tools = _Tools()
    await adapter.on_message(_msg("Agent"), tools, [], None, None, is_session_bootstrap=False, room_id="r-1")
    assert tools.sent == []
    await adapter.on_message(_msg("User"), tools, [], None, None, is_session_bootstrap=False, room_id="r-1")
    ((content, mentions),) = tools.sent
    assert content.startswith("@Harsh Run kv-test") and "83% → 0%" in content
    assert mentions == ["u-1"]
