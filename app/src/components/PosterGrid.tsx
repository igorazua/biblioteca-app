import type { ReactNode } from 'react'

/**
 * Rejilla de pósteres de escritorio (DISENO_ESCRITORIO §4.1): columnas automáticas de 150 px mínimo y 16 px de hueco
 * (5 columnas a 1024 px, 6 a 1280, 7 a 1440). Sin uso todavía: la adoptarán Estantería, Descubrir y las vistas públicas.
 * Para el hover de cada celda, darle `hover-lift` (index.css).
 */
export function PosterGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid gap-4 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] ${className}`}>
      {children}
    </div>
  )
}
