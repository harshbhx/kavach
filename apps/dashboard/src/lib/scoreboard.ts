import type { GalleryEntry } from './demo'

export interface ModelRow {
  model: string
  runs: GalleryEntry[]
  firstAvg: number
  firstMax: number
  hardened: number
  tthMedian: number | null
  utilityMin: number | null
}

export const short = (m: string) => m.split('/').pop() ?? m
const first = (e: GalleryEntry) => e.trend.find((b) => b > 0) ?? 0
const median = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}

/** The same numbers as `kavach scoreboard` (backend/kavach/scoreboard.py), from the recordings bundled with the build. */
export function groupByModel(entries: GalleryEntry[]): ModelRow[] {
  const groups = new Map<string, GalleryEntry[]>()
  for (const e of entries) groups.set(e.model, [...(groups.get(e.model) ?? []), e])
  return [...groups.entries()]
    .map(([model, runs]) => {
      const firsts = runs.map(first)
      const utils = runs.map((r) => r.utility).filter((u): u is number => u != null)
      return {
        model,
        runs,
        firstAvg: firsts.reduce((a, b) => a + b, 0) / firsts.length,
        firstMax: Math.max(...firsts),
        hardened: runs.filter((r) => r.verdict !== 'breached').length,
        tthMedian: median(runs.map((r) => r.tthSeconds).filter((t): t is number => t != null)),
        utilityMin: utils.length ? Math.min(...utils) : null,
      }
    })
    .sort((a, b) => b.firstAvg - a.firstAvg)
}

