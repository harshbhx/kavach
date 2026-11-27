import { Download, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Empty, Panel, Stamp } from '@/components/panel'
import { api } from '@/lib/api'
import { Markdown } from '@/lib/markdown'
import { RULE_INFO } from '@/lib/slips'
import type { TargetConfig } from '@/lib/types'
import type { RunView } from '@/lib/useRun'

type DemoData = () => { configs: Record<string, TargetConfig>; reportMd: string | null } | null

const OWASP: [string, string][] = [
  ['LLM01', 'Prompt injection'],
  ['LLM02', 'Sensitive information disclosure'],
  ['LLM06', 'Excessive agency'],
  ['LLM07', 'System prompt leakage'],
]

/** OWASP LLM Top 10 coverage for this run: what was attempted, what landed, and whether the last round held. */
function Coverage({ run }: { run: RunView }) {
  const landed = new Map<string, string>()
  for (const c of run.toolCards) if (c.kind === 'attack' && c.verdict === 'breach' && c.ruleId && !landed.has(c.ref)) landed.set(c.ref, c.ruleId)
  const attacks = Object.values(run.attacks)
  const rows = OWASP.map(([id, name]) => {
    const rules = Object.entries(RULE_INFO).filter(([, v]) => v.owasp.startsWith(id)).map(([k]) => k)
    const tried = id === 'LLM01' ? attacks.length : attacks.filter((a) => rules.includes(a.goal)).length
    const hit = id === 'LLM01' ? landed.size : [...landed.values()].filter((r) => rules.includes(r)).length
    return { id, name, tried, hit }
  })
  const rounds = Object.values(run.rounds).sort((a, b) => a.round - b.round)
  const holding = rounds.length > 0 && rounds[rounds.length - 1].breach_rate === 0
  return (
    <Panel title="OWASP LLM Top 10 coverage" hint="Every attack is a prompt-injection attempt (LLM01)">
      <table className="w-full text-left text-[13px]">
        <thead className="text-[12px] text-kv-faint">
          <tr>
            <th className="px-4 py-2 font-medium">Risk</th>
            <th className="px-2 py-2 text-right font-medium">Tried</th>
            <th className="px-2 py-2 text-right font-medium">Landed</th>
            <th className="px-4 py-2 font-medium">Now</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-kv-border/70">
              <td className="px-4 py-2">
                <span className="font-mono text-[12px] text-kv-faint">{r.id}</span> <span className="text-kv-text">{r.name}</span>
              </td>
              <td className="px-2 py-2 text-right font-mono">{r.tried}</td>
              <td className={`px-2 py-2 text-right font-mono ${r.hit ? 'font-semibold text-kv-attack' : 'text-kv-faint'}`}>{r.hit}</td>
              <td className="px-4 py-2">
                {r.tried === 0 ? <span className="text-kv-faint">–</span> : r.hit === 0 ? <Stamp tone="defend">HELD</Stamp> : holding ? <Stamp tone="secure">FIXED</Stamp> : <Stamp tone="attack">OPEN</Stamp>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

/** The audit report, rendered as a document, with the coverage beside it. */
export function ReportView({ run, demoData }: { run: RunView; demoData?: DemoData }) {
  const [fetched, setFetched] = useState<{ runId: string; md: string | null; error: string | null } | null>(null)

  // A live run's report comes from the API once it's ready; a recording carries its own.
  useEffect(() => {
    if (run.mode === 'demo' || !run.reportReady || !run.runId) return
    let alive = true
    const id = run.runId
    fetch(api.reportUrl(id))
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((t) => alive && setFetched({ runId: id, md: t, error: null }))
      .catch((e) => alive && setFetched({ runId: id, md: null, error: String(e) }))
    return () => {
      alive = false
    }
  }, [run.reportReady, run.runId, run.mode])

  const md = !run.reportReady ? null : run.mode === 'demo' ? (demoData?.()?.reportMd ?? null) : fetched?.runId === run.runId ? fetched.md : null
  const error = fetched?.runId === run.runId ? fetched.error : null

  const href = md ? URL.createObjectURL(new Blob([md], { type: 'text/markdown' })) : undefined
  useEffect(() => () => (href ? URL.revokeObjectURL(href) : undefined), [href])

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="min-w-0 overflow-hidden rounded-xl border border-kv-border-strong/70 bg-[#f8fbf9] shadow-[0_18px_40px_-28px_rgb(14_35_28/0.45)]">
        <div className="kv-band h-2.5 border-b border-kv-border/80" aria-hidden />
        <div className="flex flex-wrap items-center gap-3 border-b border-kv-border px-6 py-3">
          <FileText className="size-4 text-kv-faint" />
          <h2 className="flex-1 font-display text-[17px] text-kv-text">Audit report</h2>
          {href && (
            <a href={href} download={`kavach-report-${run.runId ?? 'run'}.md`} className="inline-flex items-center gap-1.5 rounded-lg bg-kv-text px-3 py-1.5 text-[13px] font-semibold text-kv-surface hover:bg-kv-defend">
              <Download className="size-4" /> Download
            </a>
          )}
        </div>
        <div className="mx-auto max-w-[52rem] px-6 py-6 sm:px-10">
          {md ? (
            <Markdown source={md} />
          ) : (
            <Empty icon={<FileText className="size-5" />} title={error ? 'Could not load the report' : 'The report is written when the run ends'}>
              {error ? 'The Kavach API did not return the report. Try again in a moment.' : 'It sums up every round, every breach by OWASP risk and every patch, from the run’s own events.'}
            </Empty>
          )}
        </div>
      </section>
      <aside className="space-y-3">
        <Coverage run={run} />
      </aside>
    </div>
  )
}
