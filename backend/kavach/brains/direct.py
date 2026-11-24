"""Direct brain: same prompts as Lyzr, called straight through LiteLLM (fallback if Lyzr is down)."""

from __future__ import annotations

from kavach.brains.base import Brain, system_prompt_for
from kavach.config import Settings

KEEP_TURNS = 8  # messages kept after the system prompt


class DirectBrain(Brain):
    def __init__(self, settings: Settings):
        super().__init__(settings)
        self._history: dict[str, list[dict]] = {}

    async def complete(self, agent: str, message: str, *, session_id: str, temperature: float) -> str:
        import litellm

        turns = self._history.setdefault(session_id, [])
        turns.append({"role": "user", "content": message})
        messages = [{"role": "system", "content": system_prompt_for(agent)}, *turns[-KEEP_TURNS:]]
        resp = await litellm.acompletion(
            model=self.settings.direct_model,
            messages=messages,
            temperature=temperature,
            timeout=self.settings.llm_timeout_s,
        )
        text = resp.choices[0].message.content or ""
        turns.append({"role": "assistant", "content": text})
        del turns[:-KEEP_TURNS]
        return text
