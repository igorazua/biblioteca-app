/**
 * traits.ts — Cómo ve el motor de Decidir cada obra (MOTOR §2c.4, capa de sesión; Igor, 27/10/2026).
 *
 * Cada obra es un vector disperso de rasgos legibles (géneros, mecánicas, «cooperativo», década, duración…) más
 * su vector denso de contenido (`engine/<shelf>.json`, 48 dimensiones; mañana el espacio fusionado de T7). Los
 * duelos aprenden un peso por rasgo y por dimensión: el gusto de esta noche.
 *
 * Solo entran rasgos con datos reales del catálogo. Los ejes de sensación no (ninguna obra los tiene: T21) y las
 * palabras clave sueltas pesan poco y nunca salen en los motivos.
 */

import type { Item, ShelfType } from '../../types'
import { canonicalId } from '../../data/aliases'
import { vecOf } from './features'
import { catalogDetailStamp } from '../../data/catalog'

export const EMB_DIM = 48
const EMB_PREFIX = 'e:'

/** Varianza previa de cada familia de rasgos: cuánto puede pesar el rasgo antes de ver ningún duelo. */
const FAMILY_VAR: Record<string, number> = {
  g: 1.0, // género o tema
  coop: 3.0, // cooperativo: en juegos de mesa es un modo de jugar, decide más que cualquier tema
  m: 0.8, // mecánica
  w: 0.6, // peso del juego
  k: 0.2, // palabra clave (ruidosa)
  c: 0.6, // autor, director, diseñador
  d: 0.3, // década
  l: 0.5, // en español
  nf: 1.2, // no ficción
  x: 0.5, // rasgos prácticos: duración, temporadas, jugadores, edad
  e: 1.0 / EMB_DIM, // cada dimensión del vector de contenido (en total, como un rasgo fuerte)
}
export const familyOf = (key: string) => key.slice(0, key.indexOf(':'))
export const priorVar = (key: string) => FAMILY_VAR[familyOf(key)] ?? 0.5

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/** Géneros y palabras clave en inglés → su nombre en español: un mismo concepto es un solo rasgo y el motivo se lee bien. */
const ES: Record<string, string> = {
  drama: 'drama', comedy: 'comedia', crime: 'crimen', action: 'acción', adventure: 'aventura', thriller: 'thriller',
  romance: 'romance', biography: 'biografía', mystery: 'misterio', history: 'historia', fantasy: 'fantasía',
  animation: 'animación', war: 'bélica', family: 'familiar', 'sci-fi': 'ciencia ficción', 'science fiction': 'ciencia ficción',
  'science-fiction': 'ciencia ficción', horror: 'terror', music: 'música', supernatural: 'sobrenatural', legal: 'judicial',
  medical: 'médica', children: 'infantil', food: 'cocina', sports: 'deporte', nature: 'naturaleza', espionage: 'espionaje',
  travel: 'viajes', fighting: 'combate', farming: 'granjas', nautical: 'mar', 'territory building': 'territorios',
  negotiation: 'negociación', political: 'política', renaissance: 'Renacimiento', trains: 'trenes', mythology: 'mitología',
  'party game': 'party', 'industry / manufacturing': 'industria', 'movies / tv / radio theme': 'cine y televisión',
  'medio ambiente': 'naturaleza', antiguedad: 'la Antigüedad', 'ancient': 'la Antigüedad', 'spies/secret agents': 'espías',
  'fiction': '', 'nonfiction': '', 'literature': '', 'general': '',
}
const translate = (raw: string): string => {
  const n = norm(raw)
  return n in ES ? ES[n] : raw.trim()
}
/** Lo que se lee en un motivo: solo español razonable (sin barras, sin códigos, sin genéricos). */
const readable = (label: string) => Boolean(label) && !/[\/]|^q\d+$/i.test(label) && !/^(literatura|novela|musica|narrativa)$/i.test(norm(label))

const NONFICTION = ['ensayo', 'historia', 'biografia', 'filosofia', 'divulgacion', 'ciencia']

const playersRange = (p?: string): [number, number] | null => {
  const m = p?.match(/\d+/g)
  if (!m) return null
  const n = m.map(Number)
  return [Math.min(...n), Math.max(...n)]
}

