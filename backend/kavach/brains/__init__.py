"""Brains: where each agent's thinking happens (Lyzr, a direct LLM call, or a deterministic fake)."""

from kavach.brains.base import Brain, BrainError, run_agent
from kavach.config import Settings


def make_brain(settings: Settings) -> Brain:
    provider = settings.brain_provider.lower()
    if provider == "lyzr":
        from kavach.brains.lyzr import LyzrBrain

        return LyzrBrain(settings)
    if provider == "direct":
        from kavach.brains.direct import DirectBrain

        return DirectBrain(settings)
    if provider == "fake":
        from kavach.brains.fake import FakeBrain

        return FakeBrain(settings)
    raise ValueError(f"unknown BRAIN_PROVIDER {settings.brain_provider!r}")


__all__ = ["Brain", "BrainError", "make_brain", "run_agent"]
