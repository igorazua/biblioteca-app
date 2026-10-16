import { describe, it, expect } from 'vitest'
import {
  loadShelfEngine,
  axesOf,
  vecOf,
  sim,
  neighbors,
  macroOf,
  microOf,
  centroid,
  simWithCentroid,
  crossOf,
} from './features'

describe('features.ts (MOTOR §6.4, ENRIQUECIMIENTO E10)', () => {
  it('degrades gracefully when shelf engine file is not yet loaded', () => {
    // If not loaded, axesOf and vecOf return null
    expect(axesOf('movie', 'movie:nonexistent')).toBeNull()
    expect(vecOf('movie', 'movie:nonexistent')).toBeNull()
    // sim returns neutral 0.5 fallback
    expect(sim('movie', 'movie:a', 'movie:b')).toBe(0.5)
    // Same ID returns 1.0
    expect(sim('movie', 'movie:a', 'movie:a')).toBe(1.0)
    // Neighbors returns empty list
    expect(neighbors('movie', 'movie:a')).toEqual([])
    // Clusters return null
    expect(macroOf('movie', 'movie:a')).toBeNull()
    expect(microOf('movie', 'movie:a')).toBeNull()
    // Cross returns empty list
    expect(crossOf('movie:a')).toEqual([])
  })

  it('calculates centroid and simWithCentroid with fallback data', () => {
    // centroid on non-loaded shelf returns null
    const c = centroid('movie', ['movie:a', 'movie:b'])
    expect(c).toBeNull()

    // simWithCentroid with mock centroid
    const mockCentroid = new Float32Array(48).fill(0.5)
    const s = simWithCentroid('movie', mockCentroid, 'movie:a')
    expect(s).toBe(0.5) // graceful fallback
  })
})
