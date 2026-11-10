// Marcas de «este almacén ya terminó de rehidratarse» (con éxito o con error). Los stores las ponen y `useHydrated` las espera.
// Va aparte para que los stores no importen a `hydration.ts` (que los importa a ellos).
export type HydrationKey = 'store' | 'events' | 'catalog'

const done = new Set<HydrationKey>()
const waiters = new Map<HydrationKey, (() => void)[]>()

export function markHydrated(key: HydrationKey): void {
  done.add(key)
  for (const w of waiters.get(key) ?? []) w()
  waiters.delete(key)
}

export const isHydrated = (key: HydrationKey) => done.has(key)

export function whenHydrated(key: HydrationKey): Promise<void> {
  if (done.has(key)) return Promise.resolve()
  return new Promise((resolve) => {
    waiters.set(key, [...(waiters.get(key) ?? []), resolve])
  })
}
