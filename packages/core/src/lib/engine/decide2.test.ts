// Motor v2 de Decidir: los casos que pidió Igor (27/10/2026), con el catálogo real.
import { beforeAll, describe, expect, it } from 'vitest'
import { items, itemsById } from '../../data/catalog'
import { applyDuelChoice, getProposal, initDecideSession, nextDuel, rejectAndContinue, sessionTaste, shouldPropose, traitWeight, type Decide2State } from './decide2'
import { loadShelfEngine } from '../../testing/engineData'
import type { Item, Profile, ShelfType, UserEntry } from '../../types'

const profile: Profile = { name: 'Test', avatarColor: '#fff', platforms: [], country: 'ES', lang: 'es' }
const rankings = { movie: [], series: [], book: [], artist: [], boardgame: [], song: [] }
const entriesOf = (ids: string[], status: UserEntry['status'], shelf: ShelfType) =>
  Object.fromEntries(ids.map((id) => [id, { itemId: id, shelf, status, ranked: false, updatedAt: 1 } as UserEntry]))
const start = (shelf: ShelfType, answers: Record<string, string | string[]>, entries: Record<string, UserEntry> = {}) =>
  initDecideSession({ shelf, items, entries, rankings, profile, friends: [], answers, affinity: () => null, friendPct: () => null, recentOrienters: [], userVec: null, doubtfulItems: {} })

/** Sesión completa respondiendo con un gusto; devuelve el estado al proponer. */
function play(st0: Decide2State, taste: (it: Item) => number, maxDuels = 8) {
  let st = st0
  let n = 0
  const pairs: [Item, Item][] = []
  for (; n < maxDuels; n++) {
    if (n > 0 && shouldPropose(st)) break
    const d = nextDuel(st, items, new Set(), () => 0.37)
    if (!d) break
    pairs.push([d.a, d.b])
    st = taste(d.a) >= taste(d.b) ? applyDuelChoice(st, d.a, d.b) : applyDuelChoice(st, d.b, d.a)
  }
  return { st, n, pairs }
}

// Firmas del modo estricto con el motor de antes de M1 (duelos | parejas | propuesta | puntuación | alternativas | tras «Seguir buscando»)
const STRICT_VISTA =
  '4 | movie:el-caballero-oscuro-2008/movie:parque-jurasico-1993 movie:parasitos-2019/movie:el-caballero-oscuro-la-leyenda-renace-2012 movie:wall-e-2008/movie:shutter-island-2010 movie:infiltrados-2006/movie:el-club-de-la-lucha-1999 | movie:parasitos-2019 | 1.11 | movie:el-club-de-la-lucha-1999 movie:shutter-island-2010 movie:seven-1995 movie:cadena-perpetua-1994 movie:pulp-fiction-1994 movie:forrest-gump-1994 movie:el-truco-final-el-prestigio-2006 movie:spider-man-un-nuevo-universo-2018 movie:origen-2010 movie:oppenheimer-2023 | movie:el-club-de-la-lucha-1999'
const STRICT_GUARDADOS =
  '3 | boardgame:concordia-2013/boardgame:gloomhaven-jaws-of-the-lion-2020 boardgame:a-feast-for-odin-2016/boardgame:gloomhaven-2017 boardgame:ark-nova-2021/boardgame:the-castles-of-burgundy-2011 | boardgame:gloomhaven-2017 | 2.71 | boardgame:arkham-horror-the-card-game-2016 boardgame:spirit-island-2017 boardgame:frosthaven-2022 boardgame:lost-ruins-of-arnak-2020 boardgame:ark-nova-2021 boardgame:gloomhaven-jaws-of-the-lion-2020 boardgame:slay-the-spire-the-board-game-2024 boardgame:pandemic-legacy-season-1-2015 boardgame:the-lord-of-the-rings-duel-for-middle-earth-2024 boardgame:dune-imperium-2020 | boardgame:lost-ruins-of-arnak-2020'

const games = items.filter((it) => it.type === 'boardgame' && !it.hidden)
const coop = games.filter((g) => g.cooperative).sort((a, b) => b.popularity - a.popularity)
const comp = games.filter((g) => g.cooperative === false).sort((a, b) => b.popularity - a.popularity)

