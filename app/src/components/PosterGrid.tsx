import type { ReactNode } from 'react'

/**
 * Rejilla de pósteres de escritorio (DISENO_ESCRITORIO §4.1): columnas automáticas de 150 px mínimo y 16 px de hueco
 * (5 columnas a 1024 px, 6 a 1280, 7 a 1440). Para el hover de cada celda, darle `hover-lift` (index.css).
 * - `fromLg`: la rejilla solo existe desde `lg:`; por debajo manda el `className` (p. ej. el móvil de las vistas públicas).
 * - `cols`: número fijo de columnas en `lg:` en lugar de las automáticas (§3.12: lista pública de 6).
 * - `as`: etiqueta (`ol`/`ul` si las celdas son `li`).
 */
const FIXED = { 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6', 7: 'lg:grid-cols-7' } as const

export function PosterGrid({
  children,
  className = '',
  fromLg = false,
  cols,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  fromLg?: boolean
  cols?: keyof typeof FIXED
  as?: 'div' | 'ol' | 'ul'
}) {
  const base = fromLg ? 'lg:grid lg:gap-4' : 'grid gap-4'
  const auto = fromLg ? 'lg:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(150px,1fr))]'
  const columns = cols ? FIXED[cols] : auto
  return <Tag className={`${base} ${columns} ${className}`}>{children}</Tag>
}
