import { readFileSync } from 'node:fs';
import path from 'node:path';
import { AgentAvatar } from '@kavach/brand/avatar';
import { cn } from '@/lib/utils';

type Ev = { type: string; agent: string | null; t_rel_ms: number; data: Record<string, unknown> };
type Line = { who: 'referee' | 'person' | 'patcher'; name: string; text: string; tone?: 'stamp' | 'hold' | 'ok' };

/** The approval exchange from the sample run (runs/sample_approval_run.jsonl), as the Band room shows it. */
function loadThread(): Line[] {
  let events: Ev[] = [];
  try {
    events = readFileSync(path.join(process.cwd(), '../../runs/sample_approval_run.jsonl'), 'utf8')
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as Ev);
  } catch {
    return [];
  }
  const lines: Line[] = [];
  for (const ev of events) {
    const d = ev.data;
    if (ev.type === 'agent.message' && ev.agent === 'referee' && typeof d.text === 'string' && /passed the Auditor|was rejected by/.test(d.text)) {
      lines.push({ who: 'referee', name: 'Referee', text: d.text.replace(/^🔏 |^↩️ /, '').replace(/`/g, '').replace(/ \(sample\)/g, '') });
    } else if (ev.type === 'approval.decided') {
      const reject = d.decision === 'reject';
      const by = String(d.by ?? 'A reviewer').replace(' (sample)', '');
      lines.push({
        who: 'person',
        name: by,
        text: reject ? `@Referee reject ${d.version} because ${d.reason}` : `@Referee approve ${d.version}`,
        tone: reject ? 'stamp' : 'ok',
      });
    } else if (ev.type === 'patch.proposed' && Number(d.attempt) > 1 && lines.some((l) => l.tone === 'stamp')) {
      const changes = (Array.isArray(d.changelog) ? (d.changelog as string[]) : []).slice(0, 2).join('; ');
      if (!lines.some((l) => l.who === 'patcher')) lines.push({ who: 'patcher', name: 'Patcher', text: `Candidate ${d.candidate_version}, attempt ${d.attempt}${changes ? `: ${changes}` : ''}` });
    } else if (ev.type === 'patch.applied') {
      lines.push({ who: 'referee', name: 'Referee', text: `${d.version} deployed.`, tone: 'hold' });
      break;
    }
  }
  return lines;
}

export function ApprovalThread() {
  const lines = loadThread();
  if (lines.length === 0) return null;
  return (
    <figure className="rounded-xl border border-ink/25 bg-paper-2 shadow-[0_24px_50px_-30px_rgb(14_35_28/0.4)]">
      <div className="kv-band h-3 border-b border-ink/15" aria-hidden />
      <div className="flex items-center gap-2 border-b border-ink/15 px-5 py-3 text-[14px] text-ink-3">
        <span className="size-2 rounded-full bg-hold" aria-hidden /> Kavach room, Band
      </div>
      <ol className="space-y-4 px-5 py-5">
        {lines.map((l, i) => (
          <li key={i} className={cn('flex gap-3', l.who === 'person' && 'flex-row-reverse text-right')}>
            {l.who === 'person' ? (
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink font-display text-[15px] text-paper-2">{l.name[0]}</span>
            ) : (
              <AgentAvatar agent={l.who} size={40} label={l.name} />
            )}
            <div className={cn('max-w-[34rem] rounded-2xl px-4 py-2.5', l.who === 'person' ? 'rounded-tr-sm bg-ink text-paper-2' : 'rounded-tl-sm bg-paper')}>
              <p className={cn('text-[13px] font-semibold', l.who === 'person' ? 'text-paper/70' : 'text-ink-3')}>{l.name}</p>
              <p className={cn('mt-0.5 text-[15.5px] leading-relaxed', l.who !== 'person' && 'text-ink', l.tone === 'hold' && 'font-semibold text-hold')}>{l.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <figcaption className="border-t border-ink/15 px-5 py-3 text-[13.5px] text-ink-3">
        From the sample run in the repo (scripted agents, a scripted reviewer). In a live room the same replies work with <code className="font-mono">make referee</code> running.
      </figcaption>
    </figure>
  );
}
