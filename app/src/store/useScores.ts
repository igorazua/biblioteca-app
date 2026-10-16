import { useMemo } from 'react'
import { useStore } from './useStore'
import { SHELVES } from '../types'
import { ranksOf, type Rank } from '../lib/rank'

/** Puesto (y percentil interno) de cada obra ordenada del usuario, por estantería (D25). */
export function useRanks(): Record<string, Rank> {
  const rankings = useStore((s) => s.rankings)
  return useMemo(() => {
    const out: Record<string, Rank> = {}
    for (const t of SHELVES) Object.assign(out, ranksOf(rankings[t] ?? []))
    return out
  }, [rankings])
}
