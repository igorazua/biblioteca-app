import { useMemo } from 'react'
import { computeCompareOverview, type CompareOverviewData } from '@biblioteca/core'
import { useStore } from '../store/useStore'

/**
 * Hook para obtener los datos de resumen de Comparar reactivos al store (antes en lib/compareOverview.ts; el cálculo
 * está en @biblioteca/core).
 */
export function useCompareOverview(): CompareOverviewData {
  const entries = useStore((s) => s.entries)
  const rankings = useStore((s) => s.rankings)
  const duels = useStore((s) => s.duels)
  const lastCompared = useStore((s) => s.lastCompared)

  return useMemo(
    () => computeCompareOverview(entries, rankings, duels, lastCompared),
    [entries, rankings, duels, lastCompared],
  )
}
