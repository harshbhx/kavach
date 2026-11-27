"""The skill packs are live inputs: they load, match the built-in fallback, reach the agents, and fail safe."""

from __future__ import annotations

import json
import shutil

import pytest

from kavach import skills
from kavach.agents import AgentCtx, blue, red
from kavach.brains import BrainError
from kavach.brains.fake import FakeBrain
from kavach.config import REPO_ROOT
from kavach.models import GuardPolicy


@pytest.fixture(autouse=True)
def fresh_cache():
    skills.clear_cache()
    yield
    skills.clear_cache()


def test_both_packs_load_with_a_versioned_ref():
    attack = skills.load_pack(skills.ATTACK_PACK)
    hardening = skills.load_pack(skills.HARDENING_PACK)
    assert attack and hardening
    assert attack.name == "owasp-llm-attack-pack" and hardening.name == "agent-hardening-pack"
    assert attack.description and hardening.description
    refs = skills.loaded_refs()
    assert [r.split("@")[0] for r in refs] == [skills.ATTACK_PACK, skills.HARDENING_PACK]
    assert all("+" in r for r in refs)


@pytest.mark.parametrize("squad", ["injection", "social"])
def test_pack_techniques_match_the_builtin_fallback(squad):
    assert skills.techniques_by_round(squad) == red.TECHNIQUES[squad]


def test_every_technique_is_documented_in_skill_md():
    text = (REPO_ROOT / "skills" / skills.ATTACK_PACK / "SKILL.md").read_text(encoding="utf-8")
    pack = skills.load_pack(skills.ATTACK_PACK)
    for t in pack.data["techniques"]:
        assert t["id"] in text, t["id"]
        assert t["card"] and t["owasp"] and t["goals"]


def test_cards_goals_are_real_breach_rules():
    from kavach.models import RULE_IDS

    for t in skills.load_pack(skills.ATTACK_PACK).data["techniques"]:
        assert set(t["goals"]) <= set(RULE_IDS), t["id"]


def test_technique_cards_for_one_round():
    cards = skills.technique_cards("injection", 1)
    assert [c["technique"] for c in cards] == ["direct_override", "fake_system_message"]
    assert all(c["how"] for c in cards)
    assert [c["technique"] for c in skills.technique_cards("social", 9)] == red.TECHNIQUES["social"]["3"]


def test_hardening_template_is_a_valid_guard_policy():
    brief = skills.hardening_brief()
    assert brief and len(brief["principles"]) == 5 and brief["system_prompt_additions"]
    policy = GuardPolicy.model_validate(brief["guard_policy_template"])
    assert policy.refund.max_auto_inr == 500 and policy.kyc.owner_only


def test_adal_copies_match_the_packs():
    for name in (skills.ATTACK_PACK, skills.HARDENING_PACK):
        src, copy = REPO_ROOT / "skills" / name, REPO_ROOT / ".adal" / "skills" / name
        files = sorted(p.relative_to(src) for p in src.rglob("*") if p.is_file())
        assert files == sorted(p.relative_to(copy) for p in copy.rglob("*") if p.is_file())
        for f in files:
            assert (src / f).read_bytes() == (copy / f).read_bytes(), (
                f"{name}/{f}: run scripts/sync_skills.py"
            )


def test_missing_packs_fall_back_safely(tmp_path, monkeypatch):
    monkeypatch.setenv("KAVACH_SKILLS_DIR", str(tmp_path))
    assert skills.load_pack(skills.ATTACK_PACK) is None
    assert skills.technique_cards("injection", 1) == []
    assert skills.hardening_brief() is None
    assert skills.loaded_refs() == []
    assert red.techniques("social") == red.TECHNIQUES["social"]


def test_broken_pack_falls_back_safely(tmp_path, monkeypatch):
    shutil.copytree(REPO_ROOT / "skills" / skills.ATTACK_PACK, tmp_path / skills.ATTACK_PACK)
    (tmp_path / skills.ATTACK_PACK / "techniques.json").write_text("{not json", encoding="utf-8")
    monkeypatch.setenv("KAVACH_SKILLS_DIR", str(tmp_path))
    assert skills.load_pack(skills.ATTACK_PACK) is None
    assert red.techniques("injection") == red.TECHNIQUES["injection"]


def test_digest_changes_with_the_pack(tmp_path, monkeypatch):
    shutil.copytree(REPO_ROOT / "skills" / skills.HARDENING_PACK, tmp_path / skills.HARDENING_PACK)
    monkeypatch.setenv("KAVACH_SKILLS_DIR", str(tmp_path))
    before = skills.load_pack(skills.HARDENING_PACK).digest
    book = tmp_path / skills.HARDENING_PACK / "playbook.json"
    data = json.loads(book.read_text(encoding="utf-8"))
    data["principles"].append("A sixth principle.")
    book.write_text(json.dumps(data), encoding="utf-8")
    skills.clear_cache()
    assert skills.load_pack(skills.HARDENING_PACK).digest != before


async def test_red_agents_receive_the_round_playbook(settings, monkeypatch):
    seen: dict = {}

    async def capture(brain, agent, task, payload, model, **kw):
        seen.update(agent=agent, payload=payload)
        raise BrainError("captured")

    monkeypatch.setattr(red, "run_agent", capture)
    ctx = AgentCtx(FakeBrain(settings), settings, "kv-test")
    batch = await red.generate_attacks(ctx, "social", 2, None, None)
    assert batch.attacks  # the library fallback still fills the round
    payload = seen["payload"]
    assert [c["technique"] for c in payload["playbook"]] == red.TECHNIQUES["social"]["2"]
    assert payload["allowed_techniques_by_round"] == red.TECHNIQUES["social"]
    assert "playbook_hint" in payload


async def test_patcher_receives_the_hardening_playbook(settings, v1, monkeypatch):
    from kavach.models import MonitorReport

    seen: dict = {}

    async def capture(brain, agent, task, payload, model, **kw):
        seen.update(payload=payload)
        raise BrainError("captured")

    monkeypatch.setattr(blue, "run_agent", capture)
    ctx = AgentCtx(FakeBrain(settings), settings, "kv-test")
    report = MonitorReport(incident_summary="test", root_causes=[], band_message="")
    await blue.propose_patch(ctx, 1, 1, v1, report, [], "v2")
    assert seen["payload"]["playbook"]["pack"].startswith("agent-hardening-pack@")
    assert seen["payload"]["playbook"]["guard_policy_template"]["kyc"]["owner_only"] is True
