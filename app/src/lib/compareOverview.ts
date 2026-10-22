import { useMemo } from 'react'
import { getItem } from '../data/catalog'
import { useStore } from '../store/useStore'
import { SHELVES, type ShelfType, type UserEntry, type DuelRecord } from '../types'
import { pairKey, planNextDuel } from './ranking'

export interface ShelfOverview {
  shelf: ShelfType
  sinOrdenar: number
  enRanking: number
  pulido: number
  ultima: number
  disponible: boolean
  completo: boolean
}

export interface CompareOverviewData {
  shelves: Record<ShelfType, ShelfOverview>
  total: number
}

/**
 * Función pura que calcula los datos de la pantalla inicial de Comparar.
 * docs/TAREA_T16_COMPARAR.md §1.4
 */
export function computeCompareOverview(
  entries: Record<string, UserEntry>,
  rankings: Record<ShelfType, string[]>,
  duels: Record<ShelfType, Record<string, DuelRecord>>,
  lastCompared: Record<ShelfType, number>,
): CompareOverviewData {
  const shelfOverviewMap = {} as Record<ShelfType, ShelfOverview>

  let weightedPulidoSum = 0
  let totalWeight = 0

  for (const s of SHELVES) {
    const ranking = rankings[s] ?? []
    const enRanking = ranking.length

    const seenEntries = Object.values(entries).filter(
      (e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === s,
    )
    const totalSeen = seenEntries.length

    const unrankedEntries = seenEntries.filter((e) => !e.ranked || e.provisional)
    const sinOrdenar = unrankedEntries.length

    const shelfDuels = duels[s] ?? {}
    const ultima = lastCompared[s] ?? 0

    // pulido (0-100) = % parejas vecinas (i, i+1) en ranking que se han enfrentado directamente
    let pulido = 0
    if (enRanking >= 2) {
      let faced = 0
      for (let i = 0; i < enRanking - 1; i++) {
        const key = pairKey(ranking[i], ranking[i + 1])
        if (shelfDuels[key]) faced++
      }
      pulido = Math.round((faced / (enRanking - 1)) * 100)
    } else if (enRanking === 1 && sinOrdenar === 0) {
      pulido = 100
    }

    // disponible: hay al menos 2 vistas, o 1 sin ordenar y un ranking de al menos 1
    const disponible = totalSeen >= 2 || (sinOrdenar >= 1 && enRanking >= 1)

    // completo: sin nada sin ordenar y sin parejas por pulir
    let completo = false
    if (sinOrdenar === 0) {
      if (enRanking < 2) {
        completo = totalSeen < 2
      } else {
        completo =
          pulido === 100 ||
          planNextDuel({
            shelf: s,
            ranking,
            unranked: [],
            duels: shelfDuels,
            cmp: {},
          }) === null
      }
    }

    shelfOverviewMap[s] = {
      shelf: s,
      sinOrdenar,
      enRanking,
      pulido,
      ultima,
      disponible,
      completo,
    }

    // total (diseño 4): media de pulido de todas las estanterías con ranking, ponderada por enRanking.
    // Las obras sin ordenar cuentan como 0 % pulido.
    if (enRanking > 0) {
      const shelfWeight = enRanking + sinOrdenar
      const shelfScore = (pulido * enRanking) / shelfWeight
      weightedPulidoSum += shelfScore * shelfWeight
      totalWeight += shelfWeight
    }
  }

  const total = totalWeight > 0 ? Math.round(weightedPulidoSum / totalWeight) : 0

  return {
    shelves: shelfOverviewMap,
    total,
  }
}

/**
 * Hook para obtener los datos de resumen de Comparar reactivos al store.
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
