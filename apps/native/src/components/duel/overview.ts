import { useMemo, useRef } from 'react'
import { useIsFocused } from 'expo-router'
import { computeCompareOverview, type CompareOverviewData, type PlannedDuel } from '@biblioteca/core'
import { useStore } from '../../store'

/** `useCompareOverview` de la PWA (lib/compareOverview.ts): la función pura vive en core, el hook aquí. */
export function useCompareOverview(): CompareOverviewData {
  const entries = useFrozenWhenBlurred(useStore((s) => s.entries))
  const rankings = useFrozenWhenBlurred(useStore((s) => s.rankings))
  const duels = useFrozenWhenBlurred(useStore((s) => s.duels))
  const lastCompared = useFrozenWhenBlurred(useStore((s) => s.lastCompared))
  return useMemo(() => computeCompareOverview(entries, rankings, duels, lastCompared), [entries, rankings, duels, lastCompared])
}

/**
 * La portada de ¡Duelos! sigue montada bajo la sesion (D19) y el almacen cambia en cada duelo: sin esto recalcularia el
 * resumen y el planificador en el hilo de JS en cada eleccion, con la pantalla tapada. Mientras no tiene el foco devuelve
 * el ultimo valor visto; al volver a verse se pone al dia de una vez.
 */
export function useFrozenWhenBlurred<T>(value: T): T {
  const focused = useIsFocused()
  const last = useRef(value)
  if (focused) last.current = value
  return last.current
}

/** Color del % ordenado: verde desde el 80 %, luego amarillo, naranja y rojo (CompareHome.tsx:26-31). */
export function pctColor(p: number): string {
  if (p >= 80) return '#3ec878'
  if (p >= 55) return '#e8c547'
  if (p >= 30) return '#f2913a'
  return '#ef4b4b'
}

/** Sustituye a `location.state.duel` de react-router: la portada deja el primer duelo y la sesión lo recoge una vez. */
let handoff: PlannedDuel | null = null
export const setDuelHandoff = (d: PlannedDuel | null) => {
  handoff = d
}
export const takeDuelHandoff = (): PlannedDuel | undefined => {
  const d = handoff
  handoff = null
  return d ?? undefined
}
