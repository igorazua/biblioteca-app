import { ACTIVE_SHELVES, type ShelfType } from '@biblioteca/core'
import { useStore } from '../store/useStore'

/** Estanterías activas con las elegidas en el onboarding (`settings.shelves`) primero y el resto después, en su orden. */
export function orderShelves(chosen?: ShelfType[]): ShelfType[] {
  if (!chosen?.length) return [...ACTIVE_SHELVES]
  const first = ACTIVE_SHELVES.filter((s) => chosen.includes(s))
  return [...first, ...ACTIVE_SHELVES.filter((s) => !chosen.includes(s))]
}

export function useMyShelves(): ShelfType[] {
  const chosen = useStore((s) => s.settings.shelves)
  return orderShelves(chosen)
}
