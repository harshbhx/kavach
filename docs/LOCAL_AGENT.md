# Kavach: runbook for Harsh's laptop agent

You are Harsh Bhanushali's coding agent on his laptop, with his terminal, browser and tools. Your job today (Tue 24 Nov 2026) is to take **Kavach** from "works offline" to "recorded live run, deployed site, sponsor screenshots" before the hackathon deadline: **21:30 IST**, with everything pushed by **18:00 IST** so the film can be made from it.

Kavach: seven AI agents (Lyzr brains, talking in a Band room) attack and harden DiwaliMart Support, a tool-using support bot with fake data. Breaches are detected by code; a patch ships only if utility stays at 90% or more. The repo is `github.com/harshbhx/kavach` (public). Read `AGENTS.md` for the layout and rules.

**The film is not your job.** It is built in Harsh's cloud Claude session from what you push. Don't record or render video.

## Rules

- **Secrets:** Harsh pastes the API keys into `.env` himself. Never print a key, paste one into chat, or commit `.env` or `agent_config.yaml` (both gitignored). Run `git status` before every commit and make sure neither appears.
- **Commits:** author `Harsh Bhanushali <bhanushaliharsh434@gmail.com>`, clear conventional messages, **no `Co-Authored-By` or other AI trailers**, push to `main`, never force-push.
- **Fix, don't rebuild:** prefer `.env` changes over code changes. If code is wrong, make the smallest fix you can prove, run `make -C backend check` and `pnpm lint`, commit it on its own, and say what you changed.
- **Stop and ask Harsh** for: logging in anywhere, creating keys, 2FA, any payment or wallet top-up, and anything you can't undo.
- Keep a short log of what you did and every number you saw; step 9 sends it back.

## What Harsh does by hand (ask him at the right step)

| When | What |
|---|---|
| Step 2 | Log in to **Lyzr Studio** (studio.lyzr.ai) and create an API key; note his Lyzr account email. Log in to **Band** (app.band.ai) and create a user API key. Log in to the **Anthropic Console** and create an API key. Paste all four into `.env`. |
| Step 6 | Stay logged in to Lyzr and Band in the browser you drive, for the screenshots. |
| Step 7 | Approve the **Cloudflare** login page that `wrangler login` opens. |
| Step 8 | `gh auth login` if `gh` isn't signed in. |
| Optional | Log in to **Agent37**, create a key, confirm any spend. |

## Steps

### 0. Tools
Check and install what's missing: Node 22+, Git, Google Chrome, `pnpm` 10 (`corepack enable && corepack prepare pnpm@10 --activate`), `uv` (`curl -LsSf https://astral.sh/uv/install.sh | sh`), `gh`. Done when `node -v`, `pnpm -v`, `uv --version` and `gh --version` all print.

### 1. Code
```bash
git clone https://github.com/harshbhx/kavach.git || (cd kavach && git pull)
cd kavach
git config user.name "Harsh Bhanushali" && git config user.email "bhanushaliharsh434@gmail.com"
pnpm install
```
Done when `pnpm install` finishes with no errors.

### 2. Keys (Harsh)
```bash
cp -n .env.example .env
```
Ask Harsh to open `.env` and fill in `LYZR_API_KEY`, `LYZR_USER_ID` (his Lyzr email), `BAND_USER_API_KEY` and `ANTHROPIC_API_KEY`, then save. Don't read the values back.

### 3. Create the agents and check every connection
```bash
cd backend && uv run python -m kavach.setup --yes && cd ..
```
This creates the 7 Lyzr agents from `prompts/agents/`, registers the 7 Band agents, writes the IDs into `.env` and `agent_config.yaml`, and checks Lyzr, Band and the model. **Done when every check line says OK.** Re-check any time with `make -C backend check-setup`.

If it fails:
- **Lyzr 401/403:** the key or email is wrong; ask Harsh to re-check them.
- **Lyzr 4xx on agent creation:** show the response body (it names the missing field). The payload is `agent_payload()` in `backend/kavach/setup/provision.py`; add the field, keeping existing ones.
- **Band 401:** it must be a *user* API key, not an agent key.
- **Band 4xx on register:** show the body; the code is `BandProvisioner.register()` in the same file.
- Re-running is safe: agents already in `.env` are reused, not duplicated.

