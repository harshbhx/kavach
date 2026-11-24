"""Settings loaded from the repo-root .env (and the process environment)."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
DATA_DIR = REPO_ROOT / "data"
PROMPTS_DIR = REPO_ROOT / "prompts"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(REPO_ROOT / ".env"), str(BACKEND_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # brains
    brain_provider: str = "lyzr"  # lyzr | direct | fake
    lyzr_api_key: str = ""
    lyzr_base_url: str = "https://agent-prod.studio.lyzr.ai/v3"
    lyzr_user_id: str = "kavach"
    lyzr_agent_recon: str = ""
    lyzr_agent_injection: str = ""
    lyzr_agent_social: str = ""
    lyzr_agent_monitor: str = ""
    lyzr_agent_patcher: str = ""
    lyzr_agent_auditor: str = ""
    lyzr_agent_referee: str = ""
    direct_model: str = "anthropic/claude-haiku-5-5"

    # target
    target_url: str = "http://localhost:8001"  # or "inprocess" for tests/smoke
    target_extra_headers: dict[str, str] = Field(default_factory=dict)
    target_model: str = "anthropic/claude-haiku-5-5"  # or "fake"
    target_temperature: float = 0.2

    # band
    band_enabled: bool = True
    band_api_base: str = "https://api.band.ai/api/v1"
    band_agent_config: str = "agent_config.yaml"
    band_owner_user_id: str = ""

    # run
    rounds: int = 3
    attacks_per_agent: int = 3
    max_patch_attempts: int = 3
    utility_threshold: float = 0.9
    replay_max_breach: float = 0.34
    max_concurrency: int = 6
    llm_timeout_s: float = 45.0
    seed: int = 42

    # api
    dashboard_origin: str = "http://localhost:5173"
    runs_dir: str = "../runs"

    @field_validator("target_extra_headers", mode="before")
    @classmethod
    def _parse_headers(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return json.loads(v) if v else {}
        return v or {}

    def lyzr_agent_id(self, agent: str) -> str:
        return getattr(self, f"lyzr_agent_{agent}", "")

    @property
    def runs_path(self) -> Path:
        p = Path(self.runs_dir)
        if not p.is_absolute():
            p = (BACKEND_DIR / p).resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def band_config_path(self) -> Path:
        p = Path(self.band_agent_config)
        return p if p.is_absolute() else (REPO_ROOT / p)


@lru_cache
def get_settings() -> Settings:
    return Settings()