describe('Decidir v2', { timeout: 120_000 }, () => {
  beforeAll(async () => { await loadShelfEngine('boardgame'); await loadShelfEngine('movie') }, 60_000)

  it('tres cooperativos elegidos → propone un cooperativo y el motivo lo dice', () => {
    let st = start('boardgame', { seen: 'nueva', source: 'igual' })
    for (const [w, l] of [[coop[0], comp[0]], [coop[3], comp[5]], [coop[7], comp[11]]] as [Item, Item][]) st = applyDuelChoice(st, w, l)
    const prop = getProposal(st, null, [])!
    expect(prop.item.cooperative).toBe(true)
    expect(prop.reasons.join(' ')).toMatch(/cooperativo/)
  })

  it('el tanteo: a quien solo le importa lo cooperativo, el motor acaba atribuyéndolo a eso y no al tema', () => {
    const { st, pairs } = play(start('boardgame', { seen: 'nueva', source: 'igual' }), (it) => (it.cooperative ? 1 : 0), 6)
    const prop = getProposal(st, null, [])!
    expect(prop.item.cooperative).toBe(true)
    // pone a prueba lo cooperativo en más de un duelo
    expect(pairs.filter(([a, b]) => Boolean(a.cooperative) !== Boolean(b.cooperative)).length).toBeGreaterThanOrEqual(2)
    expect(traitWeight(st, 'coop:si')).toBeGreaterThan(0.8)
  })

  it('un duelo en contra después de tres a favor no da la vuelta a la propuesta', () => {
    let st = start('boardgame', { seen: 'nueva', source: 'igual' })
    for (const [w, l] of [[coop[0], comp[0]], [coop[3], comp[5]], [coop[7], comp[11]], [comp[2], coop[9]]] as [Item, Item][]) st = applyDuelChoice(st, w, l)
    expect(getProposal(st, null, [])!.item.cooperative).toBe(true)
  })

  it('«Cooperativo» en las preguntas: todas las candidatas lo son y basta con pocos duelos', () => {
    const st0 = start('boardgame', { seen: 'nueva', source: 'igual', mood: 'coop' })
    expect(st0.pool.every((id) => itemsById.get(id)?.cooperative !== false)).toBe(true)
    const { st } = play(st0, () => Math.random(), 8)
    expect(getProposal(st, null, [])!.item.cooperative).toBe(true)
  })

  it('con pocas candidatas (4 vistas) propone enseguida, y solo de ellas', () => {
    const seen = items.filter((it) => it.type === 'movie' && !it.hidden).slice(0, 4).map((it) => it.id)
    const st0 = start('movie', { seen: 'vista', platforms: [] }, entriesOf(seen, 'seen', 'movie'))
    const { st, n } = play(st0, (it) => it.year, 8)
    expect(n).toBeLessThanOrEqual(2)
    const prop = getProposal(st, null, [])!
    expect(seen).toContain(prop.item.id)
    for (const a of prop.alternatives ?? []) expect(seen).toContain(a.id)
  })

  it('una sola candidata: propuesta sin duelos', () => {
    const one = items.find((it) => it.type === 'movie' && !it.hidden)!.id
    expect(shouldPropose(start('movie', { seen: 'vista', platforms: [] }, entriesOf([one], 'seen', 'movie')))).toBe(true)
  })

  it('«una que ya vi» con muchas vistas: propuesta y alternativas, todas vistas', () => {
    const seen = items.filter((it) => it.type === 'movie' && !it.hidden).sort((a, b) => b.popularity - a.popularity).slice(0, 40).map((it) => it.id)
    const { st } = play(start('movie', { seen: 'vista', platforms: [] }, entriesOf(seen, 'seen', 'movie')), (it) => (it.genres.includes('Drama') ? 1 : 0))
    const prop = getProposal(st, null, [])!
    for (const it of [prop.item, ...(prop.alternatives ?? [])]) expect(seen).toContain(it.id)
  })

  it('los 3 primeros duelos son de obras muy conocidas (nivel 1) o propias', () => {
    const { pairs } = play(start('movie', { seen: 'nueva', source: 'igual', platforms: [] }), () => Math.random(), 3)
    for (const [a, b] of pairs.slice(0, 3)) for (const it of [a, b]) expect(typeof it.fameTier === 'number' ? it.fameTier : 1).toBe(1)
  })

  it('«Seguir buscando» no repite ni propone la misma saga', () => {
    let { st } = play(start('movie', { seen: 'nueva', source: 'igual', platforms: [] }), (it) => (it.genres.includes('Animación') ? 1 : 0), 5)
    const first = getProposal(st, null, [])!.item
    st = rejectAndContinue(st, first.id)
    const second = getProposal(st, null, [])!.item
    expect(second.id).not.toBe(first.id)
  })

  it('automejora: lo aprendido en una sesión arranca la siguiente', () => {
    let st = start('boardgame', { seen: 'nueva', source: 'igual' })
    for (const [w, l] of [[coop[0], comp[0]], [coop[3], comp[5]], [coop[7], comp[11]]] as [Item, Item][]) st = applyDuelChoice(st, w, l)
    const memory = sessionTaste(st)
    expect(memory['coop:si']).toBeGreaterThan(0.3)
    const next = initDecideSession({ shelf: 'boardgame', items, entries: {}, rankings, profile, friends: [], answers: { seen: 'nueva', source: 'igual' }, affinity: () => null, friendPct: () => null, tasteMemory: memory })
    expect(traitWeight(next, 'coop:si')).toBeGreaterThan(0.3)
    // y sin duelos, la primera candidata ya tira a cooperativo
    expect(getProposal(next, null, [])!.item.cooperative).toBe(true)
  })

  // Antes el límite era 400 ms y el motor tardaba ~200 (480 con la máquina ocupada): en un móvil, más de un segundo por
  // duelo. Con el cálculo por obra en vez de por pareja (REVISION_MOTORES A3) tarda ~20 ms.
  it('cada duelo se calcula rápido (< 100 ms en node, con el catálogo entero)', () => {
    let st = start('movie', { seen: 'nueva', source: 'igual', platforms: [] })
    const t0 = performance.now()
    for (let i = 0; i < 4; i++) {
      const d = nextDuel(st, items, new Set(), () => 0.5)!
      st = applyDuelChoice(st, d.a, d.b)
      shouldPropose(st)
    }
    expect((performance.now() - t0) / 4).toBeLessThan(100)
  })

  // PLAN_DECIDIR M1: con la bolsa estricta («una que ya vi», «de mis guardados») el descuento por «ya la has visto» no
  // se aplica. Esta firma se fijó con el motor de antes de M1 (commit 6e62455, con M2) y no debe cambiar.
  it('M1: con «una que ya vi» o «de mis guardados» el resultado es idéntico al de antes', () => {
    const sig = (st0: Decide2State, taste: (it: Item) => number) => {
      const { st, n, pairs } = play(st0, taste, 8)
      const prop = getProposal(st, null, [])!
      const again = getProposal(rejectAndContinue(st, prop.item.id), null, [])!
      return [n, pairs.map(([a, b]) => `${a.id}/${b.id}`).join(' '), prop.item.id, prop.finalScore, (prop.alternatives ?? []).map((x) => x.id).join(' '), again.item.id].join(' | ')
    }
    const pop = (shelf: ShelfType, k: number) => items.filter((it) => it.type === shelf && !it.hidden).sort((a, b) => b.popularity - a.popularity || (a.id < b.id ? -1 : 1)).slice(0, k).map((it) => it.id)
    const vista = sig(start('movie', { seen: 'vista', platforms: [] }, entriesOf(pop('movie', 40), 'seen', 'movie')), (it) => (it.genres.includes('Drama') ? 1 : 0) + it.year / 3000)
    const guardados = sig(start('boardgame', { seen: 'nueva', source: 'pendientes' }, entriesOf(pop('boardgame', 30), 'pending', 'boardgame')), (it) => (it.cooperative ? 1 : 0) + it.popularity / 1000)
    expect(vista).toBe(STRICT_VISTA)
    expect(guardados).toBe(STRICT_GUARDADOS)
  })

  // PLAN_DECIDIR M1 (decisión 1 de Igor): quien pide «algo nuevo» no recibe la obra famosa que acaba de elegir en un
  // duelo (gana The Beatles → proponía The Beatles): casi seguro ya la conoce y no la ha apuntado.
  it('M1: para «nueva», la propuesta no es una de las obras enseñadas en los duelos', () => {
    for (const shelf of ['movie', 'boardgame'] as ShelfType[]) {
      const taste = shelf === 'movie' ? (it: Item) => (it.genres.includes('Animación') ? 1 : 0) + (it.genres.includes('Comedia') ? 0.5 : 0) : (it: Item) => (it.cooperative ? 1 : 0)
      const { st } = play(start(shelf, { seen: 'nueva', source: 'igual', platforms: [] }), taste, 6)
      const prop = getProposal(st, null, [])!
      expect(st.shown).not.toContain(prop.item.id)
    }
  })

  it('M1: tras ganar un duelo una obra muy famosa sin entrada, no es la propuesta', () => {
    let st = start('movie', { seen: 'nueva', source: 'igual', platforms: [] })
    const d = nextDuel(st, items, new Set(), () => 0.37)!
    st = applyDuelChoice(st, d.a, d.b)
    const d2 = nextDuel(st, items, new Set(), () => 0.37)!
    st = applyDuelChoice(st, d2.a, d2.b)
    const prop = getProposal(st, null, [])!
    expect([d.a.id, d2.a.id]).not.toContain(prop.item.id)
  })

  it('M1: una obra guardada como pendiente sí puede ser la propuesta aunque haya salido en un duelo', () => {
    const famous = coop[0]
    let st = start('boardgame', { seen: 'nueva', source: 'igual' }, entriesOf([famous.id], 'pending', 'boardgame'))
    for (const l of [comp[0], comp[5], comp[11]]) st = applyDuelChoice(st, famous, l)
    expect(getProposal(st, null, [])!.item.id).toBe(famous.id)
  })

  it('las parejas puntuadas no dependen del atajo de cálculo: valor de la información finito y no negativo', () => {
    let st = start('boardgame', { seen: 'nueva', source: 'igual' })
    for (let i = 0; i < 5; i++) {
      const d = nextDuel(st, items, new Set(), () => 0.37)!
      expect(Number.isFinite(d.infoGain)).toBe(true)
      expect(d.infoGain).toBeGreaterThanOrEqual(0)
      expect(d.a.id).not.toBe(d.b.id)
      st = applyDuelChoice(st, d.a, d.b)
    }
  })
})

