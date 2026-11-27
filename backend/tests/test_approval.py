"""Human approval: a patch the Auditor passed waits for a person, who can approve or reject it; a timeout follows policy."""

from __future__ import annotations

import asyncio

import httpx
import pytest
import respx
from fastapi import HTTPException

from kavach.api import app as api
from kavach.band import live_referee as lr
from kavach.models import RunSummary
from kavach.runtime import build_run


async def _wait_for_approval(run, timeout: float = 10.0):
    for _ in range(int(timeout / 0.01)):
        if run.state.approval is not None:
            return run.state.approval
        await asyncio.sleep(0.01)
    raise AssertionError("no approval was requested")


def _types(run, prefix: str) -> list[dict]:
    return [e.data for e in run.bus.history if e.type.startswith(prefix)]


async def test_off_by_default_never_asks(settings, tmp_path):
    settings.runs_dir = str(tmp_path)
    run = build_run(settings)
    state = await run.run()
    assert state.summary.rounds[0].applied_version == "v2"
    assert _types(run, "approval.") == []


async def test_reject_sends_the_patcher_back_then_approve_ships(settings, tmp_path):
    settings.runs_dir = str(tmp_path)
    settings.approval_required = True
    settings.approval_timeout_s = 10
    run = build_run(settings)
    task = asyncio.create_task(run.run())

    first = await _wait_for_approval(run)
    assert run.state.summary.awaiting_approval == first.version == "v2"
    assert first.decide("reject", "Harsh", "band", "blocks Hinglish refunds")
    assert not first.decide("approve", "Harsh", "band")  # already settled

    second = await _wait_for_approval_after(run, first)
    assert second.attempt > first.attempt and second.version == "v2"
    assert second.decide("approve", "Harsh", "dashboard")
    state = await asyncio.wait_for(task, 30)

    r1 = state.summary.rounds[0]
    assert r1.applied_version == "v2" and r1.status == "hardened"
    assert state.summary.awaiting_approval is None and state.approval is None
    requested, decided = _types(run, "approval.requested"), _types(run, "approval.decided")
    assert len(requested) == 2 and requested[0]["timeout_s"] == 10
    assert [(d["decision"], d["by"], d["source"]) for d in decided] == [
        ("reject", "Harsh", "band"),
        ("approve", "Harsh", "dashboard"),
    ]
    assert decided[0]["reason"] == "blocks Hinglish refunds"
    texts = [e.data["text"] for e in run.bus.history if e.type == "agent.message" and e.agent == "referee"]
    assert any("approve v2" in t for t in texts) and any("rejected by Harsh" in t for t in texts)


async def _wait_for_approval_after(run, previous, timeout: float = 10.0):
    for _ in range(int(timeout / 0.01)):
        cur = run.state.approval
        if cur is not None and cur is not previous:
            return cur
        await asyncio.sleep(0.01)
    raise AssertionError("no second approval was requested")


@pytest.mark.parametrize("fallback,applied", [("approve", "v2"), ("reject", None)])
async def test_timeout_follows_the_policy(settings, tmp_path, fallback, applied):
    settings.runs_dir = str(tmp_path)
    settings.approval_required = True
    settings.approval_timeout_s = 0.05
    settings.approval_on_timeout = fallback
    run = build_run(settings)
    state = await asyncio.wait_for(run.run(), 60)
    r1 = state.summary.rounds[0]
    assert r1.applied_version == applied
    decided = _types(run, "approval.decided")
    assert decided and all(d["source"] == "timeout" and d["decision"] == fallback for d in decided)
    if fallback == "reject":
        assert r1.status == "unhardened"


async def test_api_endpoint_settles_the_waiting_patch(settings):
    loop = asyncio.get_running_loop()
    from kavach.orchestrator.approval import PendingApproval
    from kavach.orchestrator.events import EventBus
    from kavach.orchestrator.run import RunState

    state = RunState(summary=RunSummary(run_id="kv-appr"))
    api.RUNS["kv-appr"] = api.RunHandle(summary=state.summary, bus=EventBus("kv-appr"), live_state=state)
    try:
        with pytest.raises(HTTPException) as nothing:
            await api.decide_approval("kv-appr", api.ApprovalIn(decision="approve"))
        assert nothing.value.status_code == 409

        state.approval = PendingApproval("v2", 1, 1, loop.create_future())
        with pytest.raises(HTTPException) as wrong:
            await api.decide_approval("kv-appr", api.ApprovalIn(decision="approve", version="v3"))
        assert wrong.value.status_code == 409 and "v2 is waiting" in wrong.value.detail

        ok = await api.decide_approval(
            "kv-appr", api.ApprovalIn(decision="reject", version="v2", by=" Harsh ", reason=" too strict ")
        )
        assert ok == {"ok": True, "version": "v2", "decision": "reject"}
        assert state.approval.future.result() == {
            "decision": "reject",
            "by": "Harsh",
            "source": "dashboard",
            "reason": "too strict",
        }
        with pytest.raises(HTTPException):
            await api.decide_approval("kv-appr", api.ApprovalIn(decision="approve"))
    finally:
        api.RUNS.pop("kv-appr", None)


