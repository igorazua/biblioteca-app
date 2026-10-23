import { useMemo } from 'react'
import { getItem } from '../data/catalog'
import { useStore } from '../store/useStore'
import { SHELVES, type ShelfType, type UserEntry, type DuelRecord } from '../types'
import { pairKey, planNextDuel, RANK_DUELS_FOR_DONE } from './ranking'

export interface ShelfOverview {
  shelf: ShelfType
  sinOrdenar: number
  enRanking: number
  pulido: number
  ordenado: number
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
 * docs/TAREA_T16_COMPARAR.md §1.4 y docs/TAREA_T19_AJUSTES.md §3 y §4.2.1
 */
export function computeCompareOverview(
  entries: Record<string, UserEntry>,
  rankings: Record<ShelfType, string[]>,
  duels: Record<ShelfType, Record<string, DuelRecord>>,
  lastCompared: Record<ShelfType, number>,
): CompareOverviewData {
  const shelfOverviewMap = {} as Record<ShelfType, ShelfOverview>

  let totalBienAll = 0
  let totalSeenAll = 0

  for (const s of SHELVES) {
    const ranking = rankings[s] ?? []
    const enRanking = ranking.length

    const seenEntries = Object.values(entries).filter(
      (e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === s,
    )
    const totalSeen = seenEntries.length

    // Fuente de verdad del orden: el array de ranking
    const unrankedEntries = seenEntries.filter(
      (e) => !ranking.includes(e.itemId) || Boolean(e.provisional),
    )
    const sinOrdenar = unrankedEntries.length

    const shelfDuels = duels[s] ?? {}
    const ultima = lastCompared[s] ?? 0

    // Conteo de duelos de ranking jugados por obra (historial de T16)
    const duelCounts: Record<string, number> = {}
    for (const key of Object.keys(shelfDuels)) {
      const sep = key.indexOf('|')
      if (sep > 0) {
        const a = key.slice(0, sep)
        const b = key.slice(sep + 1)
        duelCounts[a] = (duelCounts[a] || 0) + 1
        duelCounts[b] = (duelCounts[b] || 0) + 1
      }
    }

    // % ordenado (§4.2.1):
    // bien_ordenada(obra) = está en rankings[shelf] Y ha jugado ≥ 3 duelos de ranking
    // ordenado(shelf)     = round(100 · nº de vistas bien ordenadas / nº de vistas)
    let bienOrdenadas = 0
    for (const e of seenEntries) {
      if (ranking.includes(e.itemId) && !e.provisional && (duelCounts[e.itemId] ?? 0) >= RANK_DUELS_FOR_DONE) {
        bienOrdenadas++
      }
    }
    const ordenado = totalSeen > 0 ? Math.round((100 * bienOrdenadas) / totalSeen) : 0

    // pulido (0-100) = % parejas vecinas (i, i+1) en ranking que se han enfrentado directamente (dato interno)
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

    // completo (§3): solo cuando no queda nada sin ordenar Y planNextDuel devuelve null
    let completo = false
    if (sinOrdenar === 0) {
      if (enRanking < 2) {
        completo = totalSeen < 2
      } else {
        completo =
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
      ordenado,
      ultima,
      disponible,
      completo,
    }

    totalBienAll += bienOrdenadas
    totalSeenAll += totalSeen
  }

  const total = totalSeenAll > 0 ? Math.round((100 * totalBienAll) / totalSeenAll) : 0

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
