import { readFileSync } from 'node:fs';
import path from 'node:path';

type Demo = { id: string; model: string; trend: number[]; utility: number | null; tthSeconds: number | null; verdict: string };

const pct = (v: number) => `${Math.round(v * 100)}%`;
const short = (m: string) => m.split('/').pop() ?? m;

/** Every recorded live run, summed up by victim model: the same numbers as `kavach scoreboard`. */
export function ModelScoreboard() {
  let demos: Demo[] = [];
  try {
    demos = JSON.parse(readFileSync(path.join(process.cwd(), '../../runs/gallery.json'), 'utf8')) as Demo[];
  } catch {
    return null;
  }
  const groups = new Map<string, Demo[]>();
  for (const d of demos) groups.set(d.model, [...(groups.get(d.model) ?? []), d]);
  const rows = [...groups.entries()]
    .map(([model, runs]) => {
      const firsts = runs.map((r) => r.trend.find((b) => b > 0) ?? 0);
      const tths = runs.map((r) => r.tthSeconds).filter((t): t is number => t != null).sort((a, b) => a - b);
      const utils = runs.map((r) => r.utility).filter((u): u is number => u != null);
      return {
        model,
        runs: runs.length,
        avg: firsts.reduce((a, b) => a + b, 0) / firsts.length,
        max: Math.max(...firsts),
        hardened: runs.filter((r) => r.verdict !== 'breached').length,
        tth: tths.length ? (tths[Math.floor((tths.length - 1) / 2)] + tths[Math.ceil((tths.length - 1) / 2)]) / 2 : null,
        util: utils.length ? Math.min(...utils) : null,
      };
    })
    .sort((a, b) => b.avg - a.avg);

  return (
    <div className="overflow-hidden rounded-xl border border-ink/25 bg-paper-2">
      <ul className="divide-y divide-ink/15">
        {rows.map((r) => (
          <li key={r.model} className="grid items-center gap-x-6 gap-y-2 px-5 py-4 md:grid-cols-[13rem_1fr_auto]">
            <div>
              <p className="font-mono text-[15px] text-ink">{short(r.model)}</p>
              <p className="text-[13px] text-ink-3">
                {r.runs} recorded run{r.runs > 1 ? 's' : ''}, {r.hardened} of {r.runs} hardened
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-stamp" style={{ width: `${Math.max(3, r.avg * 100)}%` }} />
              </div>
              <span className="w-28 font-mono text-[14px] text-stamp">
                {pct(r.avg)} <span className="text-ink-3">/ {pct(r.max)}</span>
              </span>
            </div>
            <p className="font-mono text-[13.5px] text-ink-2 md:text-right">
              {r.tth != null ? `${Math.round(r.tth)} s to harden` : '–'}, utility {r.util != null ? pct(r.util) : '–'}
            </p>
          </li>
        ))}
      </ul>
      <p className="border-t border-ink/15 px-5 py-3 text-[13.5px] text-ink-3">
        Breach rate in the first round that broke: average / worst run. Time to harden is the median. Utility is the lowest of any shipped patch.
      </p>
    </div>
  );
}
