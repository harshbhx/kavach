'use client';

import { AgentAvatar } from '@kavach/brand/avatar';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { BUILDS, type Build, CASES, type Outcome } from './round-data';

const ease = [0.16, 1, 0.3, 1] as const;

function Sender({ from, size = 36 }: { from: (typeof CASES)[number]['from']; size?: number }) {
  if (from === 'customer') {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className="grid shrink-0 place-items-center rounded-full border-2 border-[#1f7a4d]/70 bg-paper text-[12px] font-bold text-[#1f7a4d]"
      >
        AS
      </span>
    );
  }
  return <AgentAvatar agent={from} size={size} />;
}

function CallLine({ o }: { o: Outcome }) {
  if (o.status === 'filter') {
    return (
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[13px] text-ink-3">no tool call</span>
        <span className="rounded-md bg-hold-soft px-2 py-0.5 font-mono text-[12.5px] text-hold">stopped before the model by {o.by}</span>
      </div>
    );
  }
  if (o.status === 'none') {
    return <span className="font-mono text-[13px] text-ink-3">no tool call, reply checked by the output rules</span>;
  }
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <code className="min-w-0 font-mono text-[13.5px] break-words text-ink">{o.call}</code>
      {o.status === 'executed' ? (
        <span className="rounded-md bg-stamp-soft px-2 py-0.5 font-mono text-[12.5px] font-semibold text-stamp">executed</span>
      ) : (
        <span className="rounded-md bg-hold-soft px-2 py-0.5 font-mono text-[12.5px] text-hold">refused by {o.by}</span>
      )}
    </div>
  );
}

