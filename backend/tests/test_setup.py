import httpx
import pytest
import respx

from kavach.setup.envfile import read_env, update_env
from kavach.setup.provision import AGENTS, BandProvisioner, LyzrProvisioner, ProvisionError, agent_payload


def test_update_env_keeps_comments_and_appends(tmp_path):
    env = tmp_path / ".env"
    env.write_text("# keys\nLYZR_API_KEY=\nBAND_ENABLED=true\n")
    changed = update_env(env, {"LYZR_API_KEY": "sk-1", "NEW_KEY": "x"})
    assert set(changed) == {"LYZR_API_KEY", "NEW_KEY"}
    text = env.read_text()
    assert text.startswith("# keys\nLYZR_API_KEY=sk-1\nBAND_ENABLED=true\n")
    assert read_env(env) == {"LYZR_API_KEY": "sk-1", "BAND_ENABLED": "true", "NEW_KEY": "x"}
    assert update_env(env, {"LYZR_API_KEY": "sk-1"}) == []


def test_update_env_creates_from_template(tmp_path):
    tpl = tmp_path / ".env.example"
    tpl.write_text("A=\nB=2\n")
    env = tmp_path / ".env"
    update_env(env, {"A": "1"}, template=tpl)
    assert read_env(env) == {"A": "1", "B": "2"}


def test_agent_payload_uses_prompt_sections():
    p = agent_payload("recon", "OpenAI", "gpt-4o-mini", "lyzr_openai")
    assert p["name"] == "Kavach Recon"
    assert "reconnaissance agent" in p["agent_role"]
    assert p["agent_goal"].startswith("Map the target")
    assert p["agent_instructions"].startswith("# Role")
    assert {p["provider_id"], p["model"], p["llm_credential_id"]} == {"OpenAI", "gpt-4o-mini", "lyzr_openai"}


@respx.mock
async def test_lyzr_create_reads_agent_id():
    route = respx.post("https://agent-prod.studio.lyzr.ai/v3/agents/").mock(
        return_value=httpx.Response(200, json={"agent_id": "abc123"})
    )
    assert await LyzrProvisioner(api_key="k").create("auditor") == "abc123"
    assert route.calls[0].request.headers["x-api-key"] == "k"


@respx.mock
async def test_lyzr_bad_key_is_explained():
    respx.post("https://agent-prod.studio.lyzr.ai/v3/agents/").mock(
        return_value=httpx.Response(403, json={"detail": "no"})
    )
    with pytest.raises(ProvisionError, match="LYZR_API_KEY"):
        await LyzrProvisioner(api_key="bad").create("recon")


@respx.mock
async def test_band_register_falls_back_to_unwrapped_body():
    route = respx.post("https://app.band.ai/api/v1/me/agents/register").mock(
        side_effect=[
            httpx.Response(422, json={"error": "unknown field agent"}),
            httpx.Response(201, json={"data": {"id": "ag-1", "api_key": "band-key"}}),
        ]
    )
    creds = await BandProvisioner(user_api_key="u").register("referee")
    assert creds == {"agent_id": "ag-1", "api_key": "band-key"}
    assert route.call_count == 2


@respx.mock
async def test_band_me_reads_profile():
    respx.get("https://app.band.ai/api/v1/me/profile").mock(
        return_value=httpx.Response(200, json={"data": {"id": "user-9", "handle": "harsh"}})
    )
    me = await BandProvisioner(user_api_key="u").me()
    assert me["id"] == "user-9"


def test_all_seven_agents_have_prompts():
    for a in AGENTS:
        assert agent_payload(a, "p", "m", "c")["agent_instructions"]
