// Igualdad de Decidir con la PWA de antes (web-congelada-v1), con localStorage lleno de obras dudosas y pasadas.
// `decideGolden.json` es el mismo golden que usa la nativa: salió de ejecutar el motor de la PWA (etiqueta
// web-congelada-v1, app/src) con este mismo localStorage, la misma fecha fija y el mismo generador de azar.
// Aquí se repite con @biblioteca/core + `startDecide` / `skipDecide` (lib/decideMemory.ts) sobre localStorage simulado.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  DOUBTFUL_STORAGE_KEY,
  PASSES_STORAGE_KEY,
  applyDuelChoice,
  getProposal,
  initDecideSession,
  items,
  nextDuel,
  shouldPropose,
  type Decide2State,
} from '@biblioteca/core'
import golden from '../../../apps/native/src/store/testing/decideGolden.json'
import { loadShelfEngine } from '../data/loadData'
import { loadDoubtfulItems, loadPassedItems, resetDecideMemory, skipDecide, startDecide } from './decideMemory'

const mem = new Map<string, string>()
const storage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
}

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
const stored = () => ({
  doubtful: JSON.parse(storage.getItem(DOUBTFUL_STORAGE_KEY) ?? '{}'),
  passed: JSON.parse(storage.getItem(PASSES_STORAGE_KEY) ?? '{}'),
})
const fill = () => {
  mem.clear()
  storage.setItem(DOUBTFUL_STORAGE_KEY, JSON.stringify(golden.doubtful))
  storage.setItem(PASSES_STORAGE_KEY, JSON.stringify(golden.passed))
}

describe('Decidir: obras dudosas y pasadas en localStorage, igual que la PWA de antes', { timeout: 120_000 }, () => {
  beforeAll(async () => {
    expect(await loadShelfEngine('movie')).not.toBeNull()
    vi.stubGlobal('localStorage', storage)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(golden.now)
    resetDecideMemory()
    fill()
  })
  afterAll(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('la memoria se lee de localStorage tal cual estaba', () => {
    expect(sorted(loadDoubtfulItems())).toEqual(sorted(golden.doubtful))
    expect(sorted(loadPassedItems())).toEqual(sorted(golden.passed))
  })

  it('control: pasar las dudosas guardadas a core al iniciar SÍ cambia el reconocimiento (por eso existe startDecide)', () => {
    const wrong = initDecideSession({ ...input(), doubtfulItems: loadDoubtfulItems() })
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

  it('una sesión completa con dos «Pasar»: mismos duelos, mismos efectos, mismo almacenamiento y misma propuesta', () => {
    fill()
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
    expect({ ...snap(st, golden.watch), storage: stored(), preferFameOrOwn: st.preferFameOrOwn }).toEqual(golden.afterSkip1)
    // duelo 2: pasar. La obra B ya estaba dudosa y pasada dos veces: sube a 3 y se renueva la fecha
    d = step(st)!
    st = skipDecide(st, d.a, d.b, 700)
    expect({ ...snap(st, golden.watch), storage: stored(), preferFameOrOwn: st.preferFameOrOwn }).toEqual(golden.afterSkip2)
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
    expect({ ...snap(st, golden.watch), storage: stored() }).toEqual(golden.final)
  })

  it('el almacenamiento conserva las dudosas antiguas al guardar las nuevas', () => {
    const { doubtful } = stored()
    for (const id of Object.keys(golden.doubtful)) expect(doubtful[id]).toBeDefined()
  })

  it('pasar dos veces la misma pareja desde el mismo estado: la segunda cuenta con lo guardado y las deja dudosas', () => {
    mem.clear()
    resetDecideMemory() // si falta la clave, la PWA devolvía lo que tuviera en memoria (passedMem)
    const st = startDecide(input())
    const d = nextDuel(st, items, new Set(), rng)!
    const once = skipDecide(st, d.a, d.b, 2700)
    expect(once.doubtfulItems[d.a.id]).toBeUndefined()
    expect(once.preferFameOrOwn).toBe(false)
    const twice = skipDecide(st, d.a, d.b, 2700) // mismo estado de partida, como hacía el test de la v1 con localStorage
    expect(twice.doubtfulItems[d.a.id]).toBeDefined()
    expect(twice.doubtfulItems[d.b.id]).toBeDefined()
    expect(twice.preferFameOrOwn).toBe(true)
    expect(stored().passed[d.a.id]).toBe(2)
  })

  it('sin localStorage los conteos se quedan en memoria (modo privado)', () => {
    vi.stubGlobal('localStorage', undefined)
    try {
      resetDecideMemory()
      const st = startDecide(input())
      expect(st.doubtfulItems).toEqual({})
      const d = nextDuel(st, items, new Set(), rng)!
      skipDecide(st, d.a, d.b, 1000)
      const again = skipDecide(st, d.a, d.b, 1000)
      expect(loadPassedItems()[d.a.id]).toBe(2)
      expect(again.preferFameOrOwn).toBe(true)
    } finally {
      vi.stubGlobal('localStorage', storage)
    }
  })
})
