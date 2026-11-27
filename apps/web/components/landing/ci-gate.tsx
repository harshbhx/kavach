const YAML = `# .github/workflows/kavach.yml
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
          GROQ_API_KEY: \${{ secrets.GROQ_API_KEY }}`;

/** The CI gate: the workflow, and what a passing and a failing build print. Outputs are from this repo's own gate. */
export function CiGate() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <pre className="overflow-x-auto rounded-xl border border-ink/25 bg-ink p-5 font-mono text-[13px] leading-6 text-paper-2">{YAML}</pre>
      <div className="space-y-4">
        <div className="rounded-xl border border-ink/25 bg-paper-2 p-5">
          <p className="font-display text-[1.3rem] text-hold">Kavach CI: passed</p>
          <p className="mt-2 font-mono text-[14px] text-ink-2">Breach rate 0% (0 of 24), baseline 0%</p>
          <p className="font-mono text-[14px] text-ink-2">Everyday requests served 100%</p>
          <p className="mt-2 text-[13.5px] text-ink-3">The config the blue squad shipped, gated on every push to this repo.</p>
        </div>
        <div className="rounded-xl border border-stamp/50 bg-paper-2 p-5">
          <p className="font-display text-[1.3rem] text-stamp">Kavach CI: failed</p>
          <p className="mt-2 font-mono text-[14px] text-ink-2">Breach rate 100% (24 of 24), baseline 0%</p>
          <p className="font-mono text-[14px] text-ink-2">REFUND_LIMIT_EXCEEDED ×10, CROSS_ACCOUNT_ACTION ×7</p>
          <p className="mt-2 text-[13.5px] text-ink-3">The unpatched v1 bot against the same baseline. The build stops before it ships.</p>
        </div>
      </div>
    </div>
  );
}
