# YouTube copy for the film

The current film is 1:59 (`kavach-film-2.mp4`): it fits HiDevs' 2-minute demo rule. The first upload (2:24) is https://youtu.be/ZI6KTaSdtDo.

## Title

```
Kavach: 7 AI agents attack and harden a support bot | Agent-to-Agent Hackathon
```

## Description

```
Kavach (कवच, "armour") is a red-team and blue-team arena for AI agents that can act. Seven AI agents attack a customer support bot, catch every breach from its tool calls, patch it, and prove the patch still helps real customers. A person signs off before a patch ships.

THE PROBLEM
Support bots now call real tools like refunds and KYC lookups. In a recorded run, one prompt injection made DiwaliMart's bot refund ₹1,000 on another customer's order, above the ₹500 limit that needs a human. In another, the bot said "I can't share that information" while its KYC tool call ran anyway. Kavach scores what the bot does, not what it says.

HOW IT WORKS
Seven agents run on Lyzr and talk in a Band room:
• Red squad: Recon maps the bot, the Injector injects, the Social Engineer persuades, using the attack skill pack's technique cards
• The Referee keeps score and answers people in the room
• Blue squad: the Monitor explains each breach, the Patcher writes the fix from the hardening skill pack, the Auditor tests it

Every round: Attack → Detect → Patch → Audit
• Code catches breaches by reading the tool-call log. No model gets a say.
• A patch ships only if the exploits stop and at least 90% of everyday requests are still served.
• With approval on, a person ships or rejects each patch from the Band room (@Referee approve v2) or the dashboard.

RESULTS (headline run, recorded live, victim model gpt-oss-20b)
• Breach rate, rounds 1 to 3: 83% → 0% → 0%
• Everyday requests still served: 100%
• Time to harden: 38 s
• 11 recorded runs against 4 victim models, every one hardened

KEEP IT FIXED
kavach ci, also a GitHub Action, replays the attack library against your prompt and guard policy and fails the build if the breach rate rises.

The utility gate and the approval scenes come from offline sample runs with scripted agents, and are labelled on screen.

LINKS
Live site: https://kavach.dualmindlab.tech
Watch a recorded run: https://kavach.dualmindlab.tech/dashboard/?demo=demo1
Docs: https://kavach.dualmindlab.tech/docs
Source code: https://github.com/harshbhx/kavach

CHAPTERS
0:00 The problem: a bot that acts
0:17 Kavach: seven agents, one room
0:35 The loop: attack, detect, patch, audit
0:45 The dashboard, view by view
1:03 The utility gate (offline sample)
1:14 A person signs off in Band (offline sample)
1:27 Results
1:38 The CI gate, and links

Built with Lyzr (the seven agents), Band (the room, and your sign-off) and Cloudflare (the site and the recorded runs).
Built by Harsh Bhanushali for Diwali Festiverse: The Agent-to-Agent Hackathon (India Edition) by HiDevs, Security track.

#AIAgents #AISecurity #PromptInjection
```

## Tags

```
Kavach, AI agent security, prompt injection, AI red teaming, LLM security, multi-agent system, agent to agent, human in the loop, Lyzr, Band, Cloudflare, guardrails, OWASP LLM Top 10, CI, GitHub Actions, customer support bot, gpt-oss, HiDevs, Diwali Festiverse, hackathon
```

Chapters are at least 10 seconds each, so YouTube shows them.
