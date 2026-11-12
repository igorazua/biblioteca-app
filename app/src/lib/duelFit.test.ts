import { describe, expect, it } from 'vitest'
import { getDuelFit, setDuelFit, DUEL_FIT_KEY } from './duelFit'

// Caso de lib/posterShape.test.ts que prueba el guardado del selector en la PWA; el resto vive en packages/core.
describe('T31: Duelos de juegos de mesa: tamaños de cartas adaptables', () => {
  it('persistencia de duelFit en localStorage con fallback seguro', () => {
    const store: Record<string, string> = {}
    const mockStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k])
      },
    }
    const orig = (globalThis as any).localStorage
    ;(globalThis as any).localStorage = mockStorage
    try {
      mockStorage.removeItem(DUEL_FIT_KEY)
      expect(getDuelFit()).toBe('area')

      setDuelFit('alto')
      expect(getDuelFit()).toBe('alto')

      setDuelFit('caja')
      expect(getDuelFit()).toBe('caja')

      setDuelFit('area')
      expect(getDuelFit()).toBe('area')
    } finally {
      ;(globalThis as any).localStorage = orig
    }
  })
})
