// Motor del asistente «Decidir»: preguntas + duelos ORIENTADORES → puntuación de candidatas. Funciones puras.
// Un orientador es una obra concreta de la misma categoría («¿algo como esto o como esto?»). No es candidata:
// solo orienta (§14.2). Cada elección suma peso a los géneros y al autor de la elegida y resta a la descartada.
import type { Item, ShelfType, UserEntry } from '../types'
import { PLATFORMS } from '../config'
import { COMPANY_GENRES, MOOD_GENRES, NONFICTION_GENRES, PACE_GENRES } from '../data/questions'

export type Answers = Record<string, string | string[] | undefined>
export const SHAPER_DUELS = 5 // mínimo antes de la primera propuesta
export const MORE_DUELS = 4 // tras «Seguir buscando»

// Series que se siguen emitiendo (orientativo: la semilla de demo no trae este dato)
const ONGOING = new Set(['Los Simpson', 'South Park', 'Padre de familia', 'Rick y Morty', 'The Last of Us', 'Black Mirror', 'Fargo', 'True Detective', 'The Mandalorian', 'Cuéntame cómo pasó'])

const asStr = (v: Answers[string]) => (typeof v === 'string' ? v : undefined)

/* ================================ Orientadores ================================ */

export interface Shaping {
  genreW: Record<string, number>
  creatorW: Record<string, number>
  winners: string[] // ids elegidos, en orden
  shown: string[] // ids ya enseñados (no se repiten)
}
export const newShaping = (): Shaping => ({ genreW: {}, creatorW: {}, winners: [], shown: [] })

/** Aplica una elección: la ganadora suma, la perdedora resta (solo en lo que no comparten). */
export function applyShaper(sh: Shaping, winner: Item, loser: Item): Shaping {
  const genreW = { ...sh.genreW }
  const creatorW = { ...sh.creatorW }
  for (const g of winner.genres) genreW[g] = (genreW[g] ?? 0) + (loser.genres.includes(g) ? 0.3 : 1)
  for (const g of loser.genres) if (!winner.genres.includes(g)) genreW[g] = (genreW[g] ?? 0) - 0.5
  creatorW[winner.creator] = (creatorW[winner.creator] ?? 0) + 1
  return { genreW, creatorW, winners: [...sh.winners, winner.id], shown: sh.shown }
}

const overlap = (a: Item, b: Item) => a.genres.filter((g) => b.genres.includes(g)).length

/**
 * Siguiente pareja de orientadores: obras conocidas de la categoría, dentro del ánimo elegido si lo hay,
 * y lo más contrastadas posible entre sí (pocos géneros en común). Nunca repite obras ya enseñadas.
 */
export function nextShaperPair(items: Item[], shelf: ShelfType, answers: Answers, shown: readonly string[], rng: () => number): [Item, Item] | null {
  const mood = asStr(answers.mood)
  const moodG = (mood && MOOD_GENRES[shelf][mood]) || []
  const known = items.filter((i) => i.type === shelf && !shown.includes(i.id)).sort((a, b) => b.popularity - a.popularity)
  const inMood = moodG.length ? known.filter((i) => i.genres.some((g) => moodG.includes(g))) : known
  const pool = (inMood.length >= 4 ? inMood : known).slice(0, 36)
  if (pool.length < 2) return null
  const a = pool[Math.floor(rng() * Math.min(pool.length, 18))]
  const rest = pool.filter((i) => i.id !== a.id)
  const minOv = Math.min(...rest.map((i) => overlap(a, i)))
  const far = rest.filter((i) => overlap(a, i) === minOv)
  const b = far[Math.floor(rng() * far.length)]
  return rng() < 0.5 ? [a, b] : [b, a]
}

/* ================================ Candidatas ================================ */

export interface Cand { item: Item; score: number; fromFriends: boolean; like?: Item }

export interface RecCtx {
  shelf: ShelfType
  items: Item[]
  entries: Record<string, UserEntry>
  answers: Answers
  shaping: Shaping
  friendsMean: (id: string) => number | null
  platforms: string[]
  /** géneros de tus favoritas de esta categoría (para «parecido a lo que te gusta») */
  topGenres?: string[]
}

