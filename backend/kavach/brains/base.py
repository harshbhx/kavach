"""Brain interface + JSON extraction, validation and one repair retry (docs/AGENT_ROSTER.md)."""

from __future__ import annotations

import asyncio
import json
import logging
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
    return (PROMPTS_DIR / "agents" / PROMPT_FILES[agent]).read_text()


def format_message(task: str, payload: dict) -> str:
    return f"TASK: {task}\n\n{json.dumps(payload, indent=2, ensure_ascii=False, default=str)}"


def extract_json(text: str) -> dict:
    """Return the first JSON object in text (tolerates markdown fences and chatter around it)."""
    if isinstance(text, dict):
        return text
    decoder = json.JSONDecoder()
    start = text.find("{")
    while start != -1:
        try:
            obj, _ = decoder.raw_decode(text[start:])
            if isinstance(obj, dict):
                return obj
        except json.JSONDecodeError:
            pass
        start = text.find("{", start + 1)
    raise BrainError("no JSON object in reply")


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
                f"{message}\n\nYour previous reply was invalid: {last_err}\nReply again with ONLY a valid JSON object matching the schema."
            )
        )
        try:
            text = await asyncio.wait_for(
                brain.complete(agent, prompt, session_id=session_id, temperature=temperature),
                timeout=brain.settings.llm_timeout_s,
            )
            return schema.model_validate(extract_json(text))
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
