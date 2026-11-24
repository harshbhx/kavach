"""One-command setup: `make setup` (from backend/) or `pnpm setup` (from the repo root).

Asks for three keys, then does the rest:
  1. writes .env from .env.example (keys, models, BRAIN_PROVIDER=lyzr, BAND_ENABLED=true)
  2. creates the 7 Kavach agents in Lyzr Studio from prompts/agents/*.md and stores their IDs
  3. registers the 7 agents on Band, writes agent_config.yaml, finds your Band user ID
  4. checks every connection (`make setup ARGS=check` re-runs only the checks)

Re-running is safe: agents that already have IDs are skipped. Nothing is printed that would leak a key.
Flags: check | --yes (no prompts; read keys from the environment) | --skip-lyzr | --skip-band | --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import getpass
import os
import sys

import yaml

from kavach.config import REPO_ROOT
from kavach.setup.envfile import read_env, update_env
from kavach.setup.provision import AGENTS, DISPLAY, BandProvisioner, LyzrProvisioner, ProvisionError

ENV = REPO_ROOT / ".env"
ENV_EXAMPLE = REPO_ROOT / ".env.example"
AGENT_CONFIG = REPO_ROOT / "agent_config.yaml"

OK, WARN, FAIL = "  ok  ", "  !!  ", "  xx  "


def ask(env: dict[str, str], key: str, prompt: str, secret: bool, yes: bool, default: str = "") -> str:
    current = os.environ.get(key) or env.get(key, "")
    if current and not current.startswith("your-"):
        return current
    if yes:
        return default
    shown = f" [{default}]" if default else ""
    value = (getpass.getpass if secret else input)(f"{prompt}{shown}: ").strip()
    return value or default


def mask(v: str) -> str:
    return f"{v[:4]}…{v[-3:]}" if len(v) > 10 else "set"


async def provision_lyzr(env: dict[str, str], key: str, dry: bool) -> dict[str, str]:
    p = LyzrProvisioner(
        api_key=key,
        base_url=env.get("LYZR_BASE_URL") or "https://agent-prod.studio.lyzr.ai/v3",
        provider=env.get("LYZR_PROVIDER") or "OpenAI",
        model=env.get("LYZR_MODEL") or "gpt-4o-mini",
        credential=env.get("LYZR_CREDENTIAL_ID") or "lyzr_openai",
    )
    out: dict[str, str] = {}
    print("\nLyzr: the seven agent brains")
    for a in AGENTS:
        k = f"LYZR_AGENT_{a.upper()}"
        if env.get(k):
            print(f"{OK}{DISPLAY[a]:<16} already created ({env[k]})")
            continue
        if dry:
            print(f"{OK}{DISPLAY[a]:<16} would be created")
            continue
        out[k] = await p.create(a)
        print(f"{OK}{DISPLAY[a]:<16} created {out[k]}")
    return out


async def provision_band(env: dict[str, str], user_key: str, dry: bool) -> dict[str, str]:
    p = BandProvisioner(
        user_api_key=user_key, base_url=env.get("BAND_API_BASE") or "https://app.band.ai/api/v1"
    )
    creds = yaml.safe_load(AGENT_CONFIG.read_text()) if AGENT_CONFIG.exists() else {}
    creds = creds or {}
    print("\nBand: the shared room")
    me = await p.me()
    owner = str(me.get("id") or me.get("user_id") or "")
    handle = str(me.get("handle") or me.get("username") or "")
    print(f"{OK}signed in as {handle or me.get('name') or 'you'}")
    changed = False
    for a in AGENTS:
        if (creds.get(a) or {}).get("api_key"):
            print(f"{OK}{DISPLAY[a]:<16} already registered")
            continue
        if dry:
            print(f"{OK}{DISPLAY[a]:<16} would be registered")
            continue
        creds[a] = await p.register(a)
        changed = True
        print(
            f"{OK}{DISPLAY[a]:<16} registered {creds[a]['agent_id']} (API key saved, Band shows it only once)"
        )
    if changed:
        header = "# Band remote-agent credentials, written by `make setup`. Gitignored. Keys are shown by Band only once.\n"
        AGENT_CONFIG.write_text(header + yaml.safe_dump(creds, sort_keys=False))
        os.chmod(AGENT_CONFIG, 0o600)
    values = {"BAND_ENABLED": "true"}
    if owner:
        values["BAND_OWNER_USER_ID"] = owner
    if handle:
        values["BAND_OWNER_HANDLE"] = handle
    return values


async def checks() -> int:
    """Re-read .env and test every connection without changing anything."""
    from kavach.config import Settings
    from kavach.target_client import TargetClient

    env = read_env(ENV)
    s = Settings()
    failures = 0
    print("\nChecks")
    # Lyzr
    if s.brain_provider == "lyzr":
        missing = [a for a in AGENTS if not s.lyzr_agent_id(a)]
        if not s.lyzr_api_key or missing:
            print(f"{FAIL}Lyzr: missing {'key' if not s.lyzr_api_key else ', '.join(missing)}")
            failures += 1
        else:
            try:
                reply = await LyzrProvisioner(api_key=s.lyzr_api_key, base_url=s.lyzr_base_url).ping(
                    s.lyzr_agent_id("referee"), s.lyzr_user_id
                )
                print(f"{OK}Lyzr: the Referee answered ({reply[:60]!r})")
            except (ProvisionError, Exception) as exc:  # noqa: BLE001
                print(f"{FAIL}Lyzr: {exc}")
                failures += 1
    else:
        print(f"{WARN}BRAIN_PROVIDER={s.brain_provider} (Lyzr not used)")
    # Band
    if s.band_enabled:
        creds = yaml.safe_load(AGENT_CONFIG.read_text()) if AGENT_CONFIG.exists() else {}
        p = BandProvisioner(user_api_key="", base_url=s.band_api_base)
        ok = 0
        for a in AGENTS:
            key = ((creds or {}).get(a) or {}).get("api_key")
            if not key:
                continue
            try:
                await p.check_agent(key)
                ok += 1
            except (ProvisionError, Exception):  # noqa: BLE001
                pass
        mark = OK if ok == len(AGENTS) else FAIL
        failures += ok != len(AGENTS)
        print(f"{mark}Band: {ok}/{len(AGENTS)} agents authenticate")
    else:
        print(f"{WARN}BAND_ENABLED=false (the dashboard still shows the room)")
    # Target model
    if s.target_model != "fake" and not any(
        env.get(k) for k in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY")
    ):
        print(f"{FAIL}Target: TARGET_MODEL={s.target_model} but no provider key is set")
        failures += 1
    else:
        client = TargetClient(s)
        try:
            h = await client.health()
            print(f"{OK}Target: reachable at {s.target_url} ({h.get('target_model', s.target_model)})")
        except Exception:  # noqa: BLE001
            print(
                f"{WARN}Target: not running at {s.target_url}. Start it with `make target` (or use TARGET_URL=inprocess)"
            )
        finally:
            await client.aclose()
    print(
        "\nAll set. Next: `make probe`, then `pnpm dev` from the repo root."
        if not failures
        else f"\n{failures} check(s) failed."
    )
    return 1 if failures else 0


async def main() -> int:
    ap = argparse.ArgumentParser(
        prog="make setup", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("action", nargs="?", default="all", choices=["all", "check"])
    ap.add_argument("--yes", action="store_true", help="no prompts; read keys from the environment or .env")
    ap.add_argument("--skip-lyzr", action="store_true")
    ap.add_argument("--skip-band", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.action == "check":
        return await checks()

    if not ENV.exists() and not args.dry_run:
        update_env(ENV, {}, template=ENV_EXAMPLE)
        print("created .env from .env.example")
    env = read_env(ENV)

    print("Kavach setup. Keys stay in .env and agent_config.yaml (both gitignored).\n")
    lyzr_key = (
        ""
        if args.skip_lyzr
        else ask(env, "LYZR_API_KEY", "Lyzr API key (Lyzr Studio > Settings > API keys)", True, args.yes)
    )
    lyzr_user = "" if args.skip_lyzr else ask(env, "LYZR_USER_ID", "Lyzr account email", False, args.yes)
    band_key = (
        ""
        if args.skip_band
        else ask(env, "BAND_USER_API_KEY", "Band user API key (Band > Settings > API Keys)", True, args.yes)
    )
    model_key = ask(
        env, "ANTHROPIC_API_KEY", "Anthropic API key for the target bot (Enter to skip)", True, args.yes
    )

    values: dict[str, str] = {}
    if lyzr_key:
        values |= {"LYZR_API_KEY": lyzr_key, "BRAIN_PROVIDER": "lyzr"}
    if lyzr_user:
        values["LYZR_USER_ID"] = lyzr_user
    if band_key:
        values["BAND_USER_API_KEY"] = band_key
    if model_key:
        values["ANTHROPIC_API_KEY"] = model_key
    if values and not args.dry_run:
        update_env(ENV, values, template=ENV_EXAMPLE)
        print("\n.env updated: " + ", ".join(f"{k}={mask(v)}" for k, v in values.items()))
    env = read_env(ENV) | values

    try:
        if lyzr_key:
            ids = await provision_lyzr(env, lyzr_key, args.dry_run)
            if ids and not args.dry_run:
                update_env(ENV, ids)
        else:
            print("\nLyzr skipped (no key). Agents will use BRAIN_PROVIDER=direct or fake until you add one.")
        if band_key:
            band_values = await provision_band(env, band_key, args.dry_run)
            if not args.dry_run:
                update_env(ENV, band_values)
        else:
            print("\nBand skipped (no key). Runs still work; the dashboard shows the room.")
            if not args.dry_run:
                update_env(ENV, {"BAND_ENABLED": "false"})
    except ProvisionError as exc:
        print(f"\n{FAIL}{exc}")
        print("Fix the key or the field named above and run `make setup` again; finished steps are skipped.")
        return 1

    if args.dry_run:
        print("\nDry run: nothing was written.")
        return 0
    return await checks()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
