import { useEffect, useState } from 'react'
import { isHydrated, whenHydrated } from './hydrationFlags'
import { loadDecideMemory } from './decideMemory'
import './useFriends' // engancha los amigos de prueba a `friendHits` de core (efecto al importar)

let decideLoaded = false
let all: Promise<void> | null = null

/** Resuelve cuando los tres stores persistidos y la memoria de Decidir están leídos de AsyncStorage. */
export function hydrateAll(): Promise<void> {
  all ??= Promise.all([
    whenHydrated('store'),
    whenHydrated('events'),
    whenHydrated('catalog'),
    loadDecideMemory().then(() => {
      decideLoaded = true
    }),
  ]).then(() => undefined)
  return all
}

const ready = () => decideLoaded && isHydrated('store') && isHydrated('events') && isHydrated('catalog')

/**
 * `true` cuando la rehidratación ha terminado. `_layout` debe devolver la pantalla de carga (o seguir con el splash)
 * mientras sea `false`: pintar antes mostraría la biblioteca vacía un instante.
 * Ojo: los vectores de usuario dependen de los motores; tras cargarlos hay que llamar a `useStore.getState().recomputeUserVectors()`.
 */
export function useHydrated(): boolean {
  const [ok, setOk] = useState(ready)
  useEffect(() => {
    if (ok) return
    let alive = true
    void hydrateAll().then(() => alive && setOk(true))
    return () => {
      alive = false
    }
  }, [ok])
  return ok
}
