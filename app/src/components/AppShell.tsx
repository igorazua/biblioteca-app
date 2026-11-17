import { Outlet } from 'react-router-dom'
import { SideNav } from './SideNav'

/**
 * Marco de la app: barra lateral fija en escritorio (>= 1024 px) y, por debajo, solo contenido
 * (la TabBar la pone TabLayout). Entre 768 y 1023 px el contenido se centra a 640 px; en >= 1024, a 1120 px.
 * Cada pantalla sigue ocupando el alto (h-full) y gestionando su scroll; el scroll fino lo da index.css.
 */
export function AppShell() {
  return (
    <div className="h-full w-full flex">
      <SideNav />
      <main id="contenido" tabIndex={-1} className="flex-1 min-w-0 h-full outline-none">
        <div className="relative h-full w-full mx-auto md:max-w-column lg:max-w-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

/** Enlace «Saltar al contenido»: invisible hasta que recibe el foco con el teclado. */
export function SkipLink() {
  return (
    <a
      href="#contenido"
      onClick={(e) => {
        e.preventDefault()
        document.getElementById('contenido')?.focus()
      }}
      className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-accent focus:text-accent-ink focus:px-4 focus:py-2 text-body"
    >
      Saltar al contenido
    </a>
  )
}
