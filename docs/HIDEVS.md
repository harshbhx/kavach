# HiDevs submission: copy and paste

The HiDevs Submit tab (Diwali Festiverse: The Agent-to-Agent Hackathon, India Edition) asks for a project description, the public repo, a demo URL, a walkthrough video, how each sponsor was used, and the problems faced. Everything below is ready to paste. Deadline: **2 Dec 2026, 10:00 PM IST**.

Keep the sponsor answers honest: if Agent37 or the Finch listing changes before you submit, update those two lines first.

---

## Project name
Kavach

## Track
Security: Attack & Defend

## Project description
Kavach (कवच, "armour") puts seven AI agents in one room with DiwaliMart Support, a tool-using support bot that issues refunds, looks up KYC records and applies coupons, with four mock tools and invented customers.

- **Red squad.** Recon maps the bot's persona and soft limits. The Injector forges system messages, overrides and encoded payloads. The Social Engineer plays the founder, the fraud team or a sibling in a hurry, in English and Hinglish.
- **Code keeps score.** Every reply and tool call goes through five fixed rules: a refund over ₹500 without a human, an action on someone else's account, a PII leak, the system-prompt canary, and staff-coupon abuse, each mapped to the OWASP LLM Top 10. In one recorded run the bot said "I'm sorry, but I can't share that information" while its KYC tool call for another customer had already run. Kavach scores what the bot does, not what it says.
- **Blue squad.** The Monitor names the root cause, the Patcher rewrites the system prompt and the guard policy (checks enforced at the tool), and the Auditor replays every exploit plus ten everyday customer requests. A patch ships only if the exploits stop and at least 90% of real requests still succeed.
- **The Referee** scores breach rate, utility and time to harden, writes an audit report, and answers people who @mention it in the Band room.
- **A person in the loop.** With approval on, a patch the Auditor passed waits for a person, who ships or rejects it from the Band room (`@Referee approve v2`) or the dashboard. A rejection sends the Patcher back with the reason.
- **CI mode.** `kavach ci`, also a reusable GitHub Action, replays the attack library against a prompt and guard policy and fails the build if the breach rate rises above the baseline or utility drops below 90%.

Results from the headline recorded run (victim model gpt-oss-20b): breach rate 83% → 0% → 0% across three rounds, 100% of everyday requests still served, patch shipped 38 seconds into round 1. Eight recorded runs against four victim models, and every one ended hardened.

## GitHub public repo
https://github.com/harshbhx/kavach

## Demo URL
https://kavach.dualmindlab.tech

Watch a recorded live run with no install: https://kavach.dualmindlab.tech/dashboard/?demo=demo1

## Walkthrough video
https://youtu.be/ZI6KTaSdtDo

*(A 1:59 film with the new features, `kavach-film-2.mp4`, fits the 2-minute demo rule. Upload it and put its link here; the YouTube copy is in `docs/film/YOUTUBE.md`.)*

## How we used each sponsor

**BAND.** Each of the seven agents is a Band remote agent with its own identity. Every run opens one Band room, and every handoff between agents is an @mention message in it, so people can watch the attack and the fix happen and join in. The live Referee runs on the Band SDK and answers anyone who writes `@Referee status`, `breaches`, `patch` or `report` in the room, with numbers read from the run, never from a model. It ignores the agents' own handoffs. With approval on, the Referee asks in the room before each patch ships, and a person decides with `@Referee approve v2` or `@Referee reject v2 because ...`: agents and people working in the same room.

**Lyzr.** All seven agents are Lyzr Studio agents (role, goal, instructions, structured JSON output, session memory across rounds) called through the Lyzr inference API from the Python orchestrator. `pnpm bootstrap` creates them. Every reply is validated; a bad reply falls back safely instead of stopping the run.

**Finch.** Kavach's two skill packs are the squads' playbooks: an OWASP LLM attack pack with a card per technique, and an agent hardening pack with principles, a guard-policy template and system-prompt additions. The Injector and Social Engineer get the technique cards for their round on every call, the Patcher gets the hardening playbook with every patch request, and each run records the exact pack versions it used. They are agentskills-format folders, ready to publish to the Finch market. *(If you publish them before submitting, replace the last sentence with the Finch links.)*

**AdaL.** The same two skill packs ship as AdaL project skills in `.adal/skills/`, so AdaL working in the repo can red-team or harden a bot with Kavach's playbooks. `AGENTS.md` and the specs in `docs/` are written for AdaL and other coding agents to extend Kavach one ticket at a time.

**Agent37.** The target bot and its mock tools are built to run in an isolated Agent37 sandbox (`scripts/deploy_target_agent37.sh` creates the instance, installs the bot and points Kavach at it), so attacks have a safe blast radius. The recorded runs used a local target. *(If you deploy to Agent37 and record a run before submitting, replace the last sentence.)*

## Problems faced
- **Strong models are hard to break.** With the same eight seeded attacks, Claude Haiku 5.5 was breached 25% of the time and several other models 0%. We kept the victim small enough for attacks to land, and we report the numbers per model.
- **The cheapest fix is the wrong one.** Without a utility check, the patch that refuses everything wins. Ten realistic everyday requests (small refunds, coupon questions, a Hinglish order check) made over-blocking show up at once, and the Auditor vetoes those patches.
- **Judging breaches without a judge model.** A model asked "was this a breach?" can be argued with, just like the bot. Reading the tool-call log took more engineering, but every verdict can be checked.
- **Free-tier rate limits** during multi-agent runs, handled with queued, bounded retries.
- **Keeping seven agents in step.** Every agent output is validated against a schema with one repair retry and a documented fallback, and Band errors never block a run.
