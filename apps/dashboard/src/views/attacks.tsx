import { ArenaPanel } from '@/components/arena-panel'
import { Panel } from '@/components/panel'
import { TECHNIQUE_LABEL } from '@/lib/format'
import { RULE_INFO } from '@/lib/slips'
import type { RunView } from '@/lib/useRun'
import { cn } from '@/lib/utils'

/** What the red squad tried and what landed, beside every intercepted tool call. */
export function AttacksView({ run }: { run: RunView }) {
  const landed = new Map<string, string>() // attack id → rule
  for (const c of run.toolCards) if (c.kind === 'attack' && c.verdict === 'breach' && c.ruleId && !landed.has(c.ref)) landed.set(c.ref, c.ruleId)
  const attacks = Object.values(run.attacks)
  const byRule = Object.keys(RULE_INFO).map((rule) => ({
    rule,
    tried: attacks.filter((a) => a.goal === rule).length,
    landed: [...landed.values()].filter((r) => r === rule).length,
  }))
  const techniques = new Map<string, { tried: number; landed: number; squad: string }>()
  for (const a of attacks) {
    const t = techniques.get(a.technique) ?? { tried: 0, landed: 0, squad: a.agent }
    t.tried += 1
    if (landed.has(a.attack_id)) t.landed += 1
    techniques.set(a.technique, t)
  }
  const sorted = [...techniques.entries()].sort((a, b) => b[1].landed - a[1].landed || b[1].tried - a[1].tried)

  return (
    <div className="grid gap-3 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <aside className="space-y-3">
        <Panel title="By breach rule" hint={`${attacks.length} attacks, ${landed.size} landed`}>
          <ul className="divide-y divide-kv-border/70">
            {byRule.map((r) => (
              <li key={r.rule} className="flex items-start gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium text-kv-text">{RULE_INFO[r.rule].label}</span>
                  <span className="block text-[12px] text-kv-faint">{RULE_INFO[r.rule].owasp}</span>
                </span>
                <span className="text-right font-mono text-[12.5px]">
                  <span className={r.landed ? 'font-semibold text-kv-attack' : 'text-kv-faint'}>{r.landed}</span>
                  <span className="text-kv-faint"> / {r.tried}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="border-t border-kv-border px-4 py-2 text-[12px] text-kv-faint">Landed / aimed at it. Scored in code from the tool-call log.</p>
        </Panel>
        <Panel title="By technique" hint="From the attack skill pack's cards">
          {sorted.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-kv-faint">Techniques appear as the squads attack.</p>
          ) : (
            <ul className="space-y-2 px-4 py-3">
              {sorted.map(([t, v]) => (
                <li key={t}>
                  <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="text-kv-text">{TECHNIQUE_LABEL(t)}</span>
                    <span className="font-mono text-[12px] text-kv-faint">
                      {v.landed}/{v.tried}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-kv-border/70">
                    <div className={cn('h-full rounded-full', v.landed ? 'bg-kv-attack' : 'bg-kv-defend/60')} style={{ width: `${Math.max(8, (v.landed / Math.max(1, v.tried)) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </aside>
      <div className="h-[calc(100vh-11rem)] min-h-[560px] min-w-0">
        <ArenaPanel run={run} />
      </div>
    </div>
  )
}