function Verdict({ o, build }: { o: Outcome; build: Build }) {
  const tone = {
    breach: 'border-stamp text-stamp',
    refused: 'border-stamp text-stamp',
    held: 'border-hold text-hold',
    helped: 'border-[#1f7a4d] text-[#1f7a4d]',
  }[o.verdict];
  const word = { breach: 'BREACH', refused: 'REFUSED', held: 'HELD', helped: 'HELPED' }[o.verdict];
  const line = {
    breach: `${o.findings?.length ?? 0} ${o.findings?.length === 1 ? 'rule' : 'rules'} broken, caught from the tool-call log`,
    refused: 'A real customer turned away. Utility fell to 70%, so the Auditor vetoed this patch.',
    held: build === 'draft' ? 'Held, but this build also refused three real customers.' : 'The attack got nowhere and nothing ran.',
    helped: 'Customer helped, inside the ₹500 limit, on his own order.',
  }[o.verdict];
  return (
    <div className="flex flex-col items-start gap-x-5 gap-y-3 sm:flex-row sm:items-center">
      <span
        className={cn('kv-ink shrink-0 -rotate-3 rounded-md border-[3px] px-3 py-0.5 font-display text-[1.7rem] leading-tight font-bold tracking-[0.08em] [font-stretch:85%]', tone)}
        style={{ boxShadow: 'inset 0 0 0 1.5px currentColor' }}
      >
        {word}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug text-ink-2">{line}</p>
        {o.findings && (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {o.findings.map((f) => (
              <li key={f.rule} className="max-w-full rounded border border-stamp/35 px-1.5 py-0.5 font-mono text-[11.5px] break-words text-stamp">
                {f.rule} <span className="text-ink-3">{f.owasp}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Pick a message the bot received in the sample run and see what each build of the bot did with it:
 * the bot as found, the first patch (which the Auditor threw out) and the patch that shipped.
 */
export function AttackConsole() {
  const [pick, setPick] = useState(0);
  const [build, setBuild] = useState<Build>('v1');
  const calm = useReducedMotion();
  const c = CASES[pick];
  const o = c.outcomes[build];
  const note = BUILDS.find((b) => b.id === build)?.note;

  return (
    <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
      <fieldset className="min-w-0">
        <legend className="mb-3 text-[15px] font-semibold text-ink">Pick a message</legend>
        <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {CASES.map((k, i) => {
            const on = i === pick;
            return (
              <button
                key={k.id}
                type="button"
                aria-pressed={on}
                onClick={() => setPick(i)}
                className={cn(
                  'flex w-[17rem] shrink-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left outline-none transition-colors lg:w-auto',
                  'focus-visible:ring-2 focus-visible:ring-hold',
                  on ? 'border-ink bg-paper-2 shadow-[0_10px_24px_-18px_rgb(14_35_28/0.5)]' : 'border-ink/20 hover:border-ink/45 hover:bg-paper-2/60',
                  k.from === 'customer' && 'lg:mt-3',
                )}
              >
                <Sender from={k.from} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-ink">{k.title}</span>
                  <span className={cn('block truncate text-[13px]', k.from === 'customer' ? 'text-[#1f7a4d]' : 'text-ink-3')}>{k.goal}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="min-w-0 overflow-hidden rounded-xl border border-ink/25 bg-paper-2 shadow-[0_24px_50px_-30px_rgb(14_35_28/0.4)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/20 px-5 py-3">
          <div>
            <p className="font-display text-lg leading-tight text-ink">DiwaliMart Support</p>
            <p className="text-[13px] text-ink-3">Diya, logged in as Aarav Shah (U-101)</p>
          </div>
          <div role="group" aria-label="Which build of the bot" className="grid w-full grid-cols-3 rounded-lg border border-ink/25 bg-paper p-0.5 sm:flex sm:w-auto">
            {BUILDS.map((b) => (
              <button
                key={b.id}
                type="button"
                aria-pressed={build === b.id}
                onClick={() => setBuild(b.id)}
                className={cn(
                  'rounded-md px-2 py-1.5 text-[13px] font-semibold whitespace-nowrap outline-none sm:px-3 sm:text-[13.5px] transition-colors focus-visible:ring-2 focus-visible:ring-hold',
                  build === b.id ? 'bg-ink text-paper-2' : 'text-ink-2 hover:text-ink',
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
        <p className="border-b border-dashed border-ink/25 bg-paper/60 px-5 py-2 text-[13.5px] text-ink-2">{note}</p>

        <div className="space-y-5 px-5 py-6">
          {/* the message, right-aligned like a chat */}
          <div className="ml-auto flex max-w-[44rem] items-start justify-end gap-3">
            <div className="min-w-0">
              <p className="mb-1 text-right text-[12.5px] text-ink-3">Sent by {c.sender}</p>
              <p className="rounded-2xl rounded-tr-sm border border-ink/25 bg-paper px-4 py-3 text-[15.5px] leading-relaxed text-ink">{c.message}</p>
            </div>
            <Sender from={c.from} size={34} />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${c.id}-${build}`}
              initial={calm ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease } }}
              exit={calm ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
              className="space-y-5"
            >
              <div className="rounded-lg border border-dashed border-ink/30 px-4 py-3">
                <p className="mb-1.5 text-[12.5px] text-ink-3">What the bot tried, from Kavach’s tool-call log</p>
                <CallLine o={o} />
              </div>

              <div className="flex max-w-[44rem] items-start gap-3">
                <span aria-hidden className="grid size-[34px] shrink-0 place-items-center rounded-full bg-ink font-display text-[15px] text-paper-2">
                  D
                </span>
                <div className="min-w-0">
                  <p className="mb-1 text-[12.5px] text-ink-3">Diya replied</p>
                  <p
                    className={cn(
                      'rounded-2xl rounded-tl-sm bg-paper-3 px-4 py-3 text-[15.5px] leading-relaxed whitespace-pre-line text-ink',
                      o.verdict === 'breach' && 'ring-1 ring-stamp/40',
                    )}
                  >
                    {o.reply}
                  </p>
                </div>
              </div>

              <div className="border-t border-ink/15 pt-5">
                <Verdict o={o} build={build} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
