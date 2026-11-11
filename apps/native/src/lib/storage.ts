import AsyncStorage from '@react-native-async-storage/async-storage'
import type { PersistStorage, StorageValue } from 'zustand/middleware'

/**
 * Único punto de persistencia local de la app (D28: AsyncStorage; MMKV llega con el dev build).
 * Cuando cambie el motor de almacenamiento solo hay que tocar este archivo.
 */
export const kv = AsyncStorage

const WRITE_DELAY = 600 // ms sin cambios antes de escribir
const pending = new Map<string, StorageValue<unknown>>()
let timer: ReturnType<typeof setTimeout> | null = null

/** Escribe ya todo lo pendiente. */
export function flushStorage(): Promise<void> {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  const batch = [...pending.entries()]
  pending.clear()
  return Promise.all(batch.map(([name, value]) => AsyncStorage.setItem(name, JSON.stringify(value)))).then(() => undefined)
}

// Al pasar a segundo plano hay que llamar a `flushStorage` (lo hace `_layout`): el sistema puede cerrar la app sin avisar.
// Aquí no se importa `react-native` para que los stores sigan probándose en Node.

/**
 * Almacenamiento JSON para `persist` de zustand. Cada store lo pasa en su opción `storage`.
 * A diferencia de `createJSONStorage`, no serializa en cada `set`: guarda el último estado y lo escribe tras
 * `WRITE_DELAY` sin cambios. Con el store entero y hasta 5.000 eventos, serializar en cada gesto bloqueaba el hilo de JS.
 */
export const jsonStorage = <S>(): PersistStorage<S> => ({
  getItem: async (name) => {
    const hit = pending.get(name)
    if (hit) return hit as StorageValue<S>
    const raw = await AsyncStorage.getItem(name)
    return raw == null ? null : (JSON.parse(raw) as StorageValue<S>)
  },
  setItem: (name, value) => {
    pending.set(name, value as StorageValue<unknown>)
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void flushStorage(), WRITE_DELAY)
  },
  removeItem: async (name) => {
    pending.delete(name)
    await AsyncStorage.removeItem(name)
  },
})
