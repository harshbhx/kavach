"""Regression tests for the findings of the independent code review (target concurrency and retry, attack-library
validation, the refund clamp, the run API's bounds). Everything offline."""

import asyncio
import types

import httpx
import pytest
from pydantic import ValidationError

from kavach.agents import red
from kavach.agents.blue import enforce_run_rules
from kavach.api import app as api
from kavach.config import Settings
from kavach.models import Candidate, GuardPolicy, PatchProposal, RunRules
from kavach.target import llm

# ── target concurrency comes from Settings, one semaphore per event loop ──


def test_target_concurrency_is_a_validated_setting(monkeypatch):
    assert Settings().target_concurrency == 2
    monkeypatch.setenv("TARGET_CONCURRENCY", "8")
    assert Settings().target_concurrency == 8
    for bad in ("0", "-1", "65", "many"):
        monkeypatch.setenv("TARGET_CONCURRENCY", bad)
        with pytest.raises(ValidationError):
            Settings()


def test_no_semaphore_is_created_at_import_time():
    assert not hasattr(llm, "_LLM_SLOTS")
    assert not any(isinstance(v, asyncio.Semaphore) for v in vars(llm).values())


def test_each_event_loop_gets_its_own_semaphore_sized_from_settings(monkeypatch):
    monkeypatch.setenv("TARGET_CONCURRENCY", "3")
    s = Settings()

    async def grab():
        sem = llm._slots(s)
        assert llm._slots(s) is sem  # stable within a loop
        return sem

    first = asyncio.run(grab())
    second = asyncio.run(grab())  # a second loop must not inherit the first loop's semaphore
    assert first is not second
    assert first._value == 3 and second._value == 3


# ── the rate-limit retry is bounded, and a daily quota is not retried ──


class RateLimit(Exception):
    """Stands in for litellm.RateLimitError."""


def fake_litellm(failures: list[str]):
    calls = {"n": 0}

    async def acompletion(**_):
        calls["n"] += 1
        if failures:
            raise RateLimit(failures.pop(0))
        return "ok"

    return types.SimpleNamespace(RateLimitError=RateLimit, acompletion=acompletion), calls


class Clock:
    """A fake monotonic clock that only moves when the code sleeps."""

    def __init__(self):
        self.now = 0.0
        self.slept: list[float] = []

    def monotonic(self) -> float:
        return self.now

    async def sleep(self, seconds: float) -> None:
        self.slept.append(seconds)
        self.now += seconds


@pytest.fixture
def clock(monkeypatch):
    c = Clock()
    monkeypatch.setattr(llm.time, "monotonic", c.monotonic)
    monkeypatch.setattr(llm.asyncio, "sleep", c.sleep)
    return c


MINUTE = "Rate limit reached for model on tokens per minute (TPM): Limit 8000, Used 7300. Try again in 1s"
DAILY = "Rate limit reached for model on tokens per day (TPD): Limit 200000, Used 199900. Try again in 14m"


async def test_a_per_minute_limit_is_waited_out_then_succeeds(clock):
    lib, calls = fake_litellm([MINUTE, MINUTE])
    assert await llm._complete(lib, Settings(), [{"role": "user", "content": "hi"}]) == "ok"
    assert calls["n"] == 3 and clock.slept == [3, 6]


async def test_a_daily_quota_is_raised_at_once_without_waiting(clock):
    lib, calls = fake_litellm([DAILY, DAILY])
    with pytest.raises(RateLimit):
        await llm._complete(lib, Settings(), [])
    assert calls["n"] == 1 and clock.slept == []


async def test_the_retry_budget_is_capped_at_sixty_seconds(clock):
    lib, calls = fake_litellm([MINUTE] * 50)
    with pytest.raises(RateLimit):
        await llm._complete(lib, Settings(), [])
    assert sum(clock.slept) <= llm.RETRY_BUDGET_S
    assert calls["n"] == len(clock.slept) + 1 < 50


def test_is_daily_quota_reads_the_provider_message():
    assert llm._is_daily_quota(RateLimit(DAILY))
    assert not llm._is_daily_quota(RateLimit(MINUTE))


# ── an unknown attack library fails at startup, not in the middle of a round ──


def test_unknown_attack_library_is_rejected_with_the_valid_names(monkeypatch):
    assert Settings(attack_library="hard").attack_library == "hard"
    with pytest.raises(ValidationError) as err:
        Settings(attack_library="nope")
    assert "standard" in str(err.value) and "hard" in str(err.value)
    monkeypatch.setenv("ATTACK_LIBRARY", "nope")
    with pytest.raises(ValidationError):
        Settings()


def test_a_library_problem_means_no_style_examples_not_a_crashed_round():
    assert red._style_examples("injection", 1, "nope") == []
    assert len(red._style_examples("injection", 1, "standard")) == 2


# ── the clamp applies in a custom run even when the visitor's limit is the default 500 ──


def proposal(max_auto):
    policy = GuardPolicy.model_validate({"refund": {"max_auto_inr": max_auto}})
    return PatchProposal(candidate=Candidate(system_prompt="p", guard_policy=policy), changelog=["fix"])


@pytest.mark.parametrize("candidate_limit, expected", [(None, 500), (1000, 500), (500, 500), (300, 300)])
def test_a_custom_run_with_the_default_limit_still_clamps_the_refund(candidate_limit, expected):
    p = proposal(candidate_limit)
    enforce_run_rules(p, RunRules(refund_limit_inr=500, allowed_coupons=["DIWALI10"]))
    assert p.candidate.guard_policy.refund.max_auto_inr == expected
    assert p.candidate.guard_policy.coupons.allowed_codes == ["DIWALI10"]


def test_default_rules_still_clamp_nothing():
    p = proposal(None)
    enforce_run_rules(p, RunRules())
    assert p.candidate.guard_policy.refund.max_auto_inr is None and p.changelog == ["fix"]


# ── rounds and attacks per agent are bounded on every run, custom or not ──


@pytest.mark.parametrize("field", ["rounds", "attacks_per_agent"])
@pytest.mark.parametrize("value", [-1, 0, 11, 500])
def test_out_of_range_rounds_and_attacks_are_rejected(field, value):
    with pytest.raises(ValidationError):
        api.StartRun(**{field: value})


def test_in_range_values_are_accepted():
    body = api.StartRun(rounds=2, attacks_per_agent=10)
    assert body.rounds == 2 and body.attacks_per_agent == 10
    assert api.StartRun().rounds is None


async def test_the_run_endpoint_answers_422_for_bad_bounds():
    transport = httpx.ASGITransport(app=api.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as client:
        for payload in ({"rounds": -1}, {"rounds": 500}, {"attacks_per_agent": 0}):
            r = await client.post("/api/runs", json=payload)
            assert r.status_code == 422, payload
