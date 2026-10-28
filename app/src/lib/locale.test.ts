import { describe, it, expect } from 'vitest'
import { displayPoster, displayTitle, localVersion, searchTitles } from './locale'
import type { Item } from '../types'

// Obra mínima: solo lo que leen las funciones de idioma
const base = {
  title: 'El padrino',
  originalTitle: 'The Godfather',
  posterUrl: 'https://ej.test/original.webp',
} as Pick<Item, 'title' | 'originalTitle' | 'posterUrl' | 'local'>

describe('versión local por idioma', () => {
  it('con título y carátula locales usa las dos, juntas', () => {
    const obra = { ...base, local: { es: { title: 'El padrino ES', poster: 'https://ej.test/es.webp' } } }
    expect(displayTitle(obra, 'es')).toBe('El padrino ES')
    expect(displayPoster(obra, 'es')).toBe('https://ej.test/es.webp')
  })

  it('con solo título local no usa ninguna: se enseña la original completa', () => {
    const obra = { ...base, local: { es: { title: 'El padrino ES' } } }
    expect(displayTitle(obra, 'es')).toBe('El padrino')
    expect(displayPoster(obra, 'es')).toBe('https://ej.test/original.webp')
    expect(localVersion(obra, 'es')).toBeNull()
  })

  it('sin local, o con un idioma que no existe, se ve lo de siempre', () => {
    expect(displayTitle(base, 'es')).toBe('El padrino')
    expect(displayPoster(base, 'es')).toBe('https://ej.test/original.webp')
    const obra = { ...base, local: { es: { title: 'El padrino ES', poster: 'https://ej.test/es.webp' } } }
    expect(displayTitle(obra, 'en')).toBe('El padrino')
    expect(displayPoster(obra, undefined)).toBe('https://ej.test/original.webp')
  })

  it('la búsqueda encuentra la obra por cualquiera de sus títulos, sin quitar ninguno', () => {
    const obra = { ...base, local: { es: { title: 'El padrino ES', poster: 'https://ej.test/es.webp' } } }
    expect(searchTitles(obra)).toEqual(['El padrino', 'The Godfather', 'El padrino ES'])
  })
})
