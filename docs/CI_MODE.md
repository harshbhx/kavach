# CI mode

A prompt edit that reads harmlessly can reopen a hole the last patch closed. CI mode catches that before it ships: it replays every seeded attack against your bot's system prompt and guard policy, runs the benign suite, and fails the build if the breach rate rises above your baseline or fewer than 90% of everyday requests are served. It is scored in code, with the same five detectors as a full run, and no agents are involved, so a build is cheap and repeatable.

## From the command line

```bash
cd backend
# record a baseline for your config
uv run python -m kavach.cli ci --prompt ../my_prompt.md --policy ../my_policy.json \
  --baseline ../.kavach/baseline.json --update-baseline
# then on every change
uv run python -m kavach.cli ci --prompt ../my_prompt.md --policy ../my_policy.json \
  --baseline ../.kavach/baseline.json
```

| Flag | Default | What it does |
|---|---|---|
| `--prompt` | DiwaliMart v1 | The system prompt file to test. The canary line is added if it has none. |
| `--policy` | v1's policy | A guard policy JSON (the `GuardPolicy` schema in [Target bot](TARGET_BOT.md)). |
| `--baseline` | `.kavach/baseline.json` | Where the accepted numbers live. Commit it. |
| `--library` | `standard` | `standard` or `hard` (see [the attack playbook](../README.md#the-attack-playbook)). |
| `--tolerance` | `0` | How much the breach rate may rise before the build fails, e.g. `0.05`. |
| `--update-baseline` | off | Record the current numbers instead of gating. |
| `--json` | none | Also write the result and verdict as JSON. |

Exit code 0 passes, 1 fails. Inside GitHub Actions the result table is also written to the job summary.

The bot under test is whatever `TARGET_MODEL` names: `fake` for a fully offline check, or a real LiteLLM model id (with its provider key in the environment) to test a real prompt against a real model.

## As a GitHub Action

```yaml
# .github/workflows/kavach.yml in your repo
on: pull_request
jobs:
  kavach:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: harshbhx/kavach/.github/actions/kavach-ci@main
        with:
          prompt: prompts/support_bot.md
          policy: config/guard_policy.json
          baseline: .kavach/baseline.json
          target-model: groq/openai/gpt-oss-20b
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
```

Outputs: `breach-rate` and `utility`, both from 0 to 1.

## In this repo

The CI workflow runs the action on the config the blue squad shipped in the headline run (`data/ci/hardened_prompt.md` and `data/ci/hardened_policy.json`) against `data/ci/baseline.json`. Weaken that policy, for example by removing the ₹500 limit, and the build fails. Locally: `make -C backend gate`.

## What it does not do

It replays the seeded library, not freshly written attacks, so it guards against regressions rather than discovering new holes. Run a full Kavach run for that.
