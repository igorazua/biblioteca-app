import { useMemo } from 'react'
import { computeCompareOverview, type CompareOverviewData, type PlannedDuel } from '@biblioteca/core'
import { useStore } from '../../store'

/** `useCompareOverview` de la PWA (lib/compareOverview.ts): la función pura vive en core, el hook aquí. */
export function useCompareOverview(): CompareOverviewData {
  const entries = useStore((s) => s.entries)
  const rankings = useStore((s) => s.rankings)
  const duels = useStore((s) => s.duels)
  const lastCompared = useStore((s) => s.lastCompared)
  return useMemo(() => computeCompareOverview(entries, rankings, duels, lastCompared), [entries, rankings, duels, lastCompared])
}

/** Color del % ordenado: verde desde el 80 %, luego amarillo, naranja y rojo (CompareHome.tsx:26-31). */
export function pctColor(p: number): string {
  if (p >= 80) return '#3ec878'
  if (p >= 55) return '#e8c547'
  if (p >= 30) return '#f2913a'
  return '#ef4b4b'
}

/** Sustituye a `location.state.duel` de react-router: la portada deja el primer duelo y la sesión lo recoge una vez. */
let handoff: PlannedDuel | null = null
export const setDuelHandoff = (d: PlannedDuel | null) => {
  handoff = d
}
export const takeDuelHandoff = (): PlannedDuel | undefined => {
  const d = handoff
  handoff = null
  return d ?? undefined
}