/* PLAN_DECIDIR M2 · que la calidad pese: catálogo sintético, sin depender de los datos reales */
describe('Decidir v2 · la previa de calidad (M2)', () => {
  const mk = (id: string, shelf: ShelfType, o: Partial<Item> = {}): Item => ({
    id, type: shelf, title: id, year: 2000, creator: 'x' + id, genres: ['Drama'], synopsis: '', posterUrl: null, popularity: 50, ...o,
  } as Item)
  const startOn = (list: Item[], shelf: ShelfType, answers: Record<string, string | string[]> = { seen: 'nueva', source: 'igual' }) =>
    initDecideSession({ shelf, items: list, entries: {}, rankings, profile, friends: [], answers, affinity: () => null, friendPct: () => null, recentOrienters: [], userVec: null, doubtfulItems: {} })

  it('dos obras con los mismos rasgos y distinta calidad: se propone la mejor', () => {
    const filler = Array.from({ length: 20 }, (_, i) => mk(`f${i}`, 'movie', { voteAvg: 5 + (i % 5) * 0.2, voteCount: 500 + i * 100, genres: ['Drama'] }))
    const good = mk('good', 'movie', { voteAvg: 9.0, voteCount: 5000, genres: ['Drama'], creator: 'z' })
    const bad = mk('bad', 'movie', { voteAvg: 4.0, voteCount: 5000, genres: ['Drama'], creator: 'z' })
    const st = startOn([...filler, bad, good], 'movie')
    expect(st.base['good']).toBeGreaterThan(st.base['bad'])
    expect(getProposal(st, null, [])!.item.id).toBe('good')
  })

  it('«Comedy» y «Comedia» puntúan igual en el ánimo', () => {
    const list = [mk('en', 'movie', { genres: ['Comedy'], voteAvg: 7, voteCount: 1000 }), mk('es', 'movie', { genres: ['Comedia'], voteAvg: 7, voteCount: 1000 }), mk('dr', 'movie', { genres: ['Drama'], voteAvg: 7, voteCount: 1000 }), mk('dr2', 'movie', { genres: ['Drama'], voteAvg: 7, voteCount: 1000 })]
    const st = startOn(list, 'movie', { seen: 'nueva', source: 'igual', mood: 'risas' })
    expect(st.base['en']).toBeCloseTo(st.base['es'], 6)
    expect(st.base['en']).toBeGreaterThan(st.base['dr'])
  })

  it('una obra con trend 1 recibe más previa que con 0 (el dato es un número, no un mapa)', () => {
    const list = [mk('t1', 'movie', { trend: 1, voteAvg: 7, voteCount: 1000 }), mk('t0', 'movie', { trend: 0, voteAvg: 7, voteCount: 1000 }), mk('t2', 'movie', { voteAvg: 7, voteCount: 1000 }), mk('t3', 'movie', { voteAvg: 7, voteCount: 1000 })]
    const st = startOn(list, 'movie')
    expect(st.base['t1']).toBeGreaterThan(st.base['t0'])
  })

  it('en una estantería sin voteAvg (artistas) la previa no es toda ceros', () => {
    const list = Array.from({ length: 12 }, (_, i) => mk(`a${i}`, 'artist', { popularity: 10 + i * 7, notoriety: 0.1 + i * 0.07, voteAvg: undefined }))
    const st = startOn(list, 'artist')
    const vals = st.pool.map((id) => st.base[id])
    expect(Math.max(...vals) - Math.min(...vals)).toBeGreaterThan(0.3)
    expect(vals.reduce((s, x) => s + x, 0) / vals.length).toBeCloseTo(0, 6)
  })
})
