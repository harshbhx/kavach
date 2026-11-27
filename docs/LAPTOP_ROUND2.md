# Laptop prompt: round 2 (before 2 Dec 2026)

Paste the block below into Harsh's laptop agent as one message. It covers only what needs his machine, keys or accounts; everything else is already in the repo.

```text
Kavach round 2. The HiDevs deadline is now 2 Dec 2026, 10 PM IST. Repo: github.com/harshbhx/kavach. Read AGENTS.md, then do these in order and keep a short log of every number and link you see.

Rules: commits as Harsh Bhanushali <bhanushaliharsh434@gmail.com>, no AI trailers, work through an issue → branch → PR → squash merge, leave no PR open. Never print or commit keys (.env, agent_config.yaml). Ask Harsh before any login, key, wallet, payment or anything public.

1. Update: git pull, pnpm install, cd backend && uv sync --extra live && make check. Expect all tests to pass.

2. Fresh live run with the new features: run `pnpm demo` with the real keys. The new run records which skill packs it used. If it is a good run (round 1 breached, then hardened, utility ≥ 90%), let the script fill the README results as before and promote it as the dashboard demo (`uv run python -m kavach.promote_demo` if the demo script doesn't). Keep the old demo runs.

3. Live Referee: in one terminal `pnpm dev`, in another `make -C backend referee`. In the run's Band room, type `@Referee status`, then `@Referee breaches`. Screenshot the Referee's answers.

4. Patch approval: stop, then `APPROVAL_REQUIRED=true APPROVAL_TIMEOUT_S=300 pnpm dev` and keep `make -C backend referee` running. Start a live run from the dashboard. When the Referee asks in Band, type `@Referee reject v2 because it needs a human check`, then approve the next attempt with `@Referee approve v2`. Screenshot the Band exchange and the dashboard's yellow approval banner. Save this run's JSONL as runs/demo_approval.jsonl (it is the first recorded run with a person in the loop).

5. Screenshots (3:2, light UI, no keys or emails visible): the seven agents in Lyzr Studio, the Band room from step 3, the approval exchange from step 4, the dashboard header showing "playbooks: attack pack 1.1.0 and hardening pack 1.1.0". Save them in docs/assets/gallery/ with clear names.

6. AdaL, for real: install the AdaL CLI (npm install -g @sylphai/adal-cli), open it in the repo, and ask it to use the owasp-llm-attack-pack skill in .adal/skills to write five new Hinglish attack messages for data/attack_library_hard.json (round 2, social), following the existing format. Review its output, run make check, and commit it as "feat(attacks): five Hinglish attacks written by AdaL with the attack skill pack". Note in docs/SPONSORS.md §4 exactly what AdaL did.

7. With Harsh only (his wallet): publish both skill packs to Finch using the commands in docs/SPONSORS.md §5. Put the two Finch links in README.md (sponsor table) and docs/HIDEVS.md (Finch answer).

8. Only if Harsh says yes to Agent37: AGENT37_API_KEY=... ./scripts/deploy_target_agent37.sh, set TARGET_URL and TARGET_EXTRA_HEADERS as it prints, record one live run, then update the Agent37 lines in README.md, docs/SPONSORS.md and docs/HIDEVS.md to say it was deployed and recorded. Delete the instance afterwards (./scripts/deploy_target_agent37.sh delete <id>).

9. Ship: one PR with the new runs, screenshots, attacks and doc updates; wait for CI (backend, CI gate, web) to pass; squash merge. The site redeploys on its own.

10. Send Harsh the log: run IDs and their numbers, screenshot paths, what AdaL wrote, Finch links if any, Agent37 status, and anything that failed.
```
