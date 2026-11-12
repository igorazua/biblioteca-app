import {
  DOUBTFUL_STORAGE_KEY,
  PASSES_FOR_DOUBTFUL,
  PASSES_STORAGE_KEY,
  initDecideSession,
  skipDuelUnknown,
  type Decide2State,
  type DecideInput,
  type Item,
} from '@biblioteca/core'

/**
 * Memoria de Decidir entre sesiones (obras «dudosas», R × 0,5, y veces que se ha pasado cada obra), en localStorage.
 *
 * Antes la leía y escribía `lib/engine/decide.ts` por su cuenta; @biblioteca/core ya no toca el almacenamiento y recibe
 * los dos mapas en el estado. Este archivo repite exactamente lo que hacía la PWA (con las mismas claves):
 *  - al iniciar, `WhatToWatch` no pasa `doubtfulItems`: el estado lleva las dudosas guardadas, pero `recog` no las ve,
 *    así que no hay ×0,5 desde el principio;
 *  - al «Pasar», los conteos se leen del almacenamiento (todas las sesiones, en cada pase) y se guardan siempre; las
 *    dudosas (las del estado más las nuevas) solo se guardan si alguna de las dos obras llega a PASSES_FOR_DOUBTFUL.
 * Sin almacenamiento (modo privado, tests) los conteos se quedan en memoria, como `passedMem`.
 */

type Counts = Record<string, number>

export function loadDoubtfulItems(): Counts {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DOUBTFUL_STORAGE_KEY) : null
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveDoubtfulItems(items: Counts): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DOUBTFUL_STORAGE_KEY, JSON.stringify(items))
    }
  } catch {
    // ok
  }
}

let passedMem: Counts = {} // sin almacenamiento (tests, modo privado)

export function loadPassedItems(): Counts {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PASSES_STORAGE_KEY) : null
    return raw ? JSON.parse(raw) : { ...passedMem }
  } catch {
    return { ...passedMem }
  }
}

function savePassedItems(items: Counts): void {
  passedMem = items
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(PASSES_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ok
  }
}

/** Solo para tests: olvida los conteos en memoria (no toca el almacenamiento). */
export function resetDecideMemory(): void {
  passedMem = {}
}

/** Inicia una sesión de Decidir como antes: dudosas guardadas en el estado, sin ×0,5 inicial en `recog`. */
export function startDecide(input: DecideInput): Decide2State {
  const { doubtfulItems: _d, passedItems: _p, ...clean } = input
  const st = initDecideSession(clean)
  return { ...st, doubtfulItems: loadDoubtfulItems(), passedItems: loadPassedItems() }
}

/** «Pasar» como antes: cuenta con lo guardado, guarda siempre los conteos y las dudosas solo si alguna llegó al umbral. */
export function skipDecide(st: Decide2State, a: Item, b: Item, ms?: number, dimension?: string): Decide2State {
  const next = skipDuelUnknown({ ...st, passedItems: loadPassedItems() }, a, b, ms, dimension)
  savePassedItems(next.passedItems)
  if ([a.id, b.id].some((id) => next.passedItems[id] >= PASSES_FOR_DOUBTFUL)) saveDoubtfulItems(next.doubtfulItems)
  return next
}
