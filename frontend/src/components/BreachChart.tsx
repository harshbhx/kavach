import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import type { ChartPoint } from '../lib/useRun'

interface Row {
  round: string
  breach: number | null
  utility: number | null
  vetoed?: number | null
  vetoNote?: string
}

function VetoDot(props: { cx?: number; cy?: number; payload?: Row }) {
  const { cx, cy, payload } = props
  if (cx === undefined || cy === undefined || payload?.vetoed == null) return <g />
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="var(--kv-bg)" stroke="var(--kv-attack)" strokeWidth={2.5} />
      <text x={cx + 11} y={cy + 4} fill="var(--kv-attack)" fontSize={11} fontWeight={700}>
        VETOED
      </text>
    </g>
  )
}

export function BreachChart({ points, rounds }: { points: Record<number, ChartPoint>; rounds: number }) {
  const rows: Row[] = []
  const n = Math.max(rounds, ...Object.keys(points).map(Number), 1)
  for (let r = 1; r <= n; r++) {
    const p = points[r]
    const veto = p?.vetoed[p.vetoed.length - 1]
    rows.push({
      round: `R${r}`,
      breach: p?.breach != null ? Math.round(p.breach * 100) : null,
      utility: p?.utility != null ? Math.round(p.utility * 100) : null,
      vetoed: veto?.utility != null ? Math.round(veto.utility * 100) : null,
      vetoNote: veto?.reasons?.[0],
    })
  }

  return (
    <section className="rounded-kv border border-kv-border bg-kv-surface">
      <div className="flex items-center justify-between border-b border-kv-border px-4 py-3">
        <h2 className="text-sm font-semibold">Security vs utility</h2>
        <span className="text-xs text-kv-faint">breach should fall · utility must stay ≥ 90%</span>
      </div>
      <div className="h-56 px-2 pt-3 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 56, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="var(--kv-border)" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="round" stroke="var(--kv-faint)" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 90, 100]} unit="%" stroke="var(--kv-faint)" tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip
              contentStyle={{ background: 'var(--kv-surface-2)', border: '1px solid var(--kv-border)', borderRadius: 10, fontSize: 12 }}
              formatter={(v, name) => [`${v}%`, name]}
              labelStyle={{ color: 'var(--kv-muted)' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
            <Line name="Breach rate" dataKey="breach" stroke="var(--kv-attack)" strokeWidth={3} dot={{ r: 5, fill: 'var(--kv-attack)', strokeWidth: 0 }} connectNulls animationDuration={500} />
            <Line
              name="Utility (approved patch)"
              dataKey="utility"
              stroke="var(--kv-secure)"
              strokeWidth={3}
              dot={{ r: 9, fill: 'none', stroke: 'var(--kv-secure)', strokeWidth: 2.5 }}
              connectNulls
              animationDuration={500}
            />
            <Scatter name="Vetoed patch" dataKey="vetoed" fill="var(--kv-attack)" shape={<VetoDot />} legendType="circle" isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
