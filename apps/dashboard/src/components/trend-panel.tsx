import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import type { RunView } from '@/lib/useRun'
import { Panel } from './panel'

interface Row {
  round: string
  breach: number | null
  utility: number | null
  vetoed: number | null
}

function VetoDot(props: { cx?: number; cy?: number; payload?: Row }) {
  const { cx, cy, payload } = props
  if (cx === undefined || cy === undefined || payload?.vetoed == null) return <g />
  return (
    <g>
      <circle cx={cx} cy={cy} r={6.5} fill="var(--kv-bg)" stroke="var(--kv-attack)" strokeWidth={2.5} />
      <text x={cx} y={cy + 20} textAnchor="middle" fill="var(--kv-attack)" fontSize={11} fontWeight={600}>
        vetoed
      </text>
    </g>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[11px] text-kv-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-3 rounded bg-kv-attack" /> breach
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-3 rounded bg-kv-secure" /> utility
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full border-2 border-kv-attack" /> vetoed patch
      </span>
    </div>
  )
}

/** Breach should fall to zero while utility stays above the 90% floor. */
export function TrendPanel({ run, rounds }: { run: RunView; rounds: number }) {
  const n = Math.max(rounds, ...Object.keys(run.chart).map(Number), 1)
  const rows: Row[] = Array.from({ length: n }, (_, i) => {
    const p = run.chart[i + 1]
    const veto = p?.vetoed[p.vetoed.length - 1]
    return {
      round: `Round ${i + 1}`,
      breach: p?.breach != null ? Math.round(p.breach * 100) : null,
      utility: p?.utility != null ? Math.round(p.utility * 100) : null,
      vetoed: veto?.utility != null ? Math.round(veto.utility * 100) : null,
    }
  })

  return (
    <Panel title="Security vs utility" actions={<Legend />}>
      <div className="h-52 px-1 pt-3 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 10, right: 16, left: -14, bottom: 0 }}>
            <CartesianGrid stroke="var(--kv-border)" strokeDasharray="2 5" vertical={false} />
            <XAxis dataKey="round" stroke="var(--kv-faint)" tickLine={false} axisLine={false} fontSize={11} padding={{ left: 18, right: 8 }} />
            <YAxis domain={[0, 100]} ticks={[0, 50, 100]} unit="%" stroke="var(--kv-faint)" tickLine={false} axisLine={false} fontSize={11} />
            <ReferenceLine
              y={90}
              stroke="var(--kv-secure)"
              strokeOpacity={0.45}
              strokeDasharray="5 4"
              label={{ value: '90% utility floor', position: 'insideBottomRight', fill: 'var(--kv-secure)', fontSize: 10, opacity: 0.8 }}
            />
            <Tooltip
              cursor={{ stroke: 'var(--kv-border-strong)' }}
              contentStyle={{ background: 'var(--kv-surface-2)', border: '1px solid var(--kv-border)', borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: 'var(--kv-muted)' }}
              formatter={(v, name) => [`${v}%`, name === 'breach' ? 'Breach rate' : name === 'utility' ? 'Utility, approved patch' : 'Utility, vetoed patch']}
            />
            <Line dataKey="breach" stroke="var(--kv-attack)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--kv-attack)', strokeWidth: 0 }} connectNulls isAnimationActive={false} />
            <Line
              dataKey="utility"
              stroke="var(--kv-secure)"
              strokeWidth={2.5}
              dot={{ r: 7, fill: 'none', stroke: 'var(--kv-secure)', strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
            <Scatter dataKey="vetoed" shape={<VetoDot />} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}
