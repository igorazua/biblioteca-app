import { describe, it, expect, vi } from 'vitest'
import { items as seedItems, type ImportRow, type Item } from '@biblioteca/core'
import { matchRows } from './matchRows'
import { rowsFromContent } from './readFile'

// La parte pura de useImportFlow: del catálogo local al servidor, con las dudosas y las no encontradas.
const seedMovie = seedItems.find((i) => i.type === 'movie')!
const row = (over: Partial<ImportRow> = {}): ImportRow => ({ type: 'movie', title: 'zzz obra inexistente', status: 'seen', ...over })
const noQids = async () => new Map<string, string>()

describe('matchRows', () => {
  it('casa con el catálogo local por título y año, sin llamar al servidor', async () => {
    const invoke = vi.fn()
    const r = await matchRows([row({ title: seedMovie.title, year: seedMovie.year })], {
      seedItems,
      invoke,
      addItems: () => {},
      getItem: () => undefined,
      imdbToQids: noQids,
    })
    expect(r.matched).toHaveLength(1)
    expect(r.matched[0].item.id).toBe(seedMovie.id)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('sin servidor, lo que no está en el catálogo local queda «sin encontrar»', async () => {
    const r = await matchRows([row()], { seedItems, invoke: null, addItems: () => {}, getItem: () => undefined, imdbToQids: noQids })
    expect(r.matched).toHaveLength(0)
    expect(r.none).toHaveLength(1)
  })

  it('reparte las respuestas del servidor en seguras, dudosas y sin encontrar, y avisa del progreso', async () => {
    const cloudItem = { id: 'cloud:1', type: 'movie', title: 'Nube' } as unknown as Item
    const added: Item[] = []
    const progress: Array<{ current: number; total: number } | null> = []
    const invoke = vi.fn(async (body: any) => {
      expect(body.action).toBe('match')
      return {
        error: null,
        data: {
          matches: [
            { status: 'sure', item: cloudItem },
            { status: 'doubt', candidates: [{ title: 'Otra', year: 2000, ref: { source: 'wikidata', id: 'Q1' } }] },
            { status: 'none' },
          ],
        },
      }
    })
    const rows = [row({ title: 'a1 zzz' }), row({ title: 'b2 zzz' }), row({ title: 'c3 zzz' })]
    const r = await matchRows(rows, {
      seedItems,
      invoke,
      addItems: (l) => added.push(...l),
      getItem: () => undefined,
      imdbToQids: noQids,
      onProgress: (p) => progress.push(p),
    })
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(r.matched.map((m) => m.item.id)).toEqual(['cloud:1'])
    expect(added.map((i) => i.id)).toEqual(['cloud:1'])
    expect(r.doubts).toHaveLength(1)
    expect(r.doubts[0].row.title).toBe('b2 zzz')
    expect(r.none.map((n) => n.title)).toEqual(['c3 zzz'])
    expect(progress[0]).toEqual({ current: 0, total: 3 })
  })

  it('si el servidor falla, todo el lote queda «sin encontrar» y el resto sigue', async () => {
    const invoke = vi.fn().mockRejectedValue(new Error('red'))
    const r = await matchRows([row({ title: 'x1 zzz' }), row({ title: 'x2 zzz' })], {
      seedItems,
      invoke,
      addItems: () => {},
      getItem: () => undefined,
      imdbToQids: noQids,
    })
    expect(r.none).toHaveLength(2)
  })

  it('usa la obra del seed que sustituye a una gemela fusionada que devuelve la nube', async () => {
    const twin = { id: 'twin-id', type: 'movie', title: 'Gemela' } as unknown as Item
    const invoke = async () => ({ error: null, data: { matches: [{ status: 'sure', item: twin }] } })
    const r = await matchRows([row({ title: 'q zzz' })], {
      seedItems,
      invoke,
      addItems: () => {},
      getItem: () => seedMovie,
      imdbToQids: noQids,
    })
    expect(r.matched[0].item.id).toBe(seedMovie.id)
  })
})

describe('rowsFromContent', () => {
  it('lee un CSV de Netflix como texto', () => {
    const csv = 'Title,Date\n"Dark: Temporada 1: Secretos","1/2/2023"\n'
    const rows = rowsFromContent('netflix', 'NetflixViewingHistory.csv', csv)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0].status).toBe('seen')
  })

  it('un ZIP se lee como bytes, y si no es un ZIP válido lanza el error que FileSheet enseña como «no hemos podido leer ese archivo»', () => {
    expect(() => rowsFromContent('letterboxd', 'export.ZIP', new Uint8Array([1, 2, 3]))).toThrow()
  })
})
