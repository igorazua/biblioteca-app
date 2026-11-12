// Selector de encaje de los duelos de juegos de mesa (Ajustes, T31), guardado en localStorage. Antes vivía en
// lib/posterShape.ts; @biblioteca/core se queda con `duelCardSize` y `DUEL_FIT_DEFAULT` y la PWA guarda la elección.
import { DUEL_FIT_DEFAULT, type DuelFit } from '@biblioteca/core/src/lib/posterShape'

export type { DuelFit }
export const DUEL_FIT_KEY = 'duelFit'
export const DUEL_FIT_EVENT = 'duel-fit-change'

export function getDuelFit(): DuelFit {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(DUEL_FIT_KEY)
      if (val === 'alto' || val === 'area' || val === 'caja') return val
    }
  } catch {}
  return DUEL_FIT_DEFAULT
}

export function setDuelFit(fit: DuelFit): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DUEL_FIT_KEY, fit)
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(DUEL_FIT_EVENT))
    }
  } catch {}
}
