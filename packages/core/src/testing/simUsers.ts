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
