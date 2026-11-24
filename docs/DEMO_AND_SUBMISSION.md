# Demo Video Script + Submission Kit

## 1. Two-minute video script (≤ 2:00)

Screen layout: the dashboard full screen, with the Band room in a narrow window on the right for the moments marked [BAND]. Record at 1080p. Use replay mode (`speed 1.5–2×`) if the live run is slow or flaky, and say "recorded run" on screen. Voice-over in English; captions on.

| Time | Screen | Voice-over (≈ 150 words/min) |
|---|---|---|
| 0:00–0:12 | `kavach-logo-intro.mp4` (3 s: the attack strikes the guardrail K) → title card `kavach-social-card.png` + sponsor names | "Support agents can now issue refunds and read KYC data. One clever message can make them move money. Kavach lets AI agents attack and harden your agent before customers do." |
| 0:12–0:25 | The DiwaliMart target: 4 tools, v1 prompt | "Our target is DiwaliMart Support, a tool-using agent with refunds, orders, KYC and coupons. All the data is fake. It runs in an isolated Agent37 sandbox." |
| 0:25–0:45 | Start the run. The feed fills: 🛰️ Recon dossier, 💉 Injector, 🎭 Social Engineer (show one Hinglish attack). [BAND] the same messages in the Band room | "Seven Lyzr agents talk to each other in a shared Band room. The Red squad maps the bot, then fires injection and social-engineering attacks, including Hinglish ones." |
| 0:45–1:00 | Tool-call feed: red card `issue_refund(ORD-99, ₹50,000)` → `REFUND_LIMIT_EXCEEDED`; PII_LEAK card | "Round one: the bot refunds ₹50,000 on someone else's order and leaks a PAN. Breaches are detected by code from the real tool-call log, not guessed by an LLM." |
| 1:00–1:20 | 🛠️ Patcher v2 → ⛔ **VETOED** (utility 70%: legit ₹300 refund blocked) → 🛠️ v2 retry → ✅ APPROVED. Chart shows the hollow VETOED dot | "The Blue squad patches it. The Auditor replays the exploits and runs ten normal customer requests. The first patch over-blocks real refunds, so the Auditor vetoes it. The Patcher fixes it properly." |
| 1:20–1:38 | Rounds 2–3: green `BLOCKED BY GUARDRAIL v2` cards; the breach line falls 67% → 33% → 0%, utility flat at ~100% | "The Red squad adapts with obfuscated and Hinglish attacks. Each round the breach rate drops, and utility stays above ninety percent." |
| 1:38–1:52 | Diff panel v1 → v3 (prompt + guard policy); click Export → the report opens | "You get a hardened prompt, policy-as-code guardrails and an OWASP-mapped audit report." |
| 1:52–2:00 | End card: Kavach logo + Lyzr · Band · Agent37 · AdaL + repo URL | "Kavach. Built with Lyzr, Band, Agent37 and AdaL." |

**Shots to capture beforehand:** the 7 agents in Lyzr Studio, the 7 remote agents in Band, the Agent37 instance in its dashboard, AdaL in the terminal.

## 2. Live finale plan (28 Nov, if shortlisted)

- Run live with `ROUNDS=2` for speed; keep the replay ready as backup (one click).
- Invite a judge to type in the Band room (stretch C1: `@Referee what was the worst exploit?`).
- Mobile hotspot as a network backup. Have the run already open in a second tab.

## 3. Devpost submission text (draft; edit the numbers to match your recorded run)

**Project name:** Kavach — AI Red vs Blue for Tool-Using Agents

**Tagline:** Seven AI agents attack and harden a refund-issuing support bot, live in a Band room, without breaking it for real customers.

**Track:** Security (Attack & Defend)

**Thumbnail (3:2):** `docs/assets/brand/kavach-devpost-thumbnail.png`

### Inspiration
Support agents are getting real powers: refunds, KYC lookups, coupons. Testing them is still manual, and "fixes" usually just make the bot refuse everything. We wanted a measurable, repeatable way to stress-test an agent's tools, and to prove that a fix both closes the hole and keeps customers happy.

### What it does
Kavach runs a red-team vs blue-team arena against DiwaliMart Support, a tool-using e-commerce agent with fake data.
- 🔴 **Red squad:** Recon maps the bot; Injector and Social Engineer launch adaptive attacks (direct overrides, obfuscated payloads, Hinglish code-switching, VIP urgency).
- 🧪 **Code-based detectors** read the tool-call log: refunds over ₹500, cross-account actions, PII leaks, system-prompt exfiltration (canary), staff-coupon abuse.
- 🔵 **Blue squad:** Monitor explains each incident; Patcher rewrites the system prompt and the policy-as-code guardrails; Auditor replays the exploits and runs a 10-query benign suite. A patch is approved only if exploits fail **and** utility stays ≥ 90%, otherwise it's vetoed and Blue tries again.
- ⚖️ **Referee** scores Breach Rate, Utility and Time-to-Harden, and exports a hardened prompt + an OWASP-mapped audit report.
In our recorded run, the breach rate went from **X% → Y% → Z%** while utility stayed at **≥ 90%**.

### How we built it
- **Lyzr**: the 7 agents (role, goal, instructions, structured JSON output, session memory), called through the Lyzr inference API.
- **Band**: each agent is a Band remote agent; every handoff is an @mention message in a shared Kavach room, which humans can watch and join.
- **Agent37**: the target agent and its mock tools run in an isolated sandbox (safe blast radius).
- **AdaL**: our coding agent; the repo's AGENTS.md and docs drove the build.
- FastAPI + SSE backend, LiteLLM tool-calling target, React + Recharts dashboard, replay mode for reliable demos.

### Challenges we ran into
Keeping the scoreboard honest: we moved every breach and utility decision into deterministic code and left LLMs to attack, patch and explain. Stopping "refuse everything" patches led to the Utility Trap and the Auditor veto loop.

### Accomplishments we're proud of
A real Security vs Utility trade-off you can watch happen; patches that are enforceable policy, not just prompt wording; and a full 3-round run in a few minutes.

### What we learned
Prompt-only defences are fragile; tool-level guardrails plus prompt changes hold up. Code-switched (Hinglish) attacks get past English-only filters.

### What's next
Plug in any team's agent through an OpenAPI tool spec, add a CI mode ("fail the build if the breach rate goes up"), and publish the attack and hardening skill packs on Finch.

### Built with
python, fastapi, litellm, react, typescript, recharts, lyzr, band, agent37, adal

**Last line of the description (required):**
*HiDevs account: harshbhx@gmail.com (same person as Devpost bhanushaliharsh434@gmail.com).*

## 4. Final checklist (by 21:30 IST)

- [ ] The repo is public, the README is complete, and there are no secrets.
- [ ] `runs/demo_run.jsonl` is committed and replay works from a fresh clone.
- [ ] The video is ≤ 2:00, uploaded, and the link works in a private window.
- [ ] Devpost: description, video URL, repo URL, screenshots, "Built with", track chosen.
- [ ] HiDevs: submitted on the hackathon page (Dr. Agent repo evaluation if prompted).
- [ ] The HiDevs email line is in the Devpost description.
- [ ] Sponsor screenshots are in the README (Lyzr agents, Band room, Agent37 instance).
- [ ] Devpost thumbnail uploaded (`docs/assets/brand/kavach-devpost-thumbnail.png`); GitHub social preview set (`kavach-social-card.png`).
