# YouTube and Devpost copy for the film

## Title (pick one)

1. Kavach: seven AI agents attack and harden a support bot that can issue refunds
2. Kavach: red vs blue AI agents that keep your support bot safe and useful
3. Your support bot can issue refunds. So can anyone who talks to it. (Kavach demo)

## Description

Your support bot can issue refunds. So can anyone who talks to it.

Kavach puts seven AI agents in one room to attack and harden DiwaliMart Support, a tool-using support bot with fake data. Red (Recon, Injector, Social Engineer) attacks it with prompt injection, fake authority and Hinglish pressure. Blue (Monitor, Patcher, Auditor) explains each breach, rewrites the prompt and the guard policy, and replays every exploit. The Referee keeps score.

Two things make it different:
- Breaches are read from the bot's real tool calls by code. No model grades itself.
- A patch ships only if the exploits stop and at least 90% of normal customer requests still work. Patches that block real customers are vetoed.

Built for Diwali Festiverse: The Agent-to-Agent Hackathon (India Edition), Security track, with Lyzr (the agents), Band (the room they talk in), Agent37 (the sandbox) and Cloudflare (the site).

Code: https://github.com/harshbhx/kavach
Live site and recorded run: <your Cloudflare link>/dashboard/?demo=sample
Docs: <your Cloudflare link>/docs

0:00 The problem
0:24 Kavach
0:31 Seven agents, one room
0:44 The loop: attack, detect, patch, audit
0:58 The utility trap
1:12 A real run on the dashboard
1:36 Results
1:46 Built with

Built by Harsh Bhanushali, DualMind Labs.

## Tags

kavach, ai agents, agent to agent, multi agent, llm security, prompt injection, ai red teaming, guardrails, ai safety, support bot, lyzr, band, agent37, cloudflare, hackathon, devpost, india

## Thumbnail

`docs/assets/brand/kavach-devpost-thumbnail.png` (1200×800). For YouTube use the 1280×720 crop: `ffmpeg -i kavach-devpost-thumbnail.png -vf "scale=1280:-1,crop=1280:720" kavach-youtube-thumbnail.png`.

## Visibility

Unlisted is fine for Devpost. Turn comments off if you like; leave embedding on, or Devpost can't play it.
