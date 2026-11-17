import type { ReactNode } from 'react'

/**
 * Maquetación de «ficha»: póster fijo (sticky) a la izquierda y columna de texto a la derecha
 * (DISENO_ESCRITORIO §3.3). Sin lógica propia: la usan la ficha, el resultado de Decidir y las vistas públicas.
 *
 * - Por debajo de `lg:` no hay columnas: `poster` va arriba (a sangre, lo pinta quien la use) y `children`
 *   debajo con el margen de 20 px de siempre.
 * - En `lg:` el póster ocupa 360 px y se queda fijo mientras se hace scroll del texto; el texto lleva el resto.
 * - `posterFooter` va bajo el póster y solo en escritorio (en móvil quien llama ya lo pone sobre el póster).
 * Debe vivir dentro de un contenedor con scroll (`scroll-y`): el `sticky` se ancla a él.
 */
export function DetailTwoCol({
  poster,
  posterFooter,
  children,
  className = '',
}: {
  poster: ReactNode
  posterFooter?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`lg:grid lg:grid-cols-[22.5rem_minmax(0,1fr)] lg:gap-12 lg:items-start lg:px-gutter ${className}`}>
      <div className="lg:sticky lg:top-6">
        {poster}
        {posterFooter && <div className="hidden lg:block mt-4">{posterFooter}</div>}
      </div>
      <div className="min-w-0 px-5 mt-4 space-y-5 lg:px-0 lg:mt-0 lg:space-y-8">{children}</div>
    </div>
  )
}
