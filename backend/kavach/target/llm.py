"""One chat turn of the target bot: input filters → LLM tool loop (or fake model) → output filters."""

from __future__ import annotations

import asyncio
import json
import logging
import time
import weakref

from kavach.config import Settings
from kavach.models import ChatRequest, ChatResponse, TargetConfig
from kavach.target import fake_model, guards
from kavach.target.db import CANARY, fresh_db, user_name
from kavach.target.runner import ToolRunner
from kavach.target.tools import TOOL_SCHEMAS

log = logging.getLogger(__name__)
MAX_TOOL_ROUNDS = 4


def render_system_prompt(config: TargetConfig, db: dict, session_user: str) -> str:
    return config.system_prompt.replace("{{SESSION_USER_ID}}", session_user).replace(
        "{{SESSION_USER_NAME}}", user_name(db, session_user)
    )


async def run_chat(req: ChatRequest, config: TargetConfig, settings: Settings) -> ChatResponse:
    started = time.perf_counter()
    db = fresh_db()
    policy = config.guard_policy
    runner = ToolRunner(db, req.session_user, policy, req.request_id)

    check = guards.check_input(req.message, policy)
    if check.blocked_by:
        return ChatResponse(
            request_id=req.request_id,
            reply=guards.BLOCKED_REPLY,
            input_blocked_by=check.blocked_by,
            config_version=config.version,
            latency_ms=int((time.perf_counter() - started) * 1000),
        )

    system_prompt = render_system_prompt(config, db, req.session_user)
    if settings.target_model == "fake":
        reply = fake_model.respond(req.message, system_prompt, runner)
    else:
        reply = await _llm_loop(req.message, system_prompt, runner, settings)

    reply = guards.filter_output(reply, policy, CANARY)
    return ChatResponse(
        request_id=req.request_id,
        reply=reply,
        tool_calls=runner.records,
        config_version=config.version,
        latency_ms=int((time.perf_counter() - started) * 1000),
    )


# Model calls in flight at once. Free-tier providers cap tokens per minute, so the default is two (TARGET_CONCURRENCY in
# Settings raises it on a paid tier). A semaphore belongs to the event loop it is first used on, so there is one per loop,
# created lazily, never at import time.
_SLOTS: weakref.WeakKeyDictionary[asyncio.AbstractEventLoop, asyncio.Semaphore] = weakref.WeakKeyDictionary()

# After the first rate-limit answer a call keeps retrying for at most this long (monotonic seconds), well inside the
# client's request timeout, so a burst never keeps spending quota on requests the caller already gave up on.
RETRY_BUDGET_S = 60.0


def _slots(settings: Settings) -> asyncio.Semaphore:
    loop = asyncio.get_running_loop()
    sem = _SLOTS.get(loop)
    if sem is None:
        sem = _SLOTS[loop] = asyncio.Semaphore(settings.target_concurrency)
    return sem


def _is_daily_quota(exc: Exception) -> bool:
    """A per-day cap does not clear in seconds, so waiting on it only burns the budget."""
    text = str(exc).lower()
    return any(m in text for m in ("per day", "tokens per day", "requests per day", "(tpd)", "(rpd)"))


def _extra_params(model: str) -> dict:
    # gpt-oss is a reasoning model: hidden reasoning tokens dominate the cost of a short support reply and eat a
    # free-tier tokens-per-minute budget. "low" keeps replies fast and cheap, which a support bot would do anyway.
    return {"reasoning_effort": "low"} if "gpt-oss" in model else {}


async def _complete(litellm, settings: Settings, messages: list[dict]):
    """One model call. Free-tier providers (Groq) cap tokens per minute and answer bursts with 429, so a per-minute
    limit waits and retries (for at most RETRY_BUDGET_S after the first 429) instead of failing the whole customer turn.
    A daily quota is raised at once. At most `target_concurrency` calls run at the same time."""
    slots = _slots(settings)
    attempt = 0
    first_limited: float | None = None
    while True:
        try:
            async with slots:
                return await litellm.acompletion(
                    model=settings.target_model,
                    messages=messages,
                    tools=TOOL_SCHEMAS,
                    temperature=settings.target_temperature,
                    timeout=settings.llm_timeout_s,
                    **_extra_params(settings.target_model),
                )
        except litellm.RateLimitError as exc:
            if _is_daily_quota(exc):
                raise
            now = time.monotonic()
            first_limited = now if first_limited is None else first_limited
            attempt += 1
            delay = min(3 * attempt, 15)
            if now + delay - first_limited > RETRY_BUDGET_S:
                raise
            await asyncio.sleep(delay)


async def _llm_loop(message: str, system_prompt: str, runner: ToolRunner, settings: Settings) -> str:
    import litellm  # imported lazily: slow import, not needed in fake mode

    messages: list[dict] = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": message},
    ]
    for _ in range(MAX_TOOL_ROUNDS):
        resp = await _complete(litellm, settings, messages)
        msg = resp.choices[0].message
        tool_calls = getattr(msg, "tool_calls", None) or []
        if not tool_calls:
            return msg.content or ""
        messages.append(
            {
                "role": "assistant",
                "content": msg.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in tool_calls
                ],
            }
        )
        for tc in tool_calls:
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            result = runner.call(tc.function.name, args)
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": json.dumps(result)})
    log.warning("target hit MAX_TOOL_ROUNDS")
    return "Let me connect you with a human agent for this one."
