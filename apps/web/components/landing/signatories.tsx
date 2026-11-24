import { AgentAvatar } from '@kavach/brand/avatar';
import { cn } from '@/lib/utils';
import { AGENTS, SQUAD } from './agents-data';

/** A bank's specimen signature card, for the seven agents in the room. */
export function Signatories() {
  return (
    <div className="overflow-hidden rounded-xl border border-ink/25 bg-paper-2 shadow-[0_24px_50px_-30px_rgb(14_35_28/0.4)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink/20 px-6 py-4">
        <p className="font-display text-xl text-ink">Specimen signatures, Kavach room</p>
        <p className="text-sm text-ink-3">Each agent posts as itself on Band and @mentions the next one</p>
      </div>
      <ul>
        {AGENTS.map((a, i) => {
          const s = SQUAD[a.squad];
          const firstOfSquad = i === 0 || AGENTS[i - 1].squad !== a.squad;
          return (
            <li
              key={a.id}
              className={cn('grid gap-x-6 gap-y-1 px-6 py-4 md:grid-cols-[13rem_10rem_1fr]', !firstOfSquad && 'border-t border-rule/80', firstOfSquad && i > 0 && 'border-t-2 border-ink/25')}
            >
              <div className="flex items-center gap-3">
                <AgentAvatar agent={a.id} size={52} />
                <div>
                  <p className="text-[17px] font-semibold text-ink">{a.name}</p>
                  <p className={cn('text-[13px]', s.ink)}>{s.label}</p>
                </div>
              </div>
              <p className="self-center font-sign text-[2.1rem] leading-none text-ink/80" aria-hidden>
                {a.name}
              </p>
              <div className="self-center">
                <p className="text-[14px] text-ink-2">{a.job}</p>
                <p className="mt-0.5 text-[15px] leading-relaxed text-ink">“{a.says}”</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