def test_start_run_accepts_require_approval():
    assert api.StartRun(require_approval=True).require_approval is True
    assert api.StartRun().require_approval is None


# ── the live Referee side ──


def test_parse_decision():
    assert lr.parse_decision("@Referee approve v2") == ("approve", "v2", None)
    assert lr.parse_decision("@Referee, reject v3 because it blocks Hinglish refunds") == (
        "reject",
        "v3",
        "it blocks Hinglish refunds",
    )
    assert lr.parse_decision("ship it") == ("approve", None, None)
    assert lr.parse_decision("should I approve v2?") is None
    assert lr.parse_decision("@Referee status") is None


def test_status_mentions_a_waiting_patch():
    s = RunSummary(run_id="kv-w", awaiting_approval="v2")
    assert lr.answer("status", s).startswith("v2 passed the Auditor and is waiting for you")
    assert "approve v2" in lr.answer("anything new?", s)


@respx.mock
async def test_decider_forwards_to_the_waiting_run():
    respx.get("http://api/api/runs").mock(return_value=httpx.Response(200, json=[{"run_id": "kv-w"}]))
    respx.get("http://api/api/runs/kv-w").mock(
        return_value=httpx.Response(200, json=RunSummary(run_id="kv-w", awaiting_approval="v2").model_dump())
    )
    post = respx.post("http://api/api/runs/kv-w/approval").mock(
        return_value=httpx.Response(200, json={"ok": True})
    )
    decide = lr.default_decider("http://api")
    assert await decide("approve", "v2", "Harsh", None) == "Approved v2. Shipping it now."
    sent = httpx.Response(200, content=post.calls[0].request.content).json()
    assert sent == {"decision": "approve", "version": "v2", "by": "Harsh", "source": "band", "reason": None}
    assert (await decide("reject", None, "Harsh", "too strict")).startswith("Rejected v2 (too strict)")


@respx.mock
async def test_decider_when_nothing_waits_or_version_is_wrong():
    respx.get("http://idle/api/runs").mock(return_value=httpx.Response(200, json=[{"run_id": "kv-i"}]))
    respx.get("http://idle/api/runs/kv-i").mock(
        return_value=httpx.Response(200, json=RunSummary(run_id="kv-i").model_dump())
    )
    assert await lr.default_decider("http://idle")("approve", None, "Harsh", None) == (
        "No patch is waiting for approval right now."
    )
    respx.get("http://w/api/runs").mock(return_value=httpx.Response(200, json=[{"run_id": "kv-w"}]))
    respx.get("http://w/api/runs/kv-w").mock(
        return_value=httpx.Response(200, json=RunSummary(run_id="kv-w", awaiting_approval="v2").model_dump())
    )
    respx.post("http://w/api/runs/kv-w/approval").mock(
        return_value=httpx.Response(409, json={"detail": "v2 is waiting, not v3"})
    )
    assert await lr.default_decider("http://w")("approve", "v3", "Harsh", None) == "v2 is waiting, not v3."


async def test_adapter_routes_decisions_to_the_decider():
    pytest.importorskip("band")
    from types import SimpleNamespace

    calls = []

    async def decider(decision, version, by, reason):
        calls.append((decision, version, by, reason))
        return f"Approved {version}. Shipping it now."

    async def source():
        raise AssertionError("a decision must not read the status")

    class Tools:
        turn = SimpleNamespace(replied=False)
        sent: list = []

        async def send_message(self, content, mentions=None):
            self.sent.append(content)
            return {"id": "m"}

    tools = Tools()
    adapter = lr.RefereeAdapter(source=source, decider=decider)
    msg = SimpleNamespace(
        content="@Referee approve v2", sender_type="User", sender_name="Harsh", sender_id="u-1"
    )
    await adapter.on_message(msg, tools, [], None, None, is_session_bootstrap=False, room_id="r")
    assert calls == [("approve", "v2", "Harsh", None)]
    assert tools.sent == ["@Harsh Approved v2. Shipping it now."]
