import { useEffect, useState } from 'react'
import { isHydrated, whenHydrated } from './hydrationFlags'
import { loadCore } from '../data/loadData'
import { loadDecideMemory } from './decideMemory'
import { useCatalog } from './useCatalog'
import { useEvents } from './useEvents'
import { useStore } from './useStore'
import './useFriends' // engancha los amigos de prueba a `friendHits` de core (efecto al importar)

let decideLoaded = false
let all: Promise<void> | null = null

/**
 * Lee de AsyncStorage los tres stores persistidos y la memoria de Decidir. Los stores se rehidratan DESPUÉS de cargar el
 * catálogo y los motores (`loadCore`): `migrate` y `merge` de `useStore` usan los alias y `getItem` (p. ej. para saber de qué
 * estantería es una entrada sin `shelf`), y la PWA los tenía ya cargados al crear el store. Después recalcula los vectores de usuario.
 */
export function hydrateAll(): Promise<void> {
  all ??= (async () => {
    await loadDecideMemory()
    decideLoaded = true
    await loadCore().catch(() => {}) // si falla, `_layout` ya enseña el error; los stores se leen igualmente
    await useCatalog.persist.rehydrate() // primero la caché viva: `getItem` la usa
    await useEvents.persist.rehydrate()
    await useStore.persist.rehydrate()
    useStore.getState().recomputeUserVectors()
    await Promise.all([whenHydrated('store'), whenHydrated('events'), whenHydrated('catalog')])
  })()
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
