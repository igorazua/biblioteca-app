// Usuarios simulados de Decidir, compartidos por el banco viejo contra nuevo (decide2.sim.test.ts) y el banco
// repetible (decide2.bench.test.ts). Solo para tests.
// Gusto con interacciones («cooperativo, pero solo si es denso»), una parte que el motor no ve (año preferido,
// gusto por lo popular), un capricho propio por obra y, al responder, ruido gaussiano.
import { items } from '../data/catalog'
import { sim } from '../lib/engine/features'
import type { Item, ShelfType } from '../types'

export function rngOf(seed: number) {
  let a = seed | 0
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
export const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r())
const has = (it: Item, g: string) => (it.genres ?? []).includes(g)

export type Taste = (it: Item) => number

/** Gustos por estantería: arquetipos con interacción + uno al azar por género. Artistas: década y vecinos. */
export function tasteFor(shelf: ShelfType, k: number, r: () => number): Taste {
  const pool = items.filter((x) => x.type === shelf && !x.hidden)
  if (shelf === 'artist') return artistTaste(pool, r)
  const genres = [...new Set(pool.flatMap((x) => x.genres))].filter((g) => pool.filter((x) => has(x, g)).length >= 25)
  const g1 = genres[Math.floor(r() * genres.length)]
  const g2 = genres[Math.floor(r() * genres.length)]
  const year = 1960 + Math.floor(r() * 60)
  const popTaste = gauss(r) * 0.6
  const whim = new Map(pool.map((x) => [x.id, gauss(r) * 0.7]))
  const hidden: Taste = (it) => -Math.abs((it.year || 2000) - year) / 25 + popTaste * ((it.popularity ?? 50) - 50) / 30 + (whim.get(it.id) ?? 0)
  const arche: Taste[] = shelf === 'boardgame'
    ? [
        (it) => (it.cooperative ? 3 : 0) + (it.cooperative && (it.weight ?? 2) > 2.5 ? 1.5 : 0),
        (it) => (has(it, 'Antigüedad') ? 2.5 : 0) + ((it.weight ?? 2) > 3 ? 1.5 : 0),
        (it) => ((it.weight ?? 3) < 1.9 ? 2 : 0) + (has(it, 'Party Game') || has(it, 'Faroleo') ? 2 : 0),
        (it) => (has(it, g1) ? 2.5 : 0) + (has(it, g2) ? 1.2 : 0),
      ]
    : shelf === 'series'
      ? [
          (it) => (has(it, 'Comedia') ? 3 : 0) + (has(it, 'Comedia') && has(it, 'Animación') ? 1 : 0),
          (it) => (has(it, 'Crimen') || has(it, 'Thriller') || has(it, 'Misterio') ? 2.5 : 0) + ((it.year ?? 2000) >= 2010 ? 1 : 0),
          (it) => (has(it, 'Drama') ? 3 : 0) + ((it.seasons ?? 1) >= 4 ? 0.8 : 0),
          (it) => (has(it, g1) ? 2.5 : 0) + (has(it, g2) ? 1.2 : 0),
        ]
    : shelf === 'movie'
      ? [
          (it) => (has(it, 'Animación') ? 3 : 0) + (has(it, 'Comedia') && has(it, 'Animación') ? 1 : 0),
          (it) => (has(it, 'Terror') || has(it, 'Thriller') ? 2.5 : 0) + ((it.year ?? 2000) >= 2000 ? 1 : 0),
          (it) => (has(it, 'Drama') && has(it, 'Historia') ? 3 : 0) + ((it.durationMin ?? 120) > 140 ? 0.8 : 0),
          (it) => (has(it, g1) ? 2.5 : 0) + (has(it, g2) ? 1.2 : 0),
        ]
      : [
          (it) => (has(it, 'Ensayo') || has(it, 'Filosofía') || has(it, 'Historia') ? 3 : 0) + ((it.pages ?? 300) < 300 ? 1 : 0),
          (it) => (has(it, 'Ciencia ficción') ? 3 : 0) + (has(it, 'Clásico') ? 1 : 0),
          (it) => (has(it, g1) ? 2.5 : 0) + (has(it, g2) ? 1.2 : 0),
        ]
  const a = arche[k % arche.length]
  return (it) => a(it) + hidden(it)
}

/**
 * Artistas: los géneros son etiquetas sueltas (solo «Música» llega a 25 obras), así que el gusto es una década
 * preferida más la cercanía en el vector a 3 artistas semilla, más la parte oculta y el capricho por obra.
 */
function artistTaste(pool: Item[], r: () => number): Taste {
  const decade = 1950 + 10 * Math.floor(r() * 8)
  const seeds = [0, 1, 2].map(() => pool[Math.floor(r() * pool.length)])
  const popTaste = gauss(r) * 0.6
  const whim = new Map(pool.map((x) => [x.id, gauss(r) * 0.7]))
  const memo = new Map<string, number>()
  return (it) => {
    const hit = memo.get(it.id)
    if (hit != null) return hit
    const decs = (it.peakDecades ?? []).map((d) => Number(String(d).match(/\d{4}/)?.[0])).filter((n) => Number.isFinite(n))
    const dist = decs.length ? Math.min(...decs.map((d) => Math.abs(d - decade))) : Math.abs((it.year || 2000) - decade)
    const near = seeds.reduce((s, x) => s + sim('artist', it.id, x.id), 0) / seeds.length // 0..1
    const v = (near - 0.5) * 10 - dist / 15 + popTaste * ((it.popularity ?? 50) - 50) / 30 + (whim.get(it.id) ?? 0)
    memo.set(it.id, v)
    return v
  }
}

const SEEN_FACTOR: Partial<Record<ShelfType, number>> = { movie: 0.7, series: 0.5, book: 0.3, boardgame: 0.5, artist: 0.9 }

/**
 * Obras que el usuario simulado ya ha visto, fijas por semilla e independientes del motor. Cada obra visible está vista
 * con probabilidad notoriety (o popularity/100·0,5) × factor de la estantería, ×1,3 si está en su 30 % favorito y ×0,7
 * si está en el 30 % de abajo; acotada a [0, 0,97].
 */
export function seenSetFor(shelf: ShelfType, taste: Taste, r: () => number): Set<string> {
  const pool = items.filter((x) => x.type === shelf && !x.hidden)
  const vals = pool.map((x) => ({ x, v: taste(x) })).sort((a, b) => b.v - a.v)
  const top = Math.floor(vals.length * 0.3)
  const bottom = vals.length - top
  const rank = new Map(vals.map((e, i) => [e.x.id, i]))
  const seen = new Set<string>()
  for (const x of pool) {
    const n = x.notoriety
    const noto = typeof n === 'number' ? n : n ? (n.ES ?? Object.values(n)[0]) : undefined
    let p = (noto ?? (x.popularity ?? 0) / 100 * 0.5) * (SEEN_FACTOR[shelf] ?? 0.5)
    const i = rank.get(x.id) ?? 0
    if (i < top) p *= 1.3
    else if (i >= bottom) p *= 0.7
    p = Math.max(0, Math.min(0.97, p))
    if (r() < p) seen.add(x.id)
  }
  return seen
}
