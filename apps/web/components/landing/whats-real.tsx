const COLUMNS = [
  {
    title: 'Real on every run',
    tone: 'border-[#1f7a4d]',
    items: [
      'The five breach rules. They read the bot’s tool-call log and its reply, in code.',
      'The guard policy. Refunds, KYC lookups and coupons are checked at the tool, not in the prompt.',
      'The ten everyday requests and the 90% utility gate. A patch below it never ships.',
      'The audit report, built from the same events the dashboard shows.',
    ],
  },
  {
    title: 'Real when you add keys',
    tone: 'border-hold',
    items: [
      'Seven Lyzr agents write the attacks, the root-cause reports and the patches.',
      'Every handoff is posted to a Band room, where you can read the run as a chat.',
      'The target bot calls a real model, on your machine or in an Agent37 sandbox.',
    ],
  },
  {
    title: 'Scripted or made up',
    tone: 'border-stamp',
    items: [
      'pnpm dev:offline swaps in scripted agents and a scripted bot, so the loop runs without keys.',
      'The sample run quoted on this page is one of those offline runs. Its file is named sample_simulated_run.',
      'DiwaliMart, its customers, PANs and phone numbers are invented. No money moves.',
    ],
  },
];

/** What is real and what is not, said plainly before anyone has to ask. */
export function WhatsReal() {
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-ink/20 bg-ink/15 md:grid-cols-3">
      {COLUMNS.map((c) => (
        <section key={c.title} className="bg-paper-2 p-6">
          <h3 className={`border-l-4 pl-3 font-display text-[1.35rem] leading-tight text-ink ${c.tone}`}>{c.title}</h3>
          <ul className="mt-5 space-y-3.5">
            {c.items.map((t) => (
              <li key={t} className="text-[15.5px] leading-relaxed text-ink-2">
                {t}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
