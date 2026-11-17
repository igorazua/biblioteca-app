import { useSyncExternalStore } from 'react'

/** Suscripción a una media query (p. ej. para pintar distinto en escritorio cuando CSS no basta). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Escritorio de la web: mismo punto de corte que `lg:` de Tailwind (1024 px). */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
