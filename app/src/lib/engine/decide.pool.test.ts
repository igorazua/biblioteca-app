// Decidir con el catálogo real (Igor, 27/10): la bolsa respeta «una que ya vi» / «de mis guardados» hasta el final,
// y en juegos de mesa elegir cooperativos acerca la propuesta a un cooperativo.
import { describe, expect, it } from 'vitest'
import { items, itemsById } from '../../data/catalog'
import { applyDuelChoice, getProposal, initDecideSession, nextDuel, passesFilters, sourceAllows, type DecideState } from './decide'
import type { Item, Profile, ShelfType, UserEntry } from '../../types'

const profile: Profile = { name: 'Test', avatarColor: '#fff', platforms: [], country: 'ES', lang: 'es' }

const entriesOf = (ids: string[], status: UserEntry['status'], shelf: ShelfType) =>
  Object.fromEntries(ids.map((id) => [id, { itemId: id, shelf, status, ranked: false, updatedAt: 1 } as UserEntry]))

const start = (shelf: ShelfType, answers: Record<string, string | string[]>, entries: Record<string, UserEntry>) =>
  initDecideSession({
    shelf,
    items,
    entries,
    rankings: { movie: [], series: [], book: [], artist: [], boardgame: [], song: [] },
    profile,
    friends: [],
    answers,
    affinity: () => null,
    friendPct: () => null,
    recentOrienters: [],
    userVec: null,
    doubtfulItems: {},
  })

/** Juega n duelos eligiendo siempre la de la izquierda. */
function play(state: DecideState, n: number): DecideState {
  let st = state
  for (let i = 0; i < n; i++) {
    const d = nextDuel(st, items, new Set(st.shown), () => 0.42)
    if (!d) break
    st = applyDuelChoice(st, d.a, d.b, itemsById, 1500, d.dimension)
  }
  return st
}

// con el catálogo entero cada sesión tarda unos segundos; con toda la batería en paralelo pasa de los 5 s por defecto
describe('Decidir: la bolsa no se sale de lo elegido', { timeout: 60_000 }, () => {
  const movies = items.filter((it) => it.type === 'movie' && !it.hidden).sort((a, b) => b.popularity - a.popularity)
  const seenIds = movies.slice(0, 40).map((it) => it.id)
  const pendingIds = movies.slice(40, 60).map((it) => it.id)
  const entries = { ...entriesOf(seenIds, 'seen', 'movie'), ...entriesOf(pendingIds, 'pending', 'movie') }

  it('«una que ya vi»: la propuesta y las 10 alternativas son todas vistas, también tras re-muestrear', () => {
    const st = play(start('movie', { seen: 'vista', platforms: [] }, entries), 6)
    expect(st.duels.length).toBeGreaterThanOrEqual(3) // pasa por el re-muestreo del duelo 3
    expect(st.pool.every((id) => seenIds.includes(id))).toBe(true)
    const prop = getProposal(st, itemsById, [], profile)!
    expect(seenIds).toContain(prop.item.id)
    for (const alt of prop.alternatives ?? []) expect(seenIds).toContain(alt.id)
  })

  it('«de mis guardados»: solo pendientes, aunque sean pocas', () => {
    const st = play(start('movie', { seen: 'nueva', source: 'pendientes', platforms: [] }, entries), 6)
    expect(st.pool.every((id) => pendingIds.includes(id))).toBe(true)
  })

  it('«nuevas»: ni vistas ni guardadas ni ocultas', () => {
    const st = play(start('movie', { seen: 'nueva', source: 'nuevas', platforms: [] }, entries), 6)
    for (const id of st.pool) {
      expect(entries[id]).toBeUndefined()
      expect(itemsById.get(id)?.hidden).toBeFalsy()
    }
  })

  it('sourceAllows nunca deja pasar una oculta', () => {
    const hidden = items.find((it) => it.hidden)
    if (hidden) expect(sourceAllows(hidden, {}, {})).toBe(false)
  })
})

describe('Decidir: juegos de mesa cooperativos', { timeout: 60_000 }, () => {
  const games = items.filter((it) => it.type === 'boardgame' && !it.hidden)
  const coop = games.filter((g) => g.cooperative === true).sort((a, b) => b.popularity - a.popularity)
  const comp = games.filter((g) => g.cooperative === false).sort((a, b) => b.popularity - a.popularity)

  it('hay juegos marcados como cooperativos', () => {
    expect(coop.length).toBeGreaterThan(10)
  })

  it('tras elegir tres cooperativos frente a competitivos, propone un cooperativo', () => {
    let st = start('boardgame', { seen: 'nueva', source: 'igual' }, {})
    // pesos y temas distintos a propósito: lo único común a las ganadoras es que son cooperativas
    const pairs: [Item, Item][] = [[coop[0], comp[0]], [coop[3], comp[5]], [coop[7], comp[11]]]
    for (const [w, l] of pairs) st = applyDuelChoice(st, w, l, itemsById, 1500)
    const prop = getProposal(st, itemsById, [], profile)!
    expect(prop.item.cooperative).toBe(true)
    const alts = prop.alternatives ?? []
    expect(alts.filter((a) => a.cooperative).length).toBeGreaterThanOrEqual(Math.ceil(alts.length / 2))
  })
})

describe('Filtros de Decidir con «Me da igual»', () => {
  const film = { id: 'x', type: 'movie', title: 'Larga', year: 1972, creator: '', durationMin: 175, genres: ['Drama'], synopsis: '', posterUrl: null, popularity: 90 } as unknown as Item
  const book = { id: 'y', type: 'book', title: 'Gorda', year: 1900, creator: '', pages: 600, genres: ['Novela'], synopsis: '', posterUrl: null, popularity: 90 } as unknown as Item
  it('no recorta la duración ni las páginas', () => {
    expect(passesFilters(film, { time: 'igual' }, [])).toBe(true)
    expect(passesFilters(book, { length: 'igual' }, [])).toBe(true)
    expect(passesFilters(film, { time: 'media' }, [])).toBe(false)
    expect(passesFilters(book, { length: 'media' }, [])).toBe(false)
  })
  it('jugadores como rango: «1-5» vale para dos, «2» no vale para 3 o 4', () => {
    const g = (players: string) => ({ id: players, type: 'boardgame', title: 'J', year: 2000, creator: '', genres: [], synopsis: '', posterUrl: null, popularity: 50, players }) as unknown as Item
    expect(passesFilters(g('1-5'), { players: '2' }, [])).toBe(true)
    expect(passesFilters(g('2'), { players: 'grupo' }, [])).toBe(false)
    expect(passesFilters(g('6-21'), { players: '2' }, [])).toBe(false)
    expect(passesFilters(g('3-8'), { players: 'fiesta' }, [])).toBe(true)
  })
})
