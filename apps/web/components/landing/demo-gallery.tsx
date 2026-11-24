import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cn } from '@/lib/utils';

type Demo = {
  id: string;
  title: string;
  blurb: string;
  model: string;
  rounds: number;
  attacksPerAgent: number | null;
  trend: number[];
  vetoes: number;
  utility: number | null;
  tthSeconds: number | null;
  verdict: 'hardened' | 'held' | 'breached';
};

/** The recordings behind the Demo picker (runs/gallery.json, built from the runs themselves by scripts/build_gallery.py). */
function loadGallery(): Demo[] {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), '../../runs/gallery.json'), 'utf8')) as Demo[];
  } catch {
    return [];
  }
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const modelName = (m: string) => m.replace(/^(groq|anthropic|meta)\//, '').replace(/^openai\//, '');

/** Real runs, one click each. Every number on a card is read from the recording it opens. */
export function DemoGallery() {
  const demos = loadGallery();
  if (demos.length === 0) return null;
  return (
    <div>
      <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {demos.map((d, i) => (
          <li key={d.id}>
            <a
              href={`/dashboard/?demo=${d.id}`}
              className="group flex h-full flex-col rounded-xl border border-ink/25 bg-paper-2 p-5 shadow-[0_24px_50px_-34px_rgb(14_35_28/0.4)] transition-colors hover:border-ink/60 focus-visible:ring-2 focus-visible:ring-hold focus-visible:outline-none"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[12px] tracking-[0.14em] text-ink-3 uppercase">Demo {i + 1}</span>
                <span className="font-mono text-[12px] text-ink-3">{modelName(d.model)}</span>
              </div>
              <h3 className="mt-2 font-display text-[1.45rem] leading-tight text-ink">{d.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{d.blurb}</p>
              <p className="mt-4 flex flex-wrap items-center gap-x-2 font-mono text-[15px]" aria-label="Breach rate by round">
                {d.trend.map((t, k) => (
                  <span key={k} className="flex items-center gap-2">
                    {k > 0 && <span className="text-ink-3">→</span>}
                    <b className={cn(t > 0 ? 'text-stamp' : 'text-hold')}>{pct(t)}</b>
                  </span>
                ))}
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-dashed border-ink/25 pt-3 text-[12.5px] text-ink-3">
                <div>
                  <dt>Rounds</dt>
                  <dd className="font-semibold text-ink">{d.rounds}</dd>
                </div>
                <div>
                  <dt>Utility</dt>
                  <dd className="font-semibold text-ink">{d.utility === null ? '–' : pct(d.utility)}</dd>
                </div>
                <div>
                  <dt>Hardened in</dt>
                  <dd className="font-semibold text-ink">{d.tthSeconds === null ? '–' : `${Math.round(d.tthSeconds)}s`}</dd>
                </div>
              </dl>
              <span className="mt-4 text-[14px] font-semibold text-hold underline-offset-4 group-hover:underline">Watch this run →</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-[70ch] text-[14px] text-ink-3">
        Recorded from real runs with Lyzr agents and a Band room. Nothing here is simulated, and no number is typed in by hand: each card is
        read from its own recording. The refund slip and the passbook above come from the offline sample run, and the sample is labelled as
        such wherever it plays.
      </p>
    </div>
  );
}
