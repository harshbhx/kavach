import { ArrowRight, FileText, Play, Presentation, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KpiStrip } from '@/components/kpi-strip'
import { Empty, Panel, Stamp } from '@/components/panel'
import { RoundRail } from '@/components/round-rail'
import { TrendPanel } from '@/components/trend-panel'
import { AGENTS, avatar, pct } from '@/lib/format'
import type { View } from '@/lib/route'
import type { AgentName } from '@/lib/types'
import { clock, markOf, verdictOf, viewFor } from '@/lib/story'
import type { RunView } from '@/lib/useRun'
import { useStickyScroll } from '@/lib/useStickyScroll'
import { cn } from '@/lib/utils'

const ROUNDS = 3

/** The run in one line: the verdict stamp, the breach trend by round and what it cost. */
function VerdictHero({ run, onView }: { run: RunView; onView: (v: View) => void }) {
  const rounds = Object.values(run.rounds).sort((a, b) => a.round - b.round)
  const verdict = verdictOf(run)
  const shipped = rounds.filter((r) => r.utility_applied != null)
  const utility = run.final?.final_utility ?? (shipped.length ? Math.min(...shipped.map((r) => r.utility_applied as number)) : null)
  const tth = rounds.find((r) => r.tth_seconds != null)?.tth_seconds ?? null
  const vetoes = run.patches.filter((p) => p.audit?.decision === 'veto').length
  const rejected = run.approvals.filter((a) => a.decided?.decision === 'reject' && a.decided.source !== 'timeout').length
  const model = run.targetModel === 'fake' ? 'a scripted target' : run.targetModel?.split('/').pop()
  const facts = [
    utility != null && `everyday requests served ${pct(utility)}`,
    tth != null && `hardened ${Math.round(tth)} s into the round`,
    `deployed ${run.deployedVersion}`,
    vetoes > 0 && `${vetoes} vetoed by the Auditor`,
    rejected > 0 && `${rejected} rejected by a person`,
  ].filter(Boolean) as string[]

  return (
    <section className="relative overflow-hidden rounded-xl border border-kv-border-strong/70 bg-kv-surface shadow-[0_18px_40px_-28px_rgb(14_35_28/0.45)]">
      <div className="kv-band h-2.5 border-b border-kv-border/80 opacity-80" aria-hidden />
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 px-5 py-4">
        <div className="min-w-0 basis-60">
          <p className="text-[12.5px] text-kv-faint">DiwaliMart Support{model ? ` on ${model}` : ''}, against seven agents</p>
          <div className="mt-1.5">{verdict ? <Stamp tone={verdict.tone} className="text-[17px]">{verdict.word}</Stamp> : <span className="text-kv-faint">Waiting for the first round</span>}</div>
        </div>
        <div className="min-w-0 flex-1 basis-72">
          <p className="text-[12.5px] text-kv-faint">Breach rate, round by round</p>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 font-mono text-[34px] leading-tight font-semibold sm:text-[40px]" aria-label={`Breach rate by round: ${rounds.map((r) => pct(r.breach_rate)).join(', ')}`}>
            {rounds.length === 0 && <span className="text-kv-faint/70">–</span>}
            {rounds.map((r, i) => (
              <span key={r.round} className="flex items-baseline gap-x-2">
                {i > 0 && <span className="text-[24px] text-kv-faint">→</span>}
                <span className={r.breach_rate > 0 ? 'text-kv-attack' : 'text-kv-secure'}>{pct(r.breach_rate)}</span>
              </span>
            ))}
            {run.status === 'running' && <span className="animate-pulse text-[24px] text-kv-faint">…</span>}
          </p>
          {facts.length > 0 && <p className="mt-1 text-[13px] text-kv-muted">{facts.join(' · ')}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onView('report')} disabled={!run.reportReady} className="border-kv-border-strong bg-kv-surface">
            <FileText className="size-4" /> Audit report
          </Button>
          <Button size="sm" onClick={() => onView('present')} className="bg-kv-text text-kv-surface hover:bg-kv-defend">
            <Presentation className="size-4" /> Present
          </Button>
        </div>
      </div>
    </section>
  )
}

