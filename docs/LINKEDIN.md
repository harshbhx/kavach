# LinkedIn post

Post this once the site is deployed and the 1:59 film is on YouTube, so every link shows the new dashboard. Post before the HiDevs deadline (2 Dec 2026, 10:00 PM IST).

## Before posting

1. Deploy the site (`pnpm deploy:site`, step 9b in `LAPTOP_ROUND2.md`). Until then the `?demo=approval` link below doesn't work.
2. Upload `kavach-film-2.mp4` to YouTube with the copy in `film/YOUTUBE.md`, and put its link in the first comment below.

## How to post

1. Start a post and upload `kavach-film-2.mp4` itself, not the YouTube link. A video uploaded to LinkedIn plays in the feed. Use the thumbnail as the cover if LinkedIn offers one.
2. Paste the post text. Then delete each `@Name` and type it again, choosing the company page from the list that appears. Pasted `@` text doesn't tag anyone. If a company doesn't appear, leave its name without the `@`.
3. If HiDevs announced an official hashtag for the hackathon, add it.
4. Post, then add the first comment with the links straight away.
5. Reply to comments in the first hour or two.
6. Copy the post's link. Add it to the HiDevs form if there is a field for it, and share it in the HiDevs community.

Only change a number if a newer recorded run changes it. The packs are not published on Finch (that needs a signing wallet), and AdaL was not run. Keep the post's wording as it is; if that changes before you post, update the line that names them.

## Post text

```text
My support bot replied "I'm sorry, but I can't share that information."
Its tool call to pull another customer's KYC record had already run.

A chatbot can say no and still do the damage. So for the HiDevs Diwali Festiverse Agent-to-Agent Hackathon I built Kavach (कवच, "armour"): seven AI agents that attack a support bot, fix it, and prove the fix works.

How it works:
• A red squad attacks the bot with prompt injection and social engineering, in English and Hinglish
• Code, not another AI, checks every tool call against five rules mapped to the OWASP LLM Top 10
• A blue squad rewrites the bot's prompt and guard policy, then replays every attack plus everyday customer requests
• A fix ships only if the attacks stop and real customers still get help. With approval on, a person signs off from the Band room

Headline run: breach rate 83% → 0%, 100% of everyday customer requests still served, first fix shipped 38 seconds in. 11 recorded runs on 4 models, and all of them ended hardened.

It also runs as a GitHub Action that fails the build if a prompt change lets attacks back in.

Built with @Lyzr (all seven agents) and @Band (the room where agents and people talk). The attack and hardening playbooks are skill packs in the Finch skill format, and they ship as AdaL project skills in the repo. Agent37 ran the target bot once in a sandbox. Thanks to @HiDevs for running it.

Demo, code and the 2-minute film are in the first comment.

#AIAgents #AISecurity #PromptInjection #LLMSecurity #BuildInPublic
```

## First comment

```text
Links:
• Live demo, no install (replays a recorded run): https://kavach.dualmindlab.tech/dashboard/?demo=demo1
• A person rejects one fix, then approves the next: https://kavach.dualmindlab.tech/dashboard/?demo=approval
• Code: https://github.com/harshbhx/kavach
• 2-minute film: <YouTube link>
```

## Why post it

- It doesn't change the score: the judging criterion is sponsor tool integration.
- Prizes go per sponsor stack, and a post that tags Lyzr, Band, Finch and AdaL puts Kavach in front of the teams that use those tools. Sponsors often reshare posts that tag them.
- HiDevs has given social media awards in other hackathons (HiDevs × Mastra had Top 10 Social Media Awards). Check the hackathon page or community for one here.
- It's public proof of the work that stays up after the hackathon ends.
