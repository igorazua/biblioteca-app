// Test de lector, corto (5 preguntas), inspirado en las motivaciones de Quantic Foundry:
// no clasifica «qué género lees» sino «qué buscas ahora mismo en un libro».
import type { Depth, Item, Motivation, ReaderProfile } from '../types'

export const MOTIVATIONS: Record<Motivation, { label: string; blurb: string }> = {
  aventura: { label: 'Evasión', blurb: 'Quieres perderte en otro mundo y que pasen cosas.' },
  intriga: { label: 'Intriga', blurb: 'Necesitas saber qué pasa y quién lo hizo.' },
  emocion: { label: 'Emoción', blurb: 'Buscas personajes que te hagan sentir de verdad.' },
  ideas: { label: 'Ideas', blurb: 'Te gusta que un libro te cambie la forma de pensar.' },
  lenguaje: { label: 'Belleza', blurb: 'Disfrutas la prosa, la frase subrayable, el estilo.' },
  historia: { label: 'Mundos e historia', blurb: 'Te atrapan las épocas, los lugares y las sagas.' },
}

type Answer = { label: string; add?: Partial<Record<Motivation, number>>; depth?: Depth }
export interface Question { q: string; answers: Answer[] }

export const QUESTIONS: Question[] = [
  { q: 'Un sábado perfecto con un libro…', answers: [
    { label: 'Me pierdo en otro mundo', add: { aventura: 2, historia: 1 } },
    { label: 'No puedo parar hasta saber el final', add: { intriga: 2 } },
    { label: 'Lloro (o casi) con los personajes', add: { emocion: 2 } },
    { label: 'Subrayo frases que quiero guardar', add: { lenguaje: 2, ideas: 1 } },
  ] },
  { q: '¿Qué esperas de un buen libro?', answers: [
    { label: 'Que me haga pensar distinto', add: { ideas: 2 } },
    { label: 'Que me enganche en la primera página', add: { intriga: 2, aventura: 1 } },
    { label: 'Que me lleve a otra época', add: { historia: 2 } },
    { label: 'Que me remueva por dentro', add: { emocion: 2 } },
  ] },
  { q: '¿Cuánto libro aguantas?', answers: [
    { label: 'Corto y al grano (hasta ~300 págs)', depth: 'ligera' },
    { label: 'Normal (300-500 págs)', depth: 'media' },
    { label: 'Un ladrillo, sin problema', depth: 'densa', add: { historia: 1 } },
  ] },
  { q: 'De un protagonista, lo que más te importa…', answers: [
    { label: 'Su viaje y sus peligros', add: { aventura: 2 } },
    { label: 'Sus secretos', add: { intriga: 2 } },
    { label: 'Sus dilemas morales', add: { ideas: 2 } },
    { label: 'Sus relaciones y sentimientos', add: { emocion: 2 } },
  ] },
  { q: 'Entre estas dos, me quedo con…', answers: [
    { label: 'Prosa cuidada aunque pase poco', add: { lenguaje: 3 } },
    { label: 'Mucha trama y ritmo', add: { aventura: 1, intriga: 1 } },
    { label: 'Que me enseñe algo', add: { ideas: 2, historia: 1 } },
  ] },
]

export function scoreReader(picks: number[]): ReaderProfile {
  const scores: Record<Motivation, number> = { aventura: 0, intriga: 0, emocion: 0, ideas: 0, lenguaje: 0, historia: 0 }
  let depth: Depth = 'media'
  picks.forEach((idx, qi) => {
    const a = QUESTIONS[qi]?.answers[idx]
    if (!a) return
    for (const [k, v] of Object.entries(a.add ?? {})) scores[k as Motivation] += v as number
    if (a.depth) depth = a.depth
  })
  return { scores, depth, at: Date.now() }
}

export function topMotivations(r: ReaderProfile, n = 2): Motivation[] {
  return (Object.entries(r.scores) as [Motivation, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k)
}

const GENRE_MOTIVATION: Record<string, Motivation[]> = {
  Fantasía: ['aventura'], Aventura: ['aventura'], 'Ciencia ficción': ['aventura', 'ideas'], Distopía: ['ideas'],
  Misterio: ['intriga'], Thriller: ['intriga'], Crimen: ['intriga'],
  Novela: ['emocion'], Romance: ['emocion'], Fábula: ['ideas', 'emocion'],
  Ensayo: ['ideas'], Historia: ['ideas', 'historia'], Histórica: ['historia'],
  Clásico: ['lenguaje'], 'Realismo mágico': ['lenguaje', 'emocion'],
}

/** 0-1: cuánto encaja un libro con el lector (motivaciones por géneros + profundidad). */
export function bookFit(it: Item, r?: ReaderProfile): number {
  if (!r) return 0
  const total = Object.values(r.scores).reduce((a, b) => a + b, 0) || 1
  const m = it.genres.flatMap((g) => GENRE_MOTIVATION[g] ?? [])
  const motive = m.length ? Math.max(...m.map((k) => r.scores[k] / total)) : 0
  const depthMatch = it.depth === r.depth ? 1 : it.depth && Math.abs(['ligera', 'media', 'densa'].indexOf(it.depth) - ['ligera', 'media', 'densa'].indexOf(r.depth)) === 1 ? 0.4 : 0
  return Math.min(1, motive * 2.2) * 0.75 + depthMatch * 0.25
}
