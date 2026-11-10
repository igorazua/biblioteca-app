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
import { kv } from '../lib/storage'

/**
 * Memoria de Decidir entre sesiones: obras «dudosas» (R × 0,5) y veces que se ha pasado cada obra.
 *
 * La PWA lo guardaba en `localStorage` DENTRO de `decide.ts`, y con un efecto muy concreto que `@biblioteca/core` ya no
 * reproduce por sí solo (el motor no lee ni escribe nada). Lo que hacía la PWA (`WhatToWatch` nunca pasa `doubtfulItems`):
 *  - al iniciar: `state.doubtfulItems` = lo guardado, pero `recog` NO ve las dudosas (recog usa `input.doubtfulItems`, que iba vacío),
 *    así que no hay ×0,5 desde el principio;
 *  - al pasar («Pasar»): los conteos se leían del almacenamiento (todas las sesiones) y se guardaban SIEMPRE;
 *    las dudosas (las guardadas + las nuevas) solo se guardaban si alguna de las dos obras llegaba a PASSES_FOR_DOUBTFUL.
 * Para que el resultado sea idéntico, las pantallas deben usar `startDecide` y `skipDecide`, no las funciones de core a pelo.
 */

type Counts = Record<string, number>

let doubtful: Counts = {}
let passed: Counts = {}
let writes: Promise<unknown> = Promise.resolve()

const parse = (raw: string | null): Counts => {
  try {
    const v = raw ? JSON.parse(raw) : {}
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Counts) : {}
  } catch {
    return {}
  }
}

/** Lee las dos claves del almacenamiento a memoria. `useHydrated` la espera. */
export async function loadDecideMemory(): Promise<void> {
  try {
    doubtful = parse(await kv.getItem(DOUBTFUL_STORAGE_KEY))
  } catch {
    doubtful = {}
  }
  try {
    passed = parse(await kv.getItem(PASSES_STORAGE_KEY))
  } catch {
    // sin almacenamiento: se queda lo que haya en memoria (igual que `passedMem` en la PWA)
  }
}

const persist = (key: string, value: Counts) => {
  writes = writes.then(() => kv.setItem(key, JSON.stringify(value))).catch(() => {})
}

/** Espera a que terminen las escrituras pendientes (para tests y para cerrar la app). */
export const flushDecideMemory = () => writes

export const getDoubtfulItems = (): Counts => ({ ...doubtful })
export const getPassedItems = (): Counts => ({ ...passed })

/** Solo para tests: vuelve la memoria a vacío sin tocar el almacenamiento. */
export function resetDecideMemory(): void {
  doubtful = {}
  passed = {}
}

/** Inicia una sesión de Decidir como la PWA: dudosas y conteos guardados en el estado, sin ×0,5 inicial en `recog`. */
export function startDecide(input: DecideInput): Decide2State {
  const { doubtfulItems: _d, passedItems: _p, ...clean } = input
  const st = initDecideSession(clean)
  return { ...st, doubtfulItems: { ...doubtful }, passedItems: { ...passed } }
}

/** «Pasar» como la PWA: cuenta con lo guardado (todas las sesiones), guarda siempre los conteos y las dudosas solo si alguna llegó al umbral. */
export function skipDecide(st: Decide2State, a: Item, b: Item, ms?: number, dimension?: string): Decide2State {
  const next = skipDuelUnknown({ ...st, passedItems: { ...passed } }, a, b, ms, dimension)
  passed = { ...next.passedItems }
  persist(PASSES_STORAGE_KEY, passed)
  if ([a.id, b.id].some((id) => passed[id] >= PASSES_FOR_DOUBTFUL)) {
    doubtful = { ...next.doubtfulItems }
    persist(DOUBTFUL_STORAGE_KEY, doubtful)
  }
  return next
}
