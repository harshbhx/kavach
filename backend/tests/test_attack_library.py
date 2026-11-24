"""The attack libraries: the default is untouched, the hard one is well-formed, and selecting it by name works end to end offline."""

import asyncio
import json

import pytest

from kavach.agents.red import library_attacks
from kavach.attack_library import LIBRARIES, load_library
from kavach.brains.fake import FakeBrain
from kavach.config import DATA_DIR, Settings
from kavach.models import RULE_IDS

AGENTS = ("injection", "social")


def _all(lib):
    return [(rnd, agent, a) for rnd, by_agent in lib.items() for agent in AGENTS for a in by_agent[agent]]


def test_default_library_is_the_standard_file_and_setting_defaults_to_it():
    assert Settings().attack_library == "standard"
    raw = json.loads((DATA_DIR / "attack_library.json").read_text(encoding="utf-8"))["rounds"]
    assert load_library() == raw == load_library("standard")


def test_unknown_library_name_is_a_clear_error():
    with pytest.raises(ValueError, match="unknown attack library 'nope'.*hard.*standard"):
        load_library("nope")


def test_hard_library_has_the_same_shape_as_the_standard_one():
    std, hard = load_library("standard"), load_library("hard")
    assert set(hard) == set(std) == {"1", "2", "3"}
    for rnd in hard:
        for agent in AGENTS:
            assert 4 <= len(hard[rnd][agent]) <= 6, (rnd, agent)  # 8-10 attacks per round across both agents


def test_hard_attacks_have_every_field_and_unique_ids():
    items = _all(load_library("hard"))
    ids = [a["id"] for _, _, a in items]
    assert len(ids) == len(set(ids)) == 30
    standard_ids = {a["id"] for _, _, a in _all(load_library("standard"))}
    assert not standard_ids & set(ids)
    for rnd, agent, a in items:
        assert {"id", "technique", "goal", "message", "level"} <= set(a), a["id"]
        assert a["goal"] in RULE_IDS, a["id"]
        assert isinstance(a["level"], int) and 1 <= a["level"] <= 5, a["id"]
        assert a["message"].strip() and len(a["message"]) <= 1200, a[
            "id"
        ]  # generate_attacks truncates at 1200
        assert a["id"].startswith(f"hard-r{rnd}-{'inj' if agent == 'injection' else 'soc'}-"), a["id"]


def test_hard_library_escalates_by_round_and_covers_every_rule():
    lib = load_library("hard")
    mean = {rnd: sum(a["level"] for agent in AGENTS for a in lib[rnd][agent]) / 10 for rnd in lib}
    assert mean["1"] < mean["2"] < mean["3"]
    assert {a["goal"] for _, _, a in _all(lib)} == set(RULE_IDS)


def test_library_attacks_follow_the_selected_library():
    hard_messages = {a["message"] for _, _, a in _all(load_library("hard"))}
    std_messages = {a["message"] for _, _, a in _all(load_library("standard"))}
    picked = library_attacks("injection", 2, 3, seed=1, library="hard")
    assert picked and all(a.source == "library" and a.message in hard_messages for a in picked)
    default = library_attacks("injection", 2, 3, seed=1)
    assert all(a.message in std_messages for a in default)


def test_fake_brain_runs_with_the_hard_library():
    brain = FakeBrain(Settings(brain_provider="fake", attack_library="hard"))
    hard_messages = {a["message"] for _, _, a in _all(load_library("hard"))}
    reply = asyncio.run(
        brain.complete(
            "injection", 'TASK: generate_attacks\n\n{"round": 3, "n": 3}', session_id="t", temperature=0
        )
    )
    attacks = json.loads(reply)["attacks"]
    assert attacks and all(a["message"] in hard_messages for a in attacks)


def test_every_registered_library_file_exists():
    for name, file in LIBRARIES.items():
        assert (DATA_DIR / file).exists(), name
