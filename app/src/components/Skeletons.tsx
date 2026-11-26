import { posterAspectClass } from '@biblioteca/core/src/lib/posterShape'

/**
 * Esqueletos de carga de pantalla completa. Usan la clase `.skeleton` de index.css (brillo que recorre la superficie).
 * `.skeleton-wait` retrasa su aparición: si la carga dura menos de ~150 ms no se ve nada (sin parpadeo).
 */

/** Pantalla genérica mientras llega el trozo de código de una sección: cabecera, fila de pósteres y filas de lista. */
export function ScreenSkeleton() {
  return (
    <div className="skeleton-wait h-full w-full overflow-hidden px-5 lg:px-gutter safe-top pt-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div className="skeleton h-8 w-44 rounded-lg mb-2" />
      <div className="skeleton h-4 w-64 max-w-full rounded mb-6" />
      <div className="flex gap-3 mb-7 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={`skeleton w-[104px] shrink-0 ${posterAspectClass()} rounded-[10px]`} />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`skeleton w-10 ${posterAspectClass()} rounded-[6px] shrink-0`} />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3.5 rounded w-3/4" />
              <div className="skeleton h-3 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Carta del mazo de Descubrir mientras se carga la estantería (p. ej. las canciones). */
export function DeckCardSkeleton() {
  return (
    <div className="skeleton-wait relative h-full rounded-[28px] overflow-hidden border border-line bg-surface flex flex-col" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando la estantería…</span>
      <div className="skeleton flex-1" />
      <div className="p-5 space-y-2.5">
        <div className="skeleton h-6 rounded w-2/3" />
        <div className="skeleton h-4 rounded w-1/3" />
      </div>
    </div>
  )
}
