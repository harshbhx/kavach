"""The 7 Kavach agents: thin wrappers that build payloads, call a brain, validate, and fall back safely."""

from __future__ import annotations

from dataclasses import dataclass

from kavach.brains import Brain
from kavach.config import Settings

TEMPERATURE = {
    "recon": 0.4,
    "injection": 0.6,
    "social": 0.6,
    "monitor": 0.2,
    "patcher": 0.2,
    "auditor": 0.2,
    "referee": 0.2,
}


@dataclass
class AgentCtx:
    brain: Brain
    settings: Settings
    run_id: str

    def session(self, agent: str) -> str:
        return f"{self.run_id}-{agent}"
