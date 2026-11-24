# Demo Video Script + Submission Kit

## 1. The two-minute video

**The motion-graphics film** is fully planned in [`docs/film/`](./film/README.md): script, voiceover, brief and stills of the current UI. Saying "start motion" to Claude builds it. The quick screen-recorded cut below still works as a fallback.

**Made for you:** `pnpm --filter @kavach/web video` films the site and a run on the dashboard with captions and writes `runs/video/kavach-demo.mp4` (1080p, 30 fps, about a minute; start the site first with `pnpm --filter @kavach/web build && pnpm --filter @kavach/web start`). It plays `runs/demo_run.jsonl` when you have recorded one with `pnpm demo`, otherwise the offline sample (and says so on screen). Upload it to YouTube as unlisted.

What it shows, in order:

| Time | Screen | Caption |
|---|---|---|
| 0:00–0:04 | Title card: the Kavach mark | Seven AI agents attack and harden a support bot that can move money |
| 0:04–0:14 | The landing page: the refund slip gets stamped PAID, then HELD on guardrail v2 | In the offline sample, one message makes the scripted bot refund ₹54,999 on someone else's order. (Live runs breached with refunds of ₹700 to ₹10,000.) |
| 0:14–0:53 | The dashboard runs three rounds: Recon's dossier, the attacks, breaches caught by code, the approved patch, rounds 2 and 3 holding (the offline sample also shows a vetoed patch) | One plain sentence per moment, from the dashboard's presenter captions |
| 0:53–0:58 | End card: repo URL and sponsors | Breaches caught by code. Patches that keep customers served. |

**If you want a voice-over**, read the captions, or slow the run with `--speed 1` for a longer cut (still well under 2:00). For the live Lyzr and Band story, add 5–10 s of the Band room with the agents' @mention messages (screen-record it during `pnpm demo`) after the dashboard part.

**Shots worth capturing for the README and Devpost gallery:** the 7 agents in Lyzr Studio, the Kavach room in Band, the target in Agent37 if you deploy it there.

## 2. Live finale plan (28 Nov, if shortlisted)

- Run live with `ROUNDS=2` for speed; keep the replay ready as backup (one click).
- Humans can read and post in the Kavach room in Band, but no agent reacts to them yet: a live Referee that answers questions (stretch C1) is not built.
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
In our recorded run, the breach rate went **<!-- breach-story:start -->83% → 0% → 0%<!-- breach-story:end -->** across three rounds while utility stayed at **90% or more**.

### How we built it
- **Lyzr**: the 7 agents (role, goal, instructions, structured JSON output, session memory), called through the Lyzr inference API.
- **Band**: each agent is a Band remote agent; every handoff is an @mention message in a shared Kavach room, which humans can watch and join.
- **Agent37**: a deploy script (`scripts/deploy_target_agent37.sh`) is included, but the target is not deployed there; the recorded runs used a local target.
- **AdaL**: the repo is set up for it (`AGENTS.md` and `docs/` are its instructions). Whether AdaL was used on the project is unconfirmed: keep this line only if it was.
- FastAPI + SSE backend, LiteLLM tool-calling target, a React dashboard (shadcn/ui, Magic UI, React Bits, Aceternity, Recharts) and a Next.js + Fumadocs site with an in-browser replay of a recorded run.

### Challenges we ran into
Keeping the scoreboard honest: we moved every breach and utility decision into deterministic code and left LLMs to attack, patch and explain. Stopping "refuse everything" patches led to the Utility Trap and the Auditor veto loop.

### Accomplishments we're proud of
A real Security vs Utility trade-off you can watch happen; patches that are enforceable policy, not just prompt wording; and a full 3-round run in a few minutes.

### What we learned
Prompt-only defences are fragile; tool-level guardrails plus prompt changes hold up. Code-switched (Hinglish) attacks get past English-only filters.

### What's next
Plug in any team's agent through an OpenAPI tool spec, add a CI mode ("fail the build if the breach rate goes up"), and publish the attack and hardening skill packs on Finch.

### Built with
python, fastapi, litellm, uv, react, typescript, vite, tailwindcss, shadcn-ui, recharts, next.js, fumadocs, turborepo, cloudflare-workers, lyzr, band

**Last line of the description (required):**
*HiDevs account: harshbhx@gmail.com (same person as Devpost bhanushaliharsh434@gmail.com).*

## 4. Final checklist (by 21:30 IST)

- [ ] The repo is public, the README is complete, and there are no secrets.
- [ ] `runs/demo_run.jsonl` is committed (`pnpm demo` fills the README results and the numbers above) and replay works from a fresh clone.
- [ ] The video is ≤ 2:00, uploaded, and the link works in a private window.
- [ ] The site is live on Cloudflare at https://kavach.dualmindlab.tech (*Actions → Deploy site*, after adding `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`); `/dashboard/?demo=live` plays the recorded run. Use that link as Devpost's "Try it out".
- [ ] Devpost: description, video URL, repo URL, live site URL (https://kavach.dualmindlab.tech), screenshots, "Built with", track chosen.
- [ ] HiDevs: submitted on the hackathon page (Dr. Agent repo evaluation if prompted).
- [ ] The HiDevs email line is in the Devpost description.
- [ ] The organizers know the two emails are one person (Devpost Support's advice, 24 Nov): send the message under "Linking the two registrations" below through **Email the hackathon manager** at the bottom of the sidebar on the Devpost hackathon's Overview page.
- [ ] Sponsor screenshots are in the README (Lyzr agents, Band room; an Agent37 instance only if it gets deployed).
- [ ] Devpost thumbnail uploaded (`docs/assets/brand/kavach-devpost-thumbnail.png`); GitHub social preview set (`kavach-social-card.png`).


## Linking the two registrations

Devpost registered Harsh as bhanushaliharsh434@gmail.com and HiDevs (Google sign-in only) as harshbhx@gmail.com, the renamed address of the same Google account. Devpost Support can't link them and asked him to tell the organizers. Send this through **Email the hackathon manager** (Devpost hackathon page, Overview, bottom of the sidebar), logged in to Devpost:

**Subject:** Same participant on Devpost and HiDevs: bhanushaliharsh434@gmail.com and harshbhx@gmail.com

> Hi Diwali Festiverse team,
>
> I'm Harsh Bhanushali, registered for Diwali Festiverse: The Agent-to-Agent Hackathon (India Edition).
>
> My Devpost account uses bhanushaliharsh434@gmail.com. I later renamed that Google account to harshbhx@gmail.com, and because HiDevs only allows Google sign-in, my HiDevs registration is under harshbhx@gmail.com. Both addresses are the same Google account and the same person. I can't change my Devpost email because other things are linked to it.
>
> Devpost Support asked me to tell you directly. Could you please treat the two as one registration? My project is Kavach (https://github.com/harshbhx/kavach), and I'm submitting it today on both platforms.
>
> Thanks,
> Harsh Bhanushali

Also put the same line in the HiDevs submission's description: *Devpost account: bhanushaliharsh434@gmail.com (same person as this HiDevs account).*
