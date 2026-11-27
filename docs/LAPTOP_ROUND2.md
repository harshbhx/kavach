# Laptop runbook: round 2 (before 2 Dec 2026)

Everything here needs Harsh's machine, keys, accounts or browser. Everything else is already in the repo. Give the agent this one message:

```text
Clone or pull github.com/harshbhx/kavach, read AGENTS.md, then carry out docs/LAPTOP_ROUND2.md from top to bottom. Follow its rules exactly, keep a log of every number and link, and ask me before anything it marks "ask Harsh".
```

## What Kavach is (for a new agent)

Kavach is Harsh's entry in HiDevs' Diwali Festiverse: The Agent-to-Agent Hackathon (India Edition), Security track. Seven agents (Lyzr Studio agents talking in a Band room) attack a support bot, patch it, and prove the patch with a replay and a utility check. The deadline is **2 Dec 2026, 10:00 PM IST**. Judging is on sponsor tool integration only: Lyzr, Band, Finch, AdaL and Agent37. The finale is 5 Dec in Bengaluru, top 10 only (`docs/FINALE.md` is the script).

Specs are in `docs/`. `docs/HIDEVS.md` holds every answer for the HiDevs form, `docs/film/YOUTUBE.md` the film's YouTube copy, and `docs/LINKEDIN.md` the LinkedIn post.

## Rules

- Commits are authored as Harsh Bhanushali <bhanushaliharsh434@gmail.com>, with no AI co-author trailers. Group related changes into one commit.
- Work through an issue → branch → PR. Wait for CI (backend, CI gate, web) to pass, then squash merge. Leave no PR open.
- Keys live only in `.env` and `agent_config.yaml`, which are gitignored. Never print, paste or commit them. Never commit `apps/web/scripts/*.tmp.mjs`.
- Claim only what happened. Agent37 stays "deploy script included, recorded runs used a local target" until step 7b records a run on it. Label sample runs as samples.
- **Ask Harsh first** before any login, new key, wallet, payment or anything public: a YouTube upload, the LinkedIn post, publishing on Finch, the final HiDevs submit.

## On Windows (no `make`)

`make` isn't installed on Windows, and `pnpm demo` and `pnpm bootstrap` call it. Run the same commands from `backend/` instead:

| Instead of | Run |
| --- | --- |
| `make check` | `uv run ruff check . && uv run ruff format --check . && uv run pytest -q` |
| `make target` | `uv run uvicorn kavach.target.service:app --port 8001` |
| `pnpm demo` / `make demo` | `uv run python -m kavach.record_demo` (the target must be running: `pnpm dev` or the line above) |
| `make referee` | `uv run --extra live python -m kavach.band.live_referee` |
| `make gate` | `uv run python -m kavach.cli ci --prompt ../data/ci/hardened_prompt.md --policy ../data/ci/hardened_policy.json --baseline ../data/ci/baseline.json` |
| `make setup` (`pnpm bootstrap`) | `uv sync && uv run python -m kavach.setup` |

In PowerShell, set a variable for one command with `$env:APPROVAL_REQUIRED="true"; $env:APPROVAL_TIMEOUT_S="300"; pnpm dev`. Git Bash accepts the `NAME=value command` form used below.

`pnpm dev` starts the target on :8001 together with the API. Since the 27 Nov update, a run stops at once with "The target bot … isn't answering" if the target is down, so it can no longer record a fake 0% run.

## Files from Harsh

Harsh downloads two files from the Claude chat into `~/Downloads`: `kavach-film-2.mp4` (the 1:59 film) and `kavach-thumbnail.png`. They are not in the repo. If they are missing, ask him for them before step 10.

## Accounts Harsh signs in to

Harsh signs in himself; the agent asks him when a step needs one.

| Account | For | Step |
| --- | --- | --- |
| GitHub (`gh auth login`) | push, PRs, merging, deleting branches | 1, 8, 14 |
| Band | typing `@Referee` messages in the run's room | 3, 4 |
| Lyzr Studio | screenshots of the seven agents | 5 |
| AdaL | the CLI, if it asks on first run | 6 |
| Finch | publishing the packs with his wallet | 7 |
| Agent37 | the API key, and balance if the deploy says 402 | 7b |
| Cloudflare (`npx wrangler login`, if not signed in) | deploying the site | 9 |
| YouTube | uploading the film | 10 |
| HiDevs | the submission form | 11 |
| LinkedIn | the post | 12 |
| Devpost | checking the entry | 13 |