/** The run's story as a ledger, oldest first, pinned to the newest line while it plays. */
function MomentsLedger({ run, onView }: { run: RunView; onView: (v: View) => void }) {
  const { box, behind, jump } = useStickyScroll(run.moments.length)
  return (
    <Panel title="What happened" hint="The run's story, in order. Select a line to open it." className="h-[min(640px,calc(100vh-12rem))]">
      {run.moments.length === 0 ? (
        <Empty icon={<ShieldCheck className="size-5" />} title="Nothing yet">
          Each breach, patch, veto, approval and round result lands here as the run plays.
        </Empty>
      ) : (
        <div ref={box} className="relative h-full overflow-y-auto">
          <ol className="divide-y divide-kv-border/70">
            {run.moments.map((m) => (
              <li key={m.seq}>
                <button
                  type="button"
                  onClick={() => onView(viewFor(m))}
                  className="grid w-full grid-cols-[3.25rem_6.5rem_1fr] items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-kv-surface-2/70"
                >
                  <span className="pt-0.5 font-mono text-[12px] text-kv-faint">{clock(m.t)}</span>
                  <span className="pt-0.5">
                    <Stamp tone={m.tone === 'neutral' ? 'defend' : m.tone} className="text-[10.5px]">
                      {markOf(m)}
                    </Stamp>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] leading-snug font-medium text-kv-text">{m.title}</span>
                    {m.detail && <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-kv-muted">{m.detail}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {behind > 0 && (
            <button type="button" onClick={jump} className="sticky bottom-3 left-1/2 mx-auto mb-3 block -translate-x-0 rounded-full bg-kv-text px-3 py-1 text-[12px] font-medium text-kv-surface shadow">
              {behind} new below
            </button>
          )}
        </div>
      )}
    </Panel>
  )
}

function Agents({ run, onView }: { run: RunView; onView: (v: View) => void }) {
  const counts = run.messages.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m.agent]: (acc[m.agent] ?? 0) + 1 }), {})
  return (
    <Panel title="The seven agents" hint="Red attacks, blue hardens, the Referee keeps score">
      <ul className="grid grid-cols-1 gap-x-4 px-4 py-2 sm:grid-cols-2">
        {(Object.keys(AGENTS) as AgentName[]).map((a) => (
          <li key={a} className="flex items-center gap-2.5 py-1.5">
            <img src={avatar(a)} alt="" className={cn('size-8 rounded-full ring-2', AGENTS[a].squad === 'red' ? 'ring-kv-attack/60' : AGENTS[a].squad === 'blue' ? 'ring-kv-defend/60' : 'ring-kv-verdict/60')} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium text-kv-text">{AGENTS[a].name}</span>
              <span className="block text-[12px] text-kv-faint">{AGENTS[a].role}</span>
            </span>
            <span className="font-mono text-[12px] text-kv-faint">{counts[a] ?? 0}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3 border-t border-kv-border px-4 py-2.5">
        <button type="button" onClick={() => onView('room')} className="inline-flex items-center gap-1 text-[13px] font-semibold text-kv-text underline-offset-4 hover:underline">
          Read the room <ArrowRight className="size-3.5" />
        </button>
        {run.bandUrl && run.mode !== 'demo' && (
          <a href={run.bandUrl} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-kv-defend underline-offset-4 hover:underline">
            Open the Band room
          </a>
        )}
      </div>
    </Panel>
  )
}

/** Before any run: what this is, and the two quickest ways to see it. */
function Welcome({ onPickDemo }: { onPickDemo?: (name: string) => void }) {
  return (
    <section className="overflow-hidden rounded-xl border border-kv-border-strong/70 bg-kv-surface">
      <div className="kv-band h-2.5 border-b border-kv-border/80" aria-hidden />
      <div className="grid gap-6 px-6 py-8 md:grid-cols-[1.4fr_1fr] md:items-center">
        <div>
          <h1 className="font-display text-[30px] leading-tight font-semibold text-kv-text sm:text-[36px]">Watch seven AI agents break a support bot, then fix it.</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-kv-muted">
            The red squad attacks DiwaliMart Support. Code reads its tool calls for breaches. The blue squad patches it, and a patch ships only if real customers still get
            help.
          </p>
          {onPickDemo && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => onPickDemo('demo1')} className="bg-kv-text text-kv-surface hover:bg-kv-defend">
                <Play className="size-4" /> Play the headline run
              </Button>
              <Button variant="outline" onClick={() => onPickDemo('approval')} className="border-kv-border-strong bg-kv-surface">
                See a person reject a patch
              </Button>
            </div>
          )}
          <p className="mt-3 text-[12.5px] text-kv-faint">Or start a live run from the top bar when the backend is running.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {(Object.keys(AGENTS) as AgentName[]).map((a) => (
            <img key={a} src={avatar(a)} alt={AGENTS[a].name} className="size-16 rounded-full bg-kv-surface-2 ring-2 ring-kv-border-strong" />
          ))}
        </div>
      </div>
    </section>
  )
}

export function OverviewView({ run, onView, onPickDemo }: { run: RunView; onView: (v: View) => void; onPickDemo?: (name: string) => void }) {
  if (!run.runId) return <Welcome onPickDemo={onPickDemo} />
  return (
    <div className="space-y-3">
      <VerdictHero run={run} onView={onView} />
      <RoundRail run={run} total={ROUNDS} />
      <KpiStrip run={run} />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <MomentsLedger run={run} onView={onView} />
        <div className="flex min-w-0 flex-col gap-3">
          <TrendPanel run={run} rounds={ROUNDS} />
          <Agents run={run} onView={onView} />
        </div>
      </div>
    </div>
  )
}
