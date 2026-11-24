import { diffLines } from 'diff'
import { Download, GitCompareArrows } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BorderBeam } from '@/components/ui/border-beam'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { api } from '@/lib/api'
import type { TargetConfig } from '@/lib/types'
import type { RunView } from '@/lib/useRun'
import { cn } from '@/lib/utils'
import { Empty, Panel } from './panel'

type View = 'policy' | 'prompt'

function order(k: string) {
  const m = /^v(\d+)(?:-a(\d+))?$/.exec(k)
  return m ? Number(m[1]) * 100 + (m[2] ? Number(m[2]) : 99) : 0
}

function text(c: TargetConfig, view: View) {
  return view === 'prompt' ? c.system_prompt : JSON.stringify(c.guard_policy, null, 2)
}

/** What the Patcher changed, version by version, against the original v1. */
export function PatchPanel({ run }: { run: RunView }) {
  const [configs, setConfigs] = useState<Record<string, TargetConfig>>({})
  const [selected, setSelected] = useState('')
  const [view, setView] = useState<View>('policy')

  useEffect(() => {
    if (!run.runId) return
    const t = setTimeout(() => {
      api
        .configs(run.runId!)
        .then((c) => {
          setConfigs(c)
          const keys = Object.keys(c).sort((a, b) => order(a) - order(b))
          setSelected(keys[keys.length - 1] ?? '')
        })
        .catch(() => undefined)
    }, 250)
    return () => clearTimeout(t)
  }, [run.runId, run.configsVersion])

  const keys = Object.keys(configs).sort((a, b) => order(a) - order(b))
  const base = configs.v1
  const target = configs[selected]
  const parts = useMemo(() => (base && target && selected !== 'v1' ? diffLines(text(base, view), text(target, view)) : []), [base, target, selected, view])
  const added = parts.filter((p) => p.added).reduce((n, p) => n + (p.count ?? 0), 0)
  const removed = parts.filter((p) => p.removed).reduce((n, p) => n + (p.count ?? 0), 0)

  return (
    <Panel
      title="Patches"
      hint="Each candidate, diffed against v1"
      className="h-full"
      bodyClassName="flex flex-col"
      actions={
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList className="h-8 bg-kv-bg/70">
            <TabsTrigger value="policy" className="text-xs">
              Guard policy
            </TabsTrigger>
            <TabsTrigger value="prompt" className="text-xs">
              Prompt
            </TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      {keys.length <= 1 ? (
        <Empty icon={<GitCompareArrows className="size-5" />} title="No patches yet">
          When the first breach lands, the Patcher proposes a new prompt and guard policy. The diff shows up here.
        </Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5 border-b border-kv-border/80 px-4 py-2">
            {keys.map((k) => {
              const p = run.patches.find((x) => `${x.candidate_version}-a${x.attempt}` === k)
              const vetoed = p?.audit?.decision === 'veto'
              const deployed = k === run.deployedVersion
              const chip = (
                <button
                  key={k}
                  onClick={() => setSelected(k)}
                  className={cn(
                    'rounded-md px-2 py-0.5 font-mono text-[11.5px] ring-1 transition-colors',
                    selected === k ? 'bg-kv-brand-soft text-kv-text ring-kv-brand' : 'text-kv-muted ring-kv-border hover:text-kv-text',
                    vetoed && 'text-kv-attack/80 line-through decoration-kv-attack',
                    deployed && selected !== k && 'text-kv-secure ring-kv-secure/40',
                  )}
                >
                  {k}
                </button>
              )
              return vetoed ? (
                <Tooltip key={k}>
                  <TooltipTrigger asChild>{chip}</TooltipTrigger>
                  <TooltipContent className="max-w-64">Vetoed: {p?.audit?.reasons?.[0] ?? 'utility below 90%'}</TooltipContent>
                </Tooltip>
              ) : (
                chip
              )
            })}
            {selected !== 'v1' && parts.length > 0 && (
              <span className="ml-auto font-mono text-[11px]">
                <span className="text-kv-secure">+{added}</span> <span className="text-kv-attack">−{removed}</span>
              </span>
            )}
          </div>
          <pre className="min-h-0 flex-1 overflow-auto py-2 font-mono text-[11.5px] leading-5">
            {selected === 'v1' && base && <span className="block px-4 text-kv-muted">{text(base, view)}</span>}
            {parts.map((p, i) =>
              p.value
                .replace(/\n$/, '')
                .split('\n')
                .map((line, j) => (
                  <span
                    key={`${i}-${j}`}
                    className={cn(
                      'block px-4',
                      p.added && 'bg-kv-secure-soft text-kv-secure',
                      p.removed && 'bg-kv-attack-soft text-kv-attack/90',
                      !p.added && !p.removed && 'text-kv-faint',
                    )}
                  >
                    <span className="mr-2 inline-block w-3 select-none opacity-70">{p.added ? '+' : p.removed ? '−' : ' '}</span>
                    {line}
                  </span>
                )),
            )}
          </pre>
        </>
      )}
      <div className="relative border-t border-kv-border/80 p-3">
        <a
          href={run.reportReady && run.runId ? api.reportUrl(run.runId) : undefined}
          aria-disabled={!run.reportReady}
          className={cn(
            'relative flex items-center justify-center gap-2 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
            run.reportReady ? 'bg-kv-brand text-white hover:bg-kv-brand-hover' : 'pointer-events-none bg-kv-surface-2 text-kv-faint',
          )}
        >
          <Download className="size-4" />
          {run.reportReady ? 'Download the audit report' : 'Audit report is ready when the run ends'}
          {run.reportReady && <BorderBeam size={70} duration={5} colorFrom="#ffffff" colorTo="#22d3ee" />}
        </a>
      </div>
    </Panel>
  )
}