/** Rasgos crudos de una obra (antes del filtro de vocabulario de la estantería). */
function rawTraits(it: Item): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []
  const genreKeys = new Set<string>()
  for (const g of it.genres ?? []) {
    const t = translate(g)
    if (!t) continue
    const key = `g:${norm(t)}`
    if (genreKeys.has(key)) continue
    genreKeys.add(key)
    out.push({ key, label: t.toLowerCase() === t ? t : t.charAt(0).toLowerCase() + t.slice(1) })
  }
  for (const k of (it.keywords ?? []).slice(0, 10)) {
    if (/^Q\d+$/.test(k)) continue
    const t = translate(k)
    if (!t || genreKeys.has(`g:${norm(t)}`)) continue
    out.push({ key: `k:${norm(t)}`, label: '' })
  }
  const creator = (it.creator ?? '').split(',')[0].trim()
  if (creator) out.push({ key: `c:${norm(creator)}`, label: `de ${creator}` })
  if (it.year) out.push({ key: `d:${Math.floor(it.year / 10) * 10}`, label: `de los ${String(Math.floor(it.year / 10) * 10).slice(2)}` })
  if (it.originalLanguage === 'es' || it.originCountry?.includes('ES')) out.push({ key: 'l:es', label: 'en español' })

  const dur = it.durationMin
  if (it.type === 'movie' && dur) {
    if (dur < 100) out.push({ key: 'x:corta', label: 'corta' })
    if (dur > 150) out.push({ key: 'x:larga', label: 'larga' })
  }
  if (it.type === 'series') {
    if (it.seasons != null && it.seasons <= 2) out.push({ key: 'x:mini', label: 'miniserie' })
    if (it.seasons != null && it.seasons >= 5) out.push({ key: 'x:muchas', label: 'de muchas temporadas' })
    if (dur && dur <= 30) out.push({ key: 'x:epcorto', label: 'de capítulos cortos' })
    if (dur && dur >= 50) out.push({ key: 'x:eplargo', label: 'de capítulos largos' })
  }
  if (it.type === 'book') {
    if ((it.genres ?? []).some((g) => NONFICTION.includes(norm(g)))) out.push({ key: 'nf:si', label: 'de no ficción' })
    if (it.pages && it.pages <= 250) out.push({ key: 'x:corto', label: 'corto' })
    if (it.pages && it.pages >= 500) out.push({ key: 'x:largo', label: 'largo' })
  }
  if (it.type === 'boardgame') {
    if (it.cooperative) out.push({ key: 'coop:si', label: 'cooperativo' })
    for (const m of it.mechanics ?? []) {
      if (norm(m) === 'cooperativo') continue
      out.push({ key: `m:${norm(m)}`, label: m.toLowerCase() })
    }
    if (it.weight != null && it.weight < 2) out.push({ key: 'w:ligero', label: 'ligero' })
    if (it.weight != null && it.weight >= 3.2) out.push({ key: 'w:duro', label: 'de los que hacen pensar' })
    const r = playersRange(it.players)
    if (r && r[0] <= 2 && r[1] >= 2) out.push({ key: 'x:j2', label: 'para dos' })
    if (r && r[1] >= 5) out.push({ key: 'x:j5', label: 'para grupos grandes' })
    if (r && r[0] === 1) out.push({ key: 'x:solo', label: 'que se juega solo' })
    if (dur && dur <= 30) out.push({ key: 'x:corta', label: 'rápido' })
    if (dur && dur >= 90) out.push({ key: 'x:larga', label: 'largo' })
    if (it.minAge != null && it.minAge <= 8) out.push({ key: 'x:familiar', label: 'familiar' })
  }
  return out
}

export interface Features { keys: string[]; vals: number[] }
interface Space { labels: Map<string, string>; feats: Map<string, Features> }

const spaces = new WeakMap<Item[], Map<ShelfType, { space: Space; probe: string; withEmb: boolean; stamp: number }>>()

/**
 * Espacio de rasgos de una estantería. Un rasgo entra si lo tienen al menos 3 obras y no más de la mitad
 * (los de casi todas, como «Literatura», no distinguen). Se reconstruye si cambia el catálogo o llega el vector denso.
 */
export function traitSpace(shelf: ShelfType, items: Item[]): Space {
  let byShelf = spaces.get(items)
  const hit = byShelf?.get(shelf)
  // se rehace si llegan los vectores o el detalle de una estantería (géneros, palabras clave, país…)
  if (hit && hit.withEmb === Boolean(vecOf(shelf, hit.probe)) && hit.stamp === catalogDetailStamp()) return hit.space

  const shelfItems = items.filter((it) => it.type === shelf)
  const probe = canonicalId(shelfItems[0]?.id ?? '')
  const withEmb = Boolean(vecOf(shelf, probe))

  const raw = new Map<string, { key: string; label: string }[]>()
  const count = new Map<string, number>()
  const labels = new Map<string, string>()
  for (const it of shelfItems) {
    const r = rawTraits(it)
    raw.set(it.id, r)
    for (const t of r) {
      count.set(t.key, (count.get(t.key) ?? 0) + 1)
      if (t.label && !labels.has(t.key)) labels.set(t.key, t.label)
    }
  }
  const maxShare = Math.max(3, shelfItems.length * 0.5)
  const keep = (key: string) => {
    const n = count.get(key) ?? 0
    return n >= (familyOf(key) === 'c' ? 2 : 3) && n <= maxShare
  }

  const feats = new Map<string, Features>()
  for (const it of shelfItems) {
    const keys: string[] = []
    const vals: number[] = []
    for (const t of raw.get(it.id) ?? []) {
      if (keep(t.key)) { keys.push(t.key); vals.push(1) }
    }
    const v = vecOf(shelf, canonicalId(it.id))
    if (v) {
      let n2 = 0
      for (let i = 0; i < v.length; i++) n2 += v[i] * v[i]
      const n = Math.sqrt(n2) || 1
      for (let i = 0; i < EMB_DIM; i++) { keys.push(`${EMB_PREFIX}${i}`); vals.push((v[i] ?? 0) / n) }
    }
    feats.set(it.id, { keys, vals })
  }
  const space = { labels, feats }
  if (!byShelf) { byShelf = new Map(); spaces.set(items, byShelf) }
  byShelf.set(shelf, { space, probe, withEmb, stamp: catalogDetailStamp() })
  return space
}

/** Texto para un motivo («cooperativo», «de Agatha Christie»), o null si el rasgo no se debe enseñar. */
export function traitLabel(space: Space, key: string): string | null {
  const l = space.labels.get(key)
  return l && readable(l) ? l : null
}

export const isEmbKey = (key: string) => key.startsWith(EMB_PREFIX)
export { playersRange }