export function passes(it: Item, a: Answers, platforms: string[]): boolean {
  const time = asStr(a.time), era = asStr(a.era), format = asStr(a.format), ep = asStr(a.episode), len = asStr(a.length), kind = asStr(a.kind)
  if (it.type === 'movie') {
    if (time && time !== 'larga' && (it.durationMin ?? 0) > (time === 'corta' ? 100 : 135)) return false
    if (era === 'reciente' && it.year < 2010) return false
    if (era === 'clasico' && it.year >= 2000) return false
  }
  if (it.type === 'series') {
    const airing = asStr(a.airing)
    if (airing === 'emision' && !ONGOING.has(it.title)) return false
    if (airing === 'terminada' && ONGOING.has(it.title)) return false
    if (format === 'mini' && (it.seasons ?? 99) > 2) return false
    if (format === 'larga' && (it.seasons ?? 99) <= 2) return false
    if (ep === 'corto' && (it.durationMin ?? 0) > 30) return false
    if (ep === 'medio' && (it.durationMin ?? 0) > 50) return false
    if (ep === 'largo' && (it.durationMin ?? 0) <= 50) return false
  }
  if (it.type === 'book') {
    const diff = asStr(a.difficulty)
    if (diff && diff !== 'igual' && it.depth && it.depth !== diff) return false
    if (len && len !== 'larga' && (it.pages ?? 0) > (len === 'corta' ? 250 : 450)) return false
    const nf = it.genres.some((g) => NONFICTION_GENRES.includes(g))
    if (kind === 'ficcion' && nf) return false
    if (kind === 'noficcion' && !nf) return false
  }
  const allPlatforms = PLATFORMS.length > 0 && PLATFORMS.every((p) => platforms.includes(p))
  if (!allPlatforms && (it.type === 'movie' || it.type === 'series') && platforms.length && it.platforms?.length && !it.platforms.some((p) => platforms.includes(p))) return false
  return true
}

/** Candidatas puntuadas: primero los pendientes del usuario, luego catálogo no visto. Los orientadores no entran. */
export function scoreCandidates(ctx: RecCtx): Cand[] {
  const { shelf, answers, shaping } = ctx
  const mood = asStr(answers.mood)
  const moodG = (mood && MOOD_GENRES[shelf][mood]) || []
  const companyG = COMPANY_GENRES[asStr(answers.company) ?? ''] ?? []
  const paceG = PACE_GENRES[asStr(answers.pace) ?? ''] ?? []
  const novelty = asStr(answers.novelty)
  const top = new Set(ctx.topGenres ?? [])
  const plats = Array.isArray(answers.platforms) ? answers.platforms : (ctx.platforms ?? [])
  const shown = new Set(shaping.shown)
  const winners = shaping.winners.map((id) => ctx.items.find((i) => i.id === id)).filter(Boolean) as Item[]

  const rate = (it: Item): Cand => {
    const shape = it.genres.reduce((s, g) => s + (shaping.genreW[g] ?? 0), 0) + (shaping.creatorW[it.creator] ?? 0) * 1.5
    const like = winners.length ? [...winners].sort((a, b) => overlap(it, b) - overlap(it, a))[0] : undefined
    const pending = ctx.entries[it.id]?.status === 'pending'
    const inTop = it.genres.filter((g) => top.has(g)).length
    const score =
      shape * 3.2 +
      (ctx.friendsMean(it.id) ?? it.popularity / 10) * 0.5 +
      (pending ? 5 : 0) +
      it.genres.filter((g) => moodG.includes(g)).length * 2 +
      it.genres.filter((g) => companyG.includes(g)).length * 0.5 +
      it.genres.filter((g) => paceG.includes(g)).length * 1.5 +
      (novelty === 'parecido' ? inTop * 1.5 : novelty === 'nuevo' ? -inTop * 1.5 : 0)
    return { item: it, score, fromFriends: !pending, like: like && overlap(it, like) > 0 ? like : undefined }
  }

  const pool = (filter: (it: Item) => boolean) => {
    const source = asStr(answers.source)
    const ok = (i: Item) => i.type === shelf && !shown.has(i.id) && filter(i)
    if (asStr(answers.seen) === 'vista') {
      // repetir: de lo que ya has visto, lo mejor valorado primero
      return ctx.items.filter((i) => i.type === shelf && !shown.has(i.id) && ctx.entries[i.id]?.status === 'seen' && filter(i)).map(rate).sort((a, b) => b.score - a.score)
    }
    const own = ctx.items.filter((i) => source !== 'nuevas' && ok(i) && ctx.entries[i.id]?.status === 'pending').map(rate)
    const cat = ctx.items
      .filter((i) => source !== 'pendientes' && ok(i) && !ctx.entries[i.id])
      .map(rate)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
    return [...own, ...cat].sort((a, b) => b.score - a.score)
  }
  // filtros de más a menos estrictos, para no quedarse sin propuestas
  const tiers = [pool((i) => passes(i, answers, plats)), pool((i) => passes(i, answers, [])), pool(() => true)]
  return tiers.find((t) => t.length >= 3) ?? tiers.reduce((a, b) => (b.length > a.length ? b : a))
}
