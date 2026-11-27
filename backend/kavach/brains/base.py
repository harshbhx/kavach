"""Brain interface + JSON extraction, validation and one repair retry (docs/AGENT_ROSTER.md)."""

from __future__ import annotations

import asyncio
import json
import logging
import re
from abc import ABC, abstractmethod
from typing import TypeVar

from pydantic import BaseModel, ValidationError

from kavach.config import PROMPTS_DIR, Settings

log = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)

PROMPT_FILES = {
    "recon": "recon.md",
    "injection": "injection.md",
    "social": "social_engineer.md",
    "monitor": "monitor.md",
    "patcher": "patcher.md",
    "auditor": "auditor.md",
    "referee": "referee.md",
}


class BrainError(RuntimeError):
    pass


def system_prompt_for(agent: str) -> str:
    return (PROMPTS_DIR / "agents" / PROMPT_FILES[agent]).read_text(encoding="utf-8")


def format_message(task: str, payload: dict) -> str:
    return f"TASK: {task}\n\n{json.dumps(payload, indent=2, ensure_ascii=False, default=str)}"


# A backslash that doesn't start a JSON escape (\x41, \', a regex) makes the whole object unreadable; doubling it
# keeps the text as written.
_BAD_ESCAPE = re.compile(r'\\(?!["\\/bfnrtu])')


def json_candidates(text: str | dict | list) -> list[dict | list]:
    """Every JSON object, and every non-empty list of objects, in text, largest first.

    Tolerates markdown fences, chatter around the JSON, raw newlines inside strings and stray backslashes. An outer
    object is always larger than the objects nested in it, so it comes first and callers can take the first
    candidate that fits their schema.
    """
    if isinstance(text, dict | list):
        return [text]
    # strict=False: models often put raw newlines inside string values (long system prompts); without it the
    # outer object fails and we would wrongly return a nested one.
    decoder = json.JSONDecoder(strict=False)
    found: list[dict | list] = []
    for variant in dict.fromkeys((text, _BAD_ESCAPE.sub(r"\\\\", text))):
        for i, ch in enumerate(variant):
            if ch not in "{[":
                continue
            try:
                obj, _ = decoder.raw_decode(variant[i:])
            except json.JSONDecodeError:
                continue
            fits = isinstance(obj, dict) or (
                obj and isinstance(obj, list) and all(isinstance(x, dict) for x in obj)
            )
            if fits and obj not in found:
                found.append(obj)
    return sorted(found, key=lambda o: -len(json.dumps(o, ensure_ascii=False)))


def extract_json(text: str) -> dict:
    """Return the first JSON object in text (tolerates markdown fences and chatter around it)."""
    for obj in json_candidates(text):
        if isinstance(obj, dict):
            return obj
    raise BrainError("no JSON object in reply")


def parse_reply(text: str, schema: type[T]) -> T:
    """The first JSON value in text that fits schema. If none does, raise the first candidate's error."""
    candidates = json_candidates(text)
    if not candidates:
        raise BrainError("no JSON object in reply")
    errors: list[ValidationError] = []
    for obj in candidates:
        try:
            return schema.model_validate(obj)
        except ValidationError as exc:
            errors.append(exc)
    raise errors[0]


def schema_hint(schema: type[BaseModel]) -> str:
    """The JSON schema, compact, for the repair message."""
    return json.dumps(schema.model_json_schema(), separators=(",", ":"))[:1500]


class Brain(ABC):
    def __init__(self, settings: Settings):
        self.settings = settings

    @abstractmethod
    async def complete(self, agent: str, message: str, *, session_id: str, temperature: float) -> str:
        """Send one message to the agent and return its raw reply text."""


async def run_agent(
    brain: Brain,
    agent: str,
    task: str,
    payload: dict,
    schema: type[T],
    *,
    session_id: str,
    temperature: float,
) -> T:
    """Call an agent, parse + validate its JSON, retry once with the error. Raises BrainError on failure."""
    message = format_message(task, payload)
    last_err = ""
    for attempt in range(2):
        prompt = (
            message
            if attempt == 0
            else (
                f"{message}\n\nYour previous reply was invalid: {last_err}\nReply again with ONLY one valid JSON object, "
                f"no markdown, matching this JSON schema: {schema_hint(schema)}"
            )
        )
        try:
            text = await asyncio.wait_for(
                brain.complete(agent, prompt, session_id=session_id, temperature=temperature),
                timeout=brain.settings.llm_timeout_s,
            )
            return parse_reply(text, schema)
        except (BrainError, ValidationError, json.JSONDecodeError) as exc:
            last_err = str(exc)[:500]
            log.warning("agent %s task %s invalid reply (attempt %d): %s", agent, task, attempt + 1, last_err)
        except TimeoutError:
            last_err = "timeout"
            log.warning("agent %s task %s timed out (attempt %d)", agent, task, attempt + 1)
        except Exception as exc:  # network / provider errors
            last_err = f"{type(exc).__name__}: {exc}"[:500]
            log.warning("agent %s task %s failed (attempt %d): %s", agent, task, attempt + 1, last_err)
    raise BrainError(f"{agent}.{task} failed: {last_err}")
