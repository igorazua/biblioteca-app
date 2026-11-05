import { describe, expect, it } from 'vitest'
import LZString from 'lz-string'
import { decodeList, decodeProfile, encodeList, encodeProfile, listUrl, type SharedList } from './share'

const known = new Set(['movie:el-hoyo-2019', 'book:patria-2016', 'series:dark-2017'])
const isKnown = (id: string) => known.has(id)

const list: SharedList = {
  t: 'Para un domingo de manta',
  d: 'Pelis, series y un libro «con ñ y emojis 🍿»',
  a: 'Igor',
  c: '#F5B544',
  i: [['movie:el-hoyo-2019', 'Ve con el estómago vacío'], ['book:patria-2016'], ['series:dark-2017', 'Con papel y boli']],
}

describe('share: listas', () => {
  it('codifica y decodifica sin pérdida (ida y vuelta)', () => {
    const out = decodeList(encodeList(list), isKnown)!
    expect(out.list).toEqual(list)
    expect(out.items).toEqual(list.i)
    expect(out.missing).toBe(0)
  })

  it('el payload es seguro para ir en una URL', () => {
    const url = listUrl('https://ejemplo.app', list)
    expect(url.startsWith('https://ejemplo.app/l/')).toBe(true)
    expect(url.slice('https://ejemplo.app/l/'.length)).toMatch(/^[A-Za-z0-9+\-$]+$/)
    expect(new URL(url).pathname.startsWith('/l/')).toBe(true)
  })

  it('comprime: una lista de 30 items cabe en una URL razonable', () => {
    const big: SharedList = { ...list, i: Array.from({ length: 30 }, (_, k) => [`movie:titulo-largo-de-ejemplo-${k}-2019`, 'nota']) }
    expect(encodeList(big).length).toBeLessThan(1500)
  })

  it('descarta los items desconocidos sin romper y los cuenta', () => {
    const l = { ...list, i: [...list.i, ['movie:no-existe-1999'] as [string]] }
    const out = decodeList(encodeList(l as SharedList), isKnown)!
    expect(out.items).toHaveLength(3)
    expect(out.missing).toBe(1)
  })

  it('devuelve null con links corruptos o vacíos', () => {
    expect(decodeList('', isKnown)).toBeNull()
    expect(decodeList('esto-no-es-un-link', isKnown)).toBeNull()
    expect(decodeList(LZString.compressToEncodedURIComponent('{"x":1}'), isKnown)).toBeNull()
    expect(decodeList(LZString.compressToEncodedURIComponent('no json'), isKnown)).toBeNull()
  })

  it('rellena autor y color si faltan', () => {
    const raw = LZString.compressToEncodedURIComponent(JSON.stringify({ t: 'x', i: [['book:patria-2016']] }))
    const out = decodeList(raw, isKnown)!
    expect(out.list.a).toBe('Alguien')
    expect(out.list.c).toBe('#F5B544')
  })
})

describe('share: perfiles', () => {
  it('ida y vuelta, y filtra ids desconocidos', () => {
    const p = { k: 'p' as const, n: 'Igor', c: '#6FCF97', top: { movie: ['movie:el-hoyo-2019', 'movie:fantasma'], book: ['book:patria-2016'] } }
    const out = decodeProfile(encodeProfile(p), isKnown)!
    expect(out.n).toBe('Igor')
    expect(out.top.movie).toEqual(['movie:el-hoyo-2019'])
    expect(out.top.book).toEqual(['book:patria-2016'])
  })

  it('rechaza un payload de lista como si fuera un perfil', () => {
    expect(decodeProfile(encodeList(list), isKnown)).toBeNull()
    expect(decodeProfile('basura', isKnown)).toBeNull()
  })
})
