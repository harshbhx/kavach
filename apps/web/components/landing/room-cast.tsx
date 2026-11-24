'use client';

import { AgentAvatar } from '@kavach/brand/avatar';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { AGENTS, SQUAD } from './agents-data';

const TURN_MS = 4200;

/**
 * The room: seven agents who take turns through one round, each handing off with an @mention, like the Band room in a run.
 * It plays by itself (not under reduced motion), pauses when you click an agent or hover the strip, and every agent is a button.
 */
export function RoomCast() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [calm, setCalm] = useState(true);

  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setCalm(q.matches);
    sync();
    q.addEventListener('change', sync);
    return () => q.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (paused || calm) return;
    const t = setInterval(() => setActive((i) => (i + 1) % AGENTS.length), TURN_MS);
    return () => clearInterval(t);
  }, [paused, calm]);

  const a = AGENTS[active];
  const next = AGENTS[(active + 1) % AGENTS.length];
  const s = SQUAD[a.squad];

  return (
    <div
      className="overflow-hidden rounded-xl border border-ink/25 bg-paper-2 shadow-[0_24px_50px_-30px_rgb(14_35_28/0.4)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink/20 px-6 py-4">
        <p className="font-display text-xl text-ink">The room, round 1</p>
        <p className="text-sm text-ink-3">{calm ? 'Pick an agent to hear it' : paused ? 'Paused while you look' : 'Playing the sample run'}</p>
      </div>

      <div role="group" aria-label="The seven agents" className="grid grid-cols-4 gap-x-2 gap-y-4 px-4 pt-6 pb-4 sm:grid-cols-7">
        {AGENTS.map((g, i) => {
          const on = i === active;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                setActive(i);
                setPaused(true);
              }}
              aria-pressed={on}
              aria-label={`${g.name}, ${SQUAD[g.squad].label}`}
              className={cn(
                'group flex flex-col items-center gap-2 rounded-xl px-1 pt-3 pb-2 outline-none transition-colors',
                'focus-visible:ring-2 focus-visible:ring-hold',
                on ? 'bg-paper-3' : 'hover:bg-paper-3/60',
              )}
            >
              <AgentAvatar agent={g.id} size={68} expression={on ? 'talking' : 'idle'} className={cn('origin-bottom transition-transform duration-300', on && 'scale-110')} />
              <span className={cn('text-[13.5px] font-semibold', on ? 'text-ink' : 'text-ink-2')}>{g.name}</span>
              <span className={cn('h-1 w-6 rounded-full transition-opacity', SQUAD[g.squad].rule, on ? 'opacity-100' : 'opacity-30')} aria-hidden />
            </button>
          );
        })}
      </div>

      <div className="border-t border-dashed border-ink/30 px-6 py-5" aria-live={paused || calm ? 'polite' : 'off'}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[17px] font-semibold text-ink">{a.name}</span>
          <span className={cn('text-[13px] font-semibold', s.ink)}>{s.label}</span>
          <span className="text-[14px] text-ink-3">{a.job}</span>
        </div>
        <p key={a.id} className="kv-bubble mt-2 max-w-[70ch] text-[17px] leading-relaxed text-ink">
          “{a.says}”
        </p>
        <p className="mt-2 font-mono text-[13px] text-ink-3">
          hands off to @{next.name.replace(' ', '')} <span aria-hidden>→</span>
        </p>
      </div>
    </div>
  );
}