## Steps

1. **Set up.** Run `git pull`, `pnpm install`, then `cd backend && uv sync --extra live && make check`. All tests should pass. If `.env` or `agent_config.yaml` is missing, run `pnpm bootstrap` with Harsh at the keyboard: it asks for his Lyzr, Band and model keys, then creates the agents and both files.

2. **Fresh live run.** Run `pnpm demo` with the real keys (on Windows: the recorder line in the table above).
   - **Keep the headline run.** The film, Devpost, HiDevs and LinkedIn quote the current headline (83% → 0% → 0%, fixed in 38 s, `runs/gallery/demo1.jsonl`). If an attempt passes, the recorder overwrites `runs/demo_run.jsonl`, `runs/demo_run.report.md`, the README results table and `docs/DEMO_AND_SUBMISSION.md`: undo those with `git checkout`, and delete `runs/demo_run.previous.jsonl`.
   - **Add the new run to the gallery** as `demo9`, but only if it ended hardened, so "every run ended hardened" stays true. Add `{"id": "demo9", "title": ..., "blurb": ..., "source": "kv-....jsonl"}` to `runs/gallery.sources.json`, with a title like "Latest run: Finch playbooks in use" and a blurb that says only what the run shows. Then run `python scripts/build_gallery.py`. It writes `runs/gallery.json` and the README gallery table from the recording itself. A round 1 breach rate under 50% is fine here; demos 5, 6 and 8 are like that.
   - **Update the run count** ("8 recorded runs", "Eight recorded live runs", and the model count if it changes) in `apps/web/app/(home)/page.tsx`, `docs/HIDEVS.md`, `docs/LINKEDIN.md` and `docs/film/YOUTUBE.md`. Leave `docs/DEVPOST.md` as it is: it was true when it was submitted.
   Since the 27 Nov update, agent replies that drift from the schema (a bare list, the list under another key, a stray backslash, JSON inside an attack) are read instead of dropped, and the repair retry shows the agent the schema. If the log still shows `agent injection task generate_attacks invalid reply` on most calls, copy three of those lines into your report.

3. **Live Referee.** Run `pnpm dev` in one terminal and `make -C backend referee` in another. In the run's Band room, type `@Referee status`, then `@Referee breaches`. Screenshot the Referee's answers.

4. **Patch approval in Band.** Stop `pnpm dev`. Run `APPROVAL_REQUIRED=true APPROVAL_TIMEOUT_S=300 pnpm dev`, keep the Referee running, and start a live run from the dashboard. When the Referee asks in Band, type `@Referee reject v2 because it needs a human check`, then approve the next attempt with `@Referee approve v2`. Screenshot the Band exchange and the dashboard's approval banner. Save the run's JSONL as `runs/demo_approval.jsonl`: it is the first recorded run with a person in the loop. Then change the Band row in the README's sponsor table from "not yet in a recorded run" to say it is in one.

5. **Screenshots.** 3:2, light UI, no keys or emails visible: the seven agents in Lyzr Studio, the Band room from step 3, the approval from step 4, and the dashboard's Overview and Present mode (press P). Save them in `docs/assets/gallery/` with clear names.

6. **AdaL, for real.** Install the AdaL CLI (`npm install -g @sylphai/adal-cli`) and open it in the repo. Ask it to use the `owasp-llm-attack-pack` skill in `.adal/skills` to write five new Hinglish attack messages for `data/attack_library_hard.json` (round 2, social), following the existing format. Review its output and run `make check`. Commit it as "Five Hinglish attacks written by AdaL with the attack skill pack", and note in `docs/SPONSORS.md` §4 exactly what AdaL did.

7. **Finch (ask Harsh: his wallet).** Publish both skill packs with the commands in `docs/SPONSORS.md` §5. Put the two Finch links in the README sponsor table, the Finch answer in `docs/HIDEVS.md`, and `docs/LINKEDIN.md` (see its note on the Finch line).

