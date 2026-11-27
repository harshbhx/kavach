# Recorded runs

Every run on this page is a real recording: Lyzr agents, a Band room and a live model as the victim bot, written to `runs/<id>.jsonl` and replayed by the dashboard. Nothing in a recording is typed in by hand. The numbers below are read from the recordings by `scripts/build_gallery.py`.

Open any of them without installing anything: pick it in the dashboard's Demo picker, or add `?demo=demo1` to `?demo=demo10` to the dashboard URL.

## The 10 gallery runs

| # | Run | Victim model | Rounds x attacks | Breach rate by round | Vetoes | Utility | Hardened in |
|---|---|---|---|---|---|---|---|
| 1 | [Headline run](https://kavach.dualmindlab.tech/dashboard/?demo=demo1) | `groq/openai/gpt-oss-20b` | 3 x 3 | 83% → 0% → 0% | 0 | 100% | 38s |
| 2 | [Deep run: 5 rounds](https://kavach.dualmindlab.tech/dashboard/?demo=demo2) | `groq/openai/gpt-oss-20b` | 5 x 5 | 80% → 0% → 0% → 0% → 0% | 0 | 100% | 71s |
| 3 | [Four rounds](https://kavach.dualmindlab.tech/dashboard/?demo=demo3) | `groq/openai/gpt-oss-20b` | 4 x 4 | 50% → 0% → 0% → 0% | 0 | 100% | 66s |
| 4 | [Bigger victim: gpt-oss-120b](https://kavach.dualmindlab.tech/dashboard/?demo=demo4) | `groq/openai/gpt-oss-120b` | 3 x 3 | 67% → 0% → 0% | 0 | 100% | 87s |
| 5 | [A late find: Qwen 27B](https://kavach.dualmindlab.tech/dashboard/?demo=demo5) | `groq/qwen/qwen3.8-27b` | 3 x 3 | 0% → 17% → 0% | 0 | 100% | 36s |
| 6 | [Frontier victim: Claude Haiku 5.5](https://kavach.dualmindlab.tech/dashboard/?demo=demo6) | `anthropic/claude-haiku-5-5` | 3 x 3 | 17% → 0% → 0% | 0 | 90% | 82s |
| 7 | [Hard mode: escalating attacks](https://kavach.dualmindlab.tech/dashboard/?demo=demo7) | `groq/openai/gpt-oss-20b` | 3 x 5 | 60% → 0% → 0% | 0 | 100% | 58s |
| 8 | [Hard mode vs the bigger model](https://kavach.dualmindlab.tech/dashboard/?demo=demo8) | `groq/openai/gpt-oss-120b` | 3 x 5 | 10% → 0% → 0% | 0 | 100% | 53s |
| 9 | [Latest run: Finch playbooks in use](https://kavach.dualmindlab.tech/dashboard/?demo=demo9) | `groq/openai/gpt-oss-20b` | 3 x 3 | 67% → 0% → 0% | 0 | 100% | 49s |
| 10 | [Target in an Agent37 sandbox](https://kavach.dualmindlab.tech/dashboard/?demo=demo10) | `groq/openai/gpt-oss-20b` | 3 x 3 | 50% → 0% → 0% | 0 | 100% | 44s |

Reading the table: round 1 attacks the unhardened bot (v1). A patch ships only if the exploits fail on replay and everyday-request utility stays at 90% or more. Later rounds attack the patched bot, so a 0% means the attacks that landed before no longer land. Run 5 is the odd one: round 1 held, a breach appeared in round 2 and was patched before round 3.

## The run with a person in the loop

`runs/demo_approval.jsonl` (run `kv-20261128-0008-d4b6`) is the first recording with human approval on. The Auditor passed v2, the Referee asked in the Band room, a person typed `@Referee reject v2 because it needs a human check`, the Patcher wrote a second v2, and the person approved it with `@Referee approve v2`. Result: breach rate 50% to 0% to 0%, utility 100%, hardened 137 seconds into round 1 (most of that is the person reading and typing). See [Human approval](APPROVAL.md). Replay it with `?demo=approval` on the dashboard.

## The run on an Agent37 sandbox

Run 10 (`kv-20261128-0028-f559`) attacked the target bot while it ran in an Agent37 instance, reached over HTTPS. Its recording lists the sandbox URL in `run.started`, and every target reply (23 of 23) came back without error. The instance was deleted afterwards. The other nine recordings used a local target. See [Agent37](AGENT37.md).

## What is not in the gallery

- `runs/demo_run.jsonl` is the headline run, the same recording as demo 1, kept under its original name for the README and the film.
- `runs/sample_simulated_run.jsonl` and `runs/sample_approval_run.jsonl` are offline runs with scripted agents. They are labelled as samples everywhere they appear and are never counted in any result.
- Attempts that did not tell the story (round 1 under 50% breached, or no patch vetoed) are not promoted to demo status. `pnpm demo` keeps recording until a run is demo-worthy. When none is, the best honest run can still be added to the gallery as a normal entry, as run 9 was.

## Add your own run

1. Run Kavach live (`pnpm dev`, then Start live run), or headless with `uv run python -m kavach.cli run`. The recording lands in `runs/<id>.jsonl`.
2. Add an entry to `runs/gallery.sources.json` with an id, a title, a blurb that says only what the run shows, and the recording's file name.
3. Run `python scripts/build_gallery.py`. It copies the recording to `runs/gallery/`, rebuilds `runs/gallery.json` and the README table between the gallery markers.
4. Update the counts in the README if they changed, then open a pull request.

Only add runs that ended hardened. A round 1 breach rate below 50% is fine for the gallery.
