import type { Friend, Item, ReaderProfile, UserEntry } from '../types'
import { bookFit } from './reader'

/** Ruido estable 0-5 a partir del id (no cambia entre renders ni sesiones). */
export function stableNoise(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 5000) / 1000
}

export interface DeckCtx {
  friends: Friend[]
  entries: Record<string, UserEntry>
  birthYear?: number
  platforms: string[]
  reader?: ReaderProfile
  /** nota media de los amigos (0-10) o null; los libros se ordenan por calidad */
  quality?: (id: string) => number | null
}

export function deckScore(it: Item, ctx: Pick<DeckCtx, 'birthYear' | 'platforms' | 'reader' | 'quality'>, fcount: number): number {
  let s = it.popularity + 15 * fcount
  if (it.type === 'book') {
    // los libros mejor valorados primero, y los que encajan con el test de lector
    s += 6 * (ctx.quality?.(it.id) ?? it.popularity / 10) + 30 * bookFit(it, ctx.reader)
  }
  if (ctx.birthYear && it.year >= ctx.birthYear + 12 && it.year <= ctx.birthYear + 25) s += 20
  if (it.platforms?.some((p) => ctx.platforms.includes(p))) s += 10
  return s + stableNoise(it.id)
}

/** Items sin ninguna entrada del usuario, de mayor a menor probabilidad de «¡esta la vi!». */
export function buildDeck(items: Item[], ctx: DeckCtx): Item[] {
  const counts = new Map<string, number>()
  for (const f of ctx.friends) for (const e of f.entries) counts.set(e.itemId, (counts.get(e.itemId) ?? 0) + 1)
  return items
    .filter((it) => !ctx.entries[it.id])
    .map((it) => [it, deckScore(it, ctx, counts.get(it.id) ?? 0)] as const)
    .sort((a, b) => b[1] - a[1])
    .map(([it]) => it)
}
