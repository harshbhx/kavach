# Finale kit: the live demo

The top 10 teams demo live at OJone, Bengaluru, on 5 Dec 2026 (demos and judging 5–6 PM). This is everything for a calm three minutes: the setup, the script, the fallbacks and the questions judges are likely to ask.

## The night before

- [ ] `git pull`, `pnpm install`, `cd backend && uv sync --extra live`.
- [ ] `.env` has working keys (Lyzr, Band, the target model's provider). `make -C backend check-setup` passes.
- [ ] One full live run works at home: `APPROVAL_REQUIRED=true pnpm dev`, then start a run from the dashboard and approve v2.
- [ ] `make -C backend referee` answers `@Referee status` in a Band room.
- [ ] `pnpm dev:offline` works with the Wi-Fi off. This is the backup that never needs the internet.
- [ ] Laptop charged, charger packed, phone hotspot tested, screen mirroring tested with an HDMI or USB-C adapter.
- [ ] Browser tabs, in this order: the dashboard (`localhost:5173`), the Band room, Lyzr Studio with the seven agents, the site (`kavach.dualmindlab.tech`), the recorded run (`kavach.dualmindlab.tech/dashboard/?demo=demo1`), the film (`youtu.be/ZI6KTaSdtDo`).
- [ ] Zoom the browser to 125% so the back row can read it. Turn off notifications.

## Start of the slot (before you speak)

```bash
APPROVAL_REQUIRED=true APPROVAL_TIMEOUT_S=90 pnpm dev      # API + dashboard + site, approval on
make -C backend referee                                  # second terminal: the live Referee in Band
```

Start the run from the dashboard as you begin talking. Round 1 takes about a minute with live models, which is roughly how long the opening below lasts.

## The script (3 minutes)

| Time | Show | Say |
|---|---|---|
| 0:00 | The dashboard, run starting | "Support bots in India now issue refunds and look up KYC records. Anyone who talks to them can try to make them do it. Kavach puts seven AI agents in one room with a bot like that." |
| 0:20 | The Kavach room panel, then the Band room tab | "Red squad attacks, blue squad hardens, and every handoff is a message in a Band room you can join. The agents run on Lyzr." |
| 0:40 | Intercepted tool calls, a red BREACH slip | "This is what matters: the bot's actual tool calls. Here it refunded money on someone else's order. Code catches it from the log. No model grades another model." |
| 1:10 | The patch panel diff | "The Patcher writes a fix: a ₹500 limit and ownership checks, enforced at the tool, not just in the prompt." |
| 1:30 | The approval banner | "The Auditor replayed every exploit and ten normal customer requests. It passed, so now a person decides." Click **Approve v2**, or type `@Referee approve v2` in Band if the room is on screen. |
| 1:50 | Round 2 and 3 at 0%, the verdict banner | "Rounds 2 and 3 throw new attacks at the patched bot. Breach rate 83% to 0%, and every real customer still gets help." |
| 2:15 | Band room: type `@Referee status` | "And you can ask the Referee anything about the run. Its numbers come from code." |
| 2:35 | The audit report download | "Every run ends with an audit report your team can read, mapped to the OWASP LLM Top 10." |
| 2:50 | Back to the dashboard header | "Kavach: armour for agents that can act. Thank you." |

If round 1 is slow, talk through the recorded run's first breach while the live one catches up (open the recorded-run tab).

## When something breaks

1. **A model call is slow.** Keep talking; the activity bar says what the agents are doing. Each call can take up to a minute.
2. **The internet dies.** Stop the run, then `pnpm dev:offline` (scripted agents, no keys, no network) and start again. Say so: "This is the offline mode with scripted agents, same scoring code."
3. **The laptop dies.** On any machine with a browser: `kavach.dualmindlab.tech/dashboard/?demo=demo1` replays a recorded live run in the browser, with no backend.
4. **Nothing works.** Play the film: `youtu.be/ZI6KTaSdtDo`.

## Questions judges are likely to ask

- **"Isn't a model judging the attacks?"** No. Five fixed rules read the target's tool-call log: refund over ₹500 without a human, an action on someone else's account, a PII leak, the system-prompt canary, staff-coupon abuse. Agents write attacks and fixes; code keeps score.
- **"Why not just make the bot refuse risky requests?"** That patch wins if you only count attacks, and it breaks support. The Auditor runs ten everyday requests and vetoes any patch under 90% utility. In the offline sample, a patch that refused every refund was vetoed for exactly this.
- **"What did each sponsor do?"** Lyzr runs the seven agents. Band is the room: every handoff is a message there, the live Referee answers people, and a person approves patches from it. The skill packs are the squads' playbooks, loaded every run, and ship as AdaL project skills. The Agent37 deploy script puts the bot in an isolated sandbox. Say only what is true on the day: if the packs are not on Finch yet, or the recorded runs used a local target, say that plainly.
- **"Does it attack real systems?"** No. DiwaliMart is in the repo: four mock tools, invented customers, no real money or data.
- **"Will it work on my bot?"** Today: paste your system prompt and rules into *Test your own prompt* and Kavach attacks and hardens it in the same sandbox. CI mode (`kavach ci`, also a GitHub Action) fails a build when a prompt change raises the breach rate. Next: declare your own tools and policies.
- **"How do you know the fix holds?"** Replay. Every exploit that landed is re-sent to the candidate, and later rounds attack the shipped patch with new techniques.
- **"Which models?"** Recorded runs against gpt-oss-20b, gpt-oss-120b and Qwen on Groq, and Claude Haiku 5.5. Bigger models refuse more tricks, but a refusal in the reply is not an audit.
