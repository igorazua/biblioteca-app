import AsyncStorage from '@react-native-async-storage/async-storage'
import { createJSONStorage } from 'zustand/middleware'

/**
 * Único punto de persistencia local de la app (D28: AsyncStorage; MMKV llega en la fase 3 con el dev build).
 * Cuando cambie el motor de almacenamiento solo hay que tocar este archivo.
 */
export const kv = AsyncStorage

/** Almacenamiento JSON para `persist` de zustand. Cada store lo pasa en su opción `storage`. */
export const jsonStorage = <S>() => createJSONStorage<S>(() => AsyncStorage)
