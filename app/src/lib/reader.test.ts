import { describe, expect, it } from 'vitest'
import { bookFit, scoreReader, topMotivations, QUESTIONS } from './reader'
import type { Item } from '../types'

const book = (genres: string[], depth: Item['depth']): Item => ({ id: 'book:x', type: 'book', title: 'x', year: 2000, creator: 'a', genres, synopsis: '', posterUrl: null, popularity: 50, depth })

describe('test de lector', () => {
  it('suma motivaciones y toma la profundidad elegida', () => {
    const r = scoreReader([1, 0, 0, 1, 1]) // intriga, ligero
    expect(r.depth).toBe('ligera')
    expect(topMotivations(r, 1)).toEqual(['intriga'])
  })
  it('cualquier respuesta posible produce un perfil válido', () => {
    const r = scoreReader(QUESTIONS.map(() => 0))
    expect(topMotivations(r).length).toBeGreaterThan(0)
  })
  it('un thriller corto encaja mejor con un lector de intriga ligera que un clásico denso', () => {
    const r = scoreReader([1, 1, 0, 1, 1])
    expect(bookFit(book(['Thriller'], 'ligera'), r)).toBeGreaterThan(bookFit(book(['Clásico'], 'densa'), r))
  })
  it('sin perfil no puntúa', () => {
    expect(bookFit(book(['Thriller'], 'media'))).toBe(0)
  })
})
