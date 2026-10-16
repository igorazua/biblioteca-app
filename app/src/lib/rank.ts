// Puesto y percentil (D25): solo comparamos a pares, así que lo honesto es el PUESTO en tu ranking.
// La interfaz enseña siempre el puesto («nº 3 de 42»); el percentil (0-100) solo se usa por dentro,
// para comparar rankings de distinto tamaño (afinidad, recomendaciones, orden del mazo).
import type { Friend, Item } from '../types'

export interface Rank { pos: number; total: number; pct: number }

/** 1º = 100, último = 0. Con un solo item, 100. */
export const percentile = (pos: number, total: number) => (total <= 1 ? 100 : Math.round(100 * (1 - (pos - 1) / (total - 1))))

/** Puestos de una lista ordenada (mejor primero). */
export function ranksOf(ids: readonly string[]): Record<string, Rank> {
  const out: Record<string, Rank> = {}
  ids.forEach((id, i) => { out[id] = { pos: i + 1, total: ids.length, pct: percentile(i + 1, ids.length) } })
  return out
}

/** Ranking de un amigo por categoría, a partir de sus valoraciones (en la demo, los amigos simulados traen nota). */
const friendCache = new Map<string, Record<string, Rank>>()
export function friendRanks(friend: Friend, itemOf: (id: string) => Item | undefined): Record<string, Rank> {
  const hit = friendCache.get(friend.id)
  if (hit) return hit
  const byType: Record<string, { id: string; s: number }[]> = {}
  for (const e of friend.entries) {
    if (e.status !== 'seen' || e.score === undefined) continue
    const t = itemOf(e.itemId)?.type
    if (t) (byType[t] ??= []).push({ id: e.itemId, s: e.score })
  }
  const out: Record<string, Rank> = {}
  for (const list of Object.values(byType)) Object.assign(out, ranksOf(list.sort((a, b) => b.s - a.s).map((x) => x.id)))
  friendCache.set(friend.id, out)
  return out
}

/** «nº 3» */
export const fmtRank = (r: Pick<Rank, 'pos'>) => `nº ${r.pos}`
