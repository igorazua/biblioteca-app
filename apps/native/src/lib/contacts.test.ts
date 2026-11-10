// Pruebas de las partes de contactos con riesgo para los datos: un solo número por contacto en E.164, y el cruce que
// recuerda por hash lo ya enviado (nunca el número) y solo manda los nuevos.
import { describe, it, expect } from 'vitest'
import { dedupeByPhone, matchContactsWith, pickPhone, planMatch, MAX_PER_CALL, type CrossCache, type MatchDeps, type PickedContact } from './contacts'

const fakeHash = async (p: string) => `h(${p})`

function deps(over: Partial<MatchDeps> & { cache?: CrossCache; onApp?: Record<string, string> } = {}) {
  const calls: string[][] = []
  const state = { cache: over.cache ?? ({} as CrossCache) }
  const onApp = over.onApp ?? {}
  const d: MatchDeps = {
    rpc: async (phones) => {
      calls.push(phones)
      const data = phones.flatMap((p, i) => (onApp[p] ? [{ idx: i + 1, user_id: onApp[p], display_name: `Nombre ${onApp[p]}`, avatar_url: null }] : []))
      return { data, error: null }
    },
    hash: fakeHash,
    loadCache: async () => state.cache,
    saveCache: async (c) => {
      state.cache = c
    },
    now: () => 1_000_000,
    ...over,
  }
  return { d, calls, state }
}

const contact = (n: number): PickedContact => ({ name: `C${n}`, phone: `+346000${String(n).padStart(5, '0')}` })

describe('pickPhone', () => {
  it('normaliza a E.164 con el país y descarta lo que no es un número', () => {
    expect(pickPhone([{ number: '600 11 22 33' }], 'ES')).toBe('+34600112233')
    expect(pickPhone([{ number: 'abc' }, { number: '' }], 'ES')).toBeNull()
    expect(pickPhone(undefined)).toBeNull()
  })

  it('prefiere el móvil por etiqueta, luego el principal, luego el primero válido', () => {
    expect(pickPhone([{ number: '911 22 33 44', label: 'home' }, { number: '600 11 22 33', label: 'Mobile' }])).toBe('+34600112233')
    expect(pickPhone([{ number: '911 22 33 44' }, { number: '600 11 22 33', isPrimary: true }])).toBe('+34600112233')
    expect(pickPhone([{ number: 'xx' }, { number: '911 22 33 44' }, { number: '600 11 22 33' }])).toBe('+34911223344')
  })
})

describe('dedupeByPhone', () => {
  it('deja un contacto por número', () => {
    const a = { name: 'A', phone: '+34600000001' }
    expect(dedupeByPhone([a, { name: 'B', phone: '+34600000001' }, { name: 'C', phone: '+34600000002' }])).toEqual([a, { name: 'C', phone: '+34600000002' }])
  })
})

describe('planMatch', () => {
  it('no reenvía lo cruzado hace poco y sí lo caducado (7 días sin éxito, 30 con él)', () => {
    const now = 100 * 24 * 3600_000
    const cs = [contact(1), contact(2), contact(3), contact(4)]
    const hs = cs.map((c) => `h(${c.phone})`)
    const cache: CrossCache = {
      [hs[0]]: { at: now - 1000 }, // fallo reciente: no se envía
      [hs[1]]: { at: now - 8 * 24 * 3600_000 }, // fallo caducado: se envía
      [hs[2]]: { at: now - 10 * 24 * 3600_000, m: { userId: 'u', displayName: 'U', avatarUrl: null } }, // acierto antiguo pero de menos de 30 días
    }
    const { toSend, known } = planMatch(cs, hs, cache, now)
    expect(toSend.map((x) => x.contact.phone)).toEqual([cs[1].phone, cs[3].phone])
    expect(known).toHaveLength(2)
  })
})

describe('matchContactsWith', () => {
  it('parte en tandas de 500 y devuelve a quienes ya están en la app', async () => {
    const cs = Array.from({ length: 1201 }, (_, i) => contact(i))
    const { d, calls } = deps({ onApp: { [cs[3].phone]: 'u3', [cs[700].phone]: 'u700', [cs[1200].phone]: 'u1200' } })
    const r = await matchContactsWith(d, cs)
    expect(calls.map((c) => c.length)).toEqual([MAX_PER_CALL, MAX_PER_CALL, 201])
    expect(r.sent).toBe(1201)
    expect(r.onApp.map((c) => c.userId).sort()).toEqual(['u1200', 'u3', 'u700'])
    expect(r.others).toHaveLength(1198)
  })

  it('la segunda vez solo envía los números nuevos y sigue mostrando a los ya encontrados', async () => {
    const cs = [contact(1), contact(2), contact(3)]
    const { d, calls, state } = deps({ onApp: { [cs[0].phone]: 'u1' } })
    await matchContactsWith(d, cs)
    expect(calls).toHaveLength(1)

    const more = [...cs, contact(4)]
    const r2 = await matchContactsWith(d, more)
    expect(calls).toHaveLength(2)
    expect(calls[1]).toEqual([contact(4).phone]) // solo el nuevo
    expect(r2.sent).toBe(1)
    expect(r2.onApp.map((c) => c.userId)).toEqual(['u1'])
    expect(r2.others.map((c) => c.phone)).toEqual([cs[1].phone, cs[2].phone, contact(4).phone])
    // sin nada nuevo no hay ninguna llamada
    const r3 = await matchContactsWith(d, more)
    expect(calls).toHaveLength(2)
    expect(r3.sent).toBe(0)
    // el almacén solo guarda claves de hash, nunca el número en claro ni el nombre del contacto
    const keys = Object.keys(state.cache)
    for (const c of more) expect(keys.some((k) => k === c.phone)).toBe(false)
    expect(JSON.stringify(state.cache)).not.toContain('"C1"')
  })

  it('quita de los resultados recordados a quien ya es amigo', async () => {
    const cs = [contact(1), contact(2)]
    const { d } = deps({ onApp: { [cs[0].phone]: 'u1' } })
    await matchContactsWith(d, cs)
    const r = await matchContactsWith(d, cs, new Set(['u1']))
    expect(r.onApp).toEqual([])
    expect(r.others.map((c) => c.phone)).toEqual([cs[1].phone]) // el amigo no sale ni como «invitar»
  })

  it('sin la migración 0006 todos van a invitar y no se recuerda nada', async () => {
    const { d, state } = deps({ rpc: async () => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } }) })
    const r = await matchContactsWith(d, [contact(1)])
    expect(r.onApp).toEqual([])
    expect(r.others).toHaveLength(1)
    expect(state.cache).toEqual({})
  })

  it('si falla a mitad (límite diario) conserva lo ya cruzado y devuelve lo parcial en el error', async () => {
    const cs = Array.from({ length: 600 }, (_, i) => contact(i))
    let n = 0
    const { d, state } = deps({
      rpc: async () => {
        n++
        if (n === 2) return { data: null, error: { message: 'límite diario' } }
        return { data: [{ idx: 1, user_id: 'u', display_name: 'U', avatar_url: null }], error: null }
      },
    })
    await expect(matchContactsWith(d, cs)).rejects.toMatchObject({ message: 'límite diario', partial: { sent: MAX_PER_CALL } })
    expect(Object.keys(state.cache)).toHaveLength(MAX_PER_CALL) // la primera tanda no se repetirá
  })
})
