import { diffLines } from 'diff'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import type { TargetConfig } from '../lib/types'
import type { RunView } from '../lib/useRun'

type View = 'policy' | 'prompt'

function sortKeys(keys: string[]) {
  const num = (k: string) => {
    const m = /^v(\d+)(?:-a(\d+))?$/.exec(k)
    return m ? Number(m[1]) * 100 + (m[2] ? Number(m[2]) : 99) : 0
  }
  return [...keys].sort((a, b) => num(a) - num(b))
}

export function DiffPanel({ run }: { run: RunView }) {
  const [configs, setConfigs] = useState<Record<string, TargetConfig>>({})
  const [selected, setSelected] = useState<string>('')
  const [view, setView] = useState<View>('policy')

  useEffect(() => {
    if (!run.runId) return
    const t = setTimeout(() => {
      api
        .configs(run.runId!)
        .then((c) => {
          setConfigs(c)
          const keys = sortKeys(Object.keys(c))
          setSelected(keys[keys.length - 1] ?? '')
        })
        .catch(() => undefined)
    }, 250)
    return () => clearTimeout(t)
  }, [run.runId, run.configsVersion])

  const keys = sortKeys(Object.keys(configs))
  const base = configs['v1']
  const target = configs[selected]
  const parts = useMemo(() => {
    if (!base || !target) return []
    const a = view === 'prompt' ? base.system_prompt : JSON.stringify(base.guard_policy, null, 2)
    const b = view === 'prompt' ? target.system_prompt : JSON.stringify(target.guard_policy, null, 2)
    return diffLines(a, b)
  }, [base, target, view])

  return (
    <section className="flex min-h-0 flex-col rounded-kv border border-kv-border bg-kv-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-kv-border px-4 py-3">
        <h2 className="mr-auto text-sm font-semibold">Patch diff</h2>
        <div className="flex rounded-full bg-kv-surface-2 p-0.5 text-xs">
          {(['policy', 'prompt'] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-full px-2.5 py-1 ${view === v ? 'bg-kv-border-strong text-kv-text' : 'text-kv-muted'}`}>
              {v === 'policy' ? 'Guard policy' : 'Prompt'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 border-b border-kv-border px-4 py-2">
        {keys.length === 0 && <span className="text-xs text-kv-faint">Versions appear when the Patcher proposes a fix.</span>}
        {keys.map((k) => {
          const vetoed = run.patches.some((p) => `${p.candidate_version}-a${p.attempt}` === k && p.audit?.decision === 'veto')
          return (
            <button
              key={k}
              onClick={() => setSelected(k)}
              className={`rounded-md px-2 py-0.5 font-mono text-xs ring-1 ${selected === k ? 'bg-kv-brand-soft text-kv-text ring-kv-brand' : 'text-kv-muted ring-kv-border hover:text-kv-text'} ${vetoed ? 'line-through decoration-kv-attack' : ''}`}
              title={vetoed ? 'vetoed by the Auditor' : undefined}
            >
              {k}
            </button>
          )
        })}
      </div>
      <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[12px] leading-5">
        {selected === 'v1' && base && <span className="text-kv-muted">{view === 'prompt' ? base.system_prompt : JSON.stringify(base.guard_policy, null, 2)}</span>}
        {selected !== 'v1' &&
          parts.map((p, i) => (
            <span
              key={i}
              className={p.added ? 'block bg-kv-secure-soft text-kv-secure' : p.removed ? 'block bg-kv-attack-soft text-kv-attack line-through decoration-1' : 'block text-kv-faint'}
            >
              {p.value
                .replace(/\n$/, '')
                .split('\n')
                .map((l) => `${p.added ? '+ ' : p.removed ? '- ' : '  '}${l}`)
                .join('\n')}
            </span>
          ))}
      </pre>
      <div className="border-t border-kv-border p-3">
        <a
          href={run.reportReady && run.runId ? api.reportUrl(run.runId) : undefined}
          aria-disabled={!run.reportReady}
          className={`block rounded-kv px-3 py-2 text-center text-sm font-semibold ${run.reportReady ? 'bg-kv-brand text-white hover:bg-kv-brand-hover' : 'cursor-not-allowed bg-kv-surface-2 text-kv-faint'}`}
        >
          Export hardened prompt + audit report (.md)
        </a>
      </div>
    </section>
  )
}
