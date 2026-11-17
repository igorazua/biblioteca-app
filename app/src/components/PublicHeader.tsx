import { Link } from 'react-router-dom'
import { APP_NAME } from '@biblioteca/core'

/**
 * Cabecera mínima de las vistas públicas (DISENO_ESCRITORIO §3.12): marca y salida a la app, sin barra lateral.
 * Móvil: la misma fila de siempre. En `lg:` se separa del contenido con una línea fina.
 */
export function PublicHeader() {
  return (
    <div className="flex items-center justify-between mb-6 lg:mb-8 lg:pb-4 lg:border-b lg:border-line">
      <span className="text-label text-accent">{APP_NAME}</span>
      <Link to="/" className="text-meta text-mute hover:text-ink underline underline-offset-2">Abrir la app</Link>
    </div>
  )
}
