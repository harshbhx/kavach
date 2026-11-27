import { Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { Panel, Stamp } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { loadGallery, type GalleryEntry } from '@/lib/demo'
import { groupByModel, short } from '@/lib/scoreboard'
import { pct } from '@/lib/format'

/** Which victim models broke, how badly, and how fast Kavach hardened them: every recorded live run, side by side. */
export function ModelsView({ onPlay }: { onPlay?: (id: string) => void }) {
  const [gallery, setGallery] = useState<GalleryEntry[] | null>(null)
  useEffect(() => {
    loadGallery().then(setGallery)
  }, [])
  if (gallery === null) return <p className="text-[13px] text-kv-faint">Loading the recorded runs…</p>
  const models = groupByModel(gallery)
  const chart = models.map((m) => ({ model: short(m.model), avg: Math.round(m.firstAvg * 100), max: Math.round(m.firstMax * 100) }))

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-kv-border-strong/70 bg-kv-surface px-5 py-4">
        <h1 className="font-display text-[22px] font-semibold text-kv-text">{gallery.length} recorded live runs against {models.length} victim models</h1>
        <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-kv-muted">
          Every run ended hardened or held, with everyday requests served at 90% or more. Bigger models refuse more tricks in round 1, but one clever message is enough,
          so the limits belong in code at the tool. Each number below comes from the run's own events.
        </p>
      </section>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Panel title="First breach rate by model" hint="Average across runs, in the first round that broke">
          <div className="h-72 px-2 py-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 18, right: 16, bottom: 4, left: -8 }}>
                <CartesianGrid vertical={false} stroke="var(--kv-border)" strokeDasharray="2 4" />
                <XAxis dataKey="model" tick={{ fontSize: 12, fill: 'var(--kv-muted)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: 'var(--kv-faint)' }} axisLine={false} tickLine={false} />
                <Bar dataKey="avg" fill="#c8203f" radius={[6, 6, 0, 0]} maxBarSize={56} isAnimationActive={false}>
                  <LabelList dataKey="avg" position="top" formatter={(v: unknown) => `${v}%`} style={{ fontSize: 12, fill: 'var(--kv-text)', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Scoreboard" hint="Also: uv run python -m kavach.cli scoreboard">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="text-[12px] text-kv-faint">
                <tr>
                  <th className="px-4 py-2 font-medium">Victim model</th>
                  <th className="px-2 py-2 text-right font-medium">Runs</th>
                  <th className="px-2 py-2 text-right font-medium">First breach</th>
                  <th className="px-2 py-2 text-right font-medium">Hardened</th>
                  <th className="px-2 py-2 text-right font-medium">Median time</th>
                  <th className="px-4 py-2 text-right font-medium">Utility</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.model} className="border-t border-kv-border/70">
                    <td className="px-4 py-2 font-mono text-[12.5px] text-kv-text">{short(m.model)}</td>
                    <td className="px-2 py-2 text-right font-mono">{m.runs.length}</td>
                    <td className="px-2 py-2 text-right font-mono">
                      <span className="text-kv-attack">{pct(m.firstAvg)}</span>
                      <span className="text-kv-faint"> / {pct(m.firstMax)}</span>
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-kv-secure">
                      {m.hardened} of {m.runs.length}
                    </td>
                    <td className="px-2 py-2 text-right font-mono">{m.tthMedian == null ? '–' : `${Math.round(m.tthMedian)} s`}</td>
                    <td className="px-4 py-2 text-right font-mono">{pct(m.utilityMin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-kv-border px-4 py-2 text-[12px] text-kv-faint">First breach: average / worst run. Utility: the lowest of any shipped patch.</p>
        </Panel>
      </div>
      <Panel title="The recordings" hint="Play any of them here, in your browser">
        <ul className="grid gap-px bg-kv-border/70 sm:grid-cols-2 xl:grid-cols-4">
          {gallery.map((e) => (
            <li key={e.id} className="flex flex-col gap-2 bg-kv-surface px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-semibold text-kv-text">{e.title}</p>
                <Stamp tone={e.verdict === 'breached' ? 'attack' : e.verdict === 'held' ? 'defend' : 'secure'}>{e.verdict.toUpperCase()}</Stamp>
              </div>
              <p className="font-mono text-[12px] text-kv-faint">{short(e.model)}</p>
              <p className="font-mono text-[13px]">
                {e.trend.map((b, i) => (
                  <span key={i}>
                    {i > 0 && <span className="text-kv-faint"> → </span>}
                    <span className={b > 0 ? 'text-kv-attack' : 'text-kv-secure'}>{pct(b)}</span>
                  </span>
                ))}
              </p>
              {onPlay && (
                <Button variant="outline" size="sm" className="mt-auto w-fit border-kv-border-strong bg-kv-surface" onClick={() => onPlay(e.id)}>
                  <Play className="size-3.5" /> Play
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
