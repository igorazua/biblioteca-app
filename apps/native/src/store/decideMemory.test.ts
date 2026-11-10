// Igualdad de Decidir con la PWA, con el almacenamiento lleno de obras dudosas y pasadas (NOTAS_FASE2, «Decidir: ojo con las obras dudosas»).
// `testing/decideGolden.json` salió de ejecutar el motor de la PWA (etiqueta web-congelada-v1, app/src) con el mismo `localStorage`,
// la misma fecha fija y el mismo generador de azar. Aquí se repite con `startDecide` / `skipDecide` y AsyncStorage simulado.
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  DOUBTFUL_STORAGE_KEY,
  PASSES_STORAGE_KEY,
  applyDuelChoice,
  getProposal,
  initDecideSession,
  items,
  nextDuel,
  setShelfEngine,
  shouldPropose,
  type Decide2State,
  type ShelfEngine,
} from '@biblioteca/core'
import golden from './testing/decideGolden.json'
import { flushDecideMemory, getDoubtfulItems, getPassedItems, loadDecideMemory, resetDecideMemory, skipDecide, startDecide } from './decideMemory'

const profile = { name: 'Test', avatarColor: '#fff', platforms: [], country: 'ES', lang: 'es' }
const rankings = { movie: [], series: [], book: [], artist: [], boardgame: [], song: [] }
const answers = { seen: 'nueva', source: 'igual' }
const input = () => ({
  shelf: 'movie' as const, items, entries: {}, rankings, profile, friends: [], answers,
  affinity: () => null, friendPct: () => null, recentOrienters: [], userVec: null,
})
const rng = () => 0.37
const sorted = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).sort())
const snap = (s: Decide2State, ids: string[]) => ({
  doubtful: sorted(s.doubtfulItems),
  recog: Object.fromEntries(ids.map((id) => [id, s.recogMap[id]])),
})
const stored = async () => ({
  doubtful: JSON.parse((await AsyncStorage.getItem(DOUBTFUL_STORAGE_KEY)) ?? '{}'),
  passed: JSON.parse((await AsyncStorage.getItem(PASSES_STORAGE_KEY)) ?? '{}'),
})

describe('Decidir: obras dudosas y pasadas, igual que la PWA', { timeout: 120_000 }, () => {
  beforeAll(async () => {
    const engine = JSON.parse(readFileSync(new URL('../../../../app/src/data/engine/movie.json', import.meta.url), 'utf8')) as ShelfEngine
    setShelfEngine('movie', engine)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(golden.now)
    await AsyncStorage.setItem(DOUBTFUL_STORAGE_KEY, JSON.stringify(golden.doubtful))
    await AsyncStorage.setItem(PASSES_STORAGE_KEY, JSON.stringify(golden.passed))
    resetDecideMemory()
    await loadDecideMemory()
  })
  afterAll(() => {
    vi.useRealTimers()
  })

  it('la memoria se lee del almacenamiento tal cual estaba', () => {
    expect(sorted(getDoubtfulItems())).toEqual(sorted(golden.doubtful))
    expect(sorted(getPassedItems())).toEqual(sorted(golden.passed))
  })

  it('control: pasar las dudosas guardadas a core al iniciar SÍ cambia el reconocimiento (por eso existe startDecide)', () => {
    const wrong = initDecideSession({ ...input(), doubtfulItems: getDoubtfulItems() })
    const right = startDecide(input())
    const diff = golden.watch.filter((id) => wrong.recogMap[id] !== right.recogMap[id])
    expect(diff.length).toBeGreaterThan(0)
  })

  it('al iniciar: mismo estado que la PWA; las dudosas guardadas están en el estado pero recog no las penaliza', () => {
    const st = startDecide(input())
    expect(st.pool.slice(0, 40)).toEqual(golden.initial.pool)
    expect(st.pool.length).toBe(golden.initial.poolSize)
    expect(snap(st, golden.watch)).toEqual({ doubtful: golden.initial.doubtful, recog: golden.initial.recog })
    expect(Object.keys(st.input).sort()).toEqual(golden.initial.inputKeys)
  })

  it('una sesión completa con dos «Pasar»: mismos duelos, mismos efectos, mismo almacenamiento y misma propuesta', async () => {
    let st = startDecide(input())
    const pairs: string[][] = []
    const step = (s: Decide2State) => {
      const d = nextDuel(s, items, new Set(), rng)
      if (!d) return null
      pairs.push([d.a.id, d.b.id])
      return d
    }
    // duelo 1: pasar. Una de las dos obras ya se había pasado una vez, así que pasa a dudosa y recog la baja a la mitad
    let d = step(st)!
    st = skipDecide(st, d.a, d.b, 900)
    await flushDecideMemory()
    expect({ ...snap(st, golden.watch), storage: await stored(), preferFameOrOwn: st.preferFameOrOwn }).toEqual(golden.afterSkip1)
    // duelo 2: pasar. La obra B ya estaba dudosa y pasada dos veces: sube a 3 y se renueva la fecha
    d = step(st)!
    st = skipDecide(st, d.a, d.b, 700)
    await flushDecideMemory()
    expect({ ...snap(st, golden.watch), storage: await stored(), preferFameOrOwn: st.preferFameOrOwn }).toEqual(golden.afterSkip2)
    // el resto: gana la más popular, hasta proponer
    let n = 0
    while (n < 10 && !shouldPropose(st)) {
      d = step(st)!
      if (!d) break
      const [w, l] = d.a.popularity >= d.b.popularity ? [d.a, d.b] : [d.b, d.a]
      st = applyDuelChoice(st, w, l)
      n++
    }
    const prop = getProposal(st, null, [])
    expect(pairs).toEqual(golden.pairs)
    expect(prop ? { id: prop.item.id, reasons: prop.reasons } : null).toEqual(golden.proposal)
    expect({ ...snap(st, golden.watch), storage: await stored() }).toEqual(golden.final)
  })

  it('el almacenamiento conserva las dudosas antiguas al guardar las nuevas', async () => {
    const { doubtful } = await stored()
    for (const id of Object.keys(golden.doubtful)) expect(doubtful[id]).toBeDefined()
  })
})