7b. **Agent37.** Harsh has an account. He creates a key at https://www.agent37.com/dashboard/cloud/api-keys and adds it to `.env` himself as `AGENT37_API_KEY=...`. The target also needs `GROQ_API_KEY` (the headline model runs on Groq); if `.env` doesn't have it, ask Harsh to add it.
   - In Git Bash, from the repo root, load both keys without printing them, then deploy:
     `export AGENT37_API_KEY="$(grep '^AGENT37_API_KEY=' .env | cut -d= -f2-)" GROQ_API_KEY="$(grep '^GROQ_API_KEY=' .env | cut -d= -f2-)"` and then `./scripts/deploy_target_agent37.sh`.
     It starts the target in an Agent37 sandbox with `groq/openai/gpt-oss-20b`, the headline runs' victim. If it says HTTP 402, Harsh adds balance in the Agent37 dashboard.
   - Set `TARGET_URL` and `TARGET_EXTRA_HEADERS` in `.env` as the script prints. Keep the local values as comments so you can switch back. Stop the local target, then check that the dashboard header says "Agent37 sandbox".
   - Record a run: `uv run python -m kavach.record_demo --attempts 3`. Keep the headline run as in step 2. If the run ended hardened, add it to the gallery as `demo10` ("Target in an Agent37 sandbox") the same way, and count it in the run totals.
   - Update the Agent37 lines to say it was deployed and recorded, with the gallery link: the README sponsor table, `docs/SPONSORS.md` §3, the Agent37 answer in `docs/HIDEVS.md`, and the "Built with" line in `docs/LINKEDIN.md`. Then the Architecture Copilot diagram on HiDevs (step 11) can keep its Agent37 sandbox.
   - Ask Harsh whether to keep the instance running for the 5 Dec finale. Otherwise delete it: `./scripts/deploy_target_agent37.sh delete <id>`.

8. **Ship.** One PR with the new runs, screenshots, attacks and doc updates. Wait for CI, then squash merge.

9. **Deploy the site.** Run `pnpm deploy:site`. The GitHub "Deploy site" job skips the upload because the repo has no Cloudflare secrets, so the live site stays on the 24 Nov build until you do this. Check that these load: https://kavach.dualmindlab.tech, https://kavach.dualmindlab.tech/dashboard/?demo=approval and https://kavach.dualmindlab.tech/docs/ci-mode.
   To make deploys automatic (ask Harsh, it creates a key): make a Cloudflare API token with Workers edit rights, then run `gh secret set CLOUDFLARE_API_TOKEN` and `gh secret set CLOUDFLARE_ACCOUNT_ID` on harshbhx/kavach.

10. **YouTube (ask Harsh).** Upload `~/Downloads/kavach-film-2.mp4` with the title, description, chapters and tags in `docs/film/YOUTUBE.md`, and `kavach-thumbnail.png` as the thumbnail. Ask Harsh whether it should be public or unlisted. Then replace the old link `https://youtu.be/ZI6KTaSdtDo` with the new one in `docs/HIDEVS.md` (and delete the italic note under it), `docs/FINALE.md` and `docs/film/YOUTUBE.md`, and fill the `<YouTube link>` in `docs/LINKEDIN.md`. PR, merge, then run `pnpm deploy:site` again.

11. **HiDevs (in the browser, Harsh signed in).** Open the Diwali Festiverse hackathon on the HiDevs platform (app.hidevs.xyz) and go to its Submit tab.
    - Fill in every field from `docs/HIDEVS.md`, word for word, with the new video link.
    - Architecture Copilot: its diagram claims an Agent37 sandbox. Change it to match the README: Agent37 as "deploy script included", or leave it out, unless step 7b recorded a run on it.
    - Run the Dr. Agent repo check if the page offers it. Fix anything real it finds through a PR.
    - **Stop before the final submit.** Show Harsh the filled form and submit only when he says "yes, submit". Screenshot the confirmation.

12. **LinkedIn (ask Harsh).** Post `docs/LINKEDIN.md` exactly as its steps say: upload the MP4 itself, type each @ tag again so it links, and add the links as the first comment. Harsh may prefer to post it himself; then hand him the text.

13. **Devpost.** Open Harsh's Devpost portfolio and check whether the Kavach entry for the Diwali Festiverse hackathon shows as submitted. The hackathon has ended, so change nothing; just report what it shows.

14. **GitHub cleanup.** These branches are merged; delete them: `docs/film-2`, `docs/laptop-deploy`, `docs/linkedin-post`, `docs/laptop-runbook`, `feat/approval-ci-finale`, `feat/dashboard-redesign`, `feat/playbooks-live-referee`, plus any branch this run merged (`git push origin --delete <branch>`). Confirm no PR is open.

15. **Report to Harsh:** run IDs and their numbers, screenshot paths, what AdaL wrote, Finch links, Agent37 status, the new YouTube link, the HiDevs state (filled, waiting for his yes, or submitted), the LinkedIn post link, the Devpost status, and anything that failed.
