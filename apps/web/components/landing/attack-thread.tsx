import { THREAD_LINES } from './round-data';

function Run() {
  return (
    <div className="flex shrink-0 items-center gap-10 pr-10">
      {THREAD_LINES.map((line) => (
        <span key={line} className="flex shrink-0 items-center gap-10">
          <span lang="hi" className="font-display text-[2.6rem] leading-none font-semibold text-guilloche md:text-[3.4rem]">
            कवच
          </span>
          <span className="relative whitespace-nowrap font-display text-[1.7rem] leading-none text-ink/80 md:text-[2.2rem]">
            “{line}”
            <span
              className="kv-ink absolute -top-5 -right-3 -rotate-6 rounded border-2 border-hold bg-paper/70 px-1.5 py-0.5 font-display text-[12px] leading-none font-bold tracking-[0.12em] text-hold"
              style={{ boxShadow: 'inset 0 0 0 1px currentColor' }}
            >
              HELD
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * A security thread, scaled up: real lines the attackers sent in the sample run, each stamped as held by the shipped patch.
 * Decorative, so screen readers get one sentence instead. It stops under reduced motion.
 */
export function AttackThread() {
  return (
    <section aria-label="Attacks the shipped patch held" className="relative overflow-hidden border-y border-ink/15 bg-paper-2/70 py-8">
      <p className="sr-only">Lines the attackers sent in the sample run, all held by the shipped patch: {THREAD_LINES.join('; ')}.</p>
      <div aria-hidden className="kv-thread flex w-max">
        <Run />
        <Run />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-linear-to-r from-paper to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-linear-to-l from-paper to-transparent" />
    </section>
  );
}