### 4. Is the bot breakable?
```bash
make -C backend probe
```
It needs a **v1 breach rate of 50% or more**, or the story has nothing to fix. If it's lower, the target model refuses too well: set `TARGET_MODEL` in `.env` to a weaker model and run it again. In order of preference: `openai/gpt-4o-mini` (needs `OPENAI_API_KEY`), then `groq/llama-3.1-8b-instant` (needs `GROQ_API_KEY`; Groq keys are free). Ask Harsh for the key. Note the final model and breach rate.

### 5. One live run, watched
```bash
pnpm dev
```
Open http://localhost:5173 and press **Start live run**. Watch all three rounds. Expect round 1 breached, a patch vetoed or approved, rounds 2–3 mostly held, and messages appearing in the Band room as it runs. Stop with Ctrl+C when the header says COMPLETE. If it errors, read the API log in the terminal, fix the cause (step 3's notes apply), and run it again.

### 6. Record the demo run, and the sponsor screenshots
```bash
pnpm demo
```
It runs live rounds until the run tells the story (round 1 breach ≥ 50%, at least one veto, breach falling, utility ≥ 90%), then saves `runs/demo_run.jsonl` and `runs/demo_run.report.md`, and fills the results into `README.md` and `docs/DEMO_AND_SUBMISSION.md`. It can take 15–30 minutes.

While it runs, take 1600×1000 screenshots in the browser Harsh is logged in to:
- `docs/assets/sponsors/lyzr-agents.png`: Lyzr Studio's agent list, showing the seven Kavach agents
- `docs/assets/sponsors/band-room.png`: the Kavach room in Band, showing several agents' @mention messages
- `docs/assets/sponsors/agent37.png`: only if you did the optional Agent37 step

Then add them to the README's "How the sponsors power it" section, one image under each sponsor's line, and commit:
```bash
git add runs/demo_run.jsonl runs/demo_run.report.md README.md docs
git status   # .env and agent_config.yaml must not be listed
git commit -m "chore(runs): record the demo run and sponsor screenshots"
git push
```

### 7. Put the site on Cloudflare
```bash
cd apps/web && npx wrangler login && cd ../..
pnpm deploy:site
```
`wrangler login` opens a Cloudflare page: Harsh approves it. The deploy prints the address, `https://kavach.<subdomain>.workers.dev`. Deploy once more with that address so social cards point at it:
```bash
NEXT_PUBLIC_SITE_URL=https://kavach.<subdomain>.workers.dev pnpm deploy:site
```
Check these all load: `/`, `/docs`, `/docs/scoring`, `/dashboard/?demo=live` (your recorded run) and `/dashboard/?demo=sample`.

### 8. GitHub page details
```bash
gh repo edit harshbhx/kavach \
  --description "Seven AI agents attack and harden a refund-issuing support bot. Breaches are caught by code; a patch ships only if real customers still get help." \
  --homepage "https://kavach.<subdomain>.workers.dev" \
  --add-topic ai-agents,agent-to-agent,llm-security,red-teaming,prompt-injection,guardrails,multi-agent,lyzr,band,agent37,fastapi,nextjs,cloudflare-workers,hackathon
```

### Optional: the target on Agent37 (+20 min, only if ahead of time)
Ask Harsh for an Agent37 key (agent37.com dashboard → API keys; new workspaces include credit for one instance).
```bash
AGENT37_API_KEY=... ANTHROPIC_API_KEY=... ./scripts/deploy_target_agent37.sh
```
Put the `TARGET_URL` and `TARGET_EXTRA_HEADERS` lines it prints into `.env`, run step 6 again, and take the Agent37 screenshot. Delete the instance after the hackathon with `./scripts/deploy_target_agent37.sh delete <id>`.

### 9. Report back
Give Harsh this, filled in, to paste to his cloud Claude session, then tell him to say **"start motion"** there:

```
Local run done.
- Target model: …   Probe breach rate (v1): …%
- Demo run: breach … → … → …, vetoes …, utility …%, time to harden … s   (pushed: yes/no)
- Site: https://kavach.<subdomain>.workers.dev
- Sponsor screenshots: Lyzr yes/no, Band yes/no, Agent37 yes/no
- Target ran on Agent37: yes/no.   AdaL used on the project: yes/no (ask Harsh)
- Code changes I made: … (or none)
- Problems left: … (or none)
```
