import { Link, useLocation } from 'react-router-dom'
import { WIZARD_NAME, WIZARD_PATH } from '@biblioteca/core'
import { Icon, type IconName } from './Icon'
import { Avatar } from './ui'
import { useStore } from '../store/useStore'

interface NavItem {
  to: string
  label: string
  icon: IconName
  /** Rutas que cuentan como esta sección (la propia y sus subpantallas). */
  sections: string[]
}

const ITEMS: NavItem[] = [
  { to: '/', label: 'Biblioteca', icon: 'library', sections: ['/', '/estanteria', '/i', '/lista'] },
  { to: '/descubrir', label: 'Descubrir', icon: 'cards', sections: ['/descubrir'] },
  { to: WIZARD_PATH, label: WIZARD_NAME, icon: 'sparkle', sections: [WIZARD_PATH] },
  { to: '/comparar', label: '¡Duelos!', icon: 'scale', sections: ['/comparar'] },
]
const PROFILE_SECTIONS = ['/perfil', '/ajustes', '/conectar', '/importar', '/metricas']

function inSection(pathname: string, sections: string[]) {
  return sections.some((s) => (s === '/' ? pathname === '/' : pathname === s || pathname.startsWith(s + '/')))
}

const ROW = 'relative flex items-center gap-3 h-11 px-4 rounded-xl text-body transition-colors hover:bg-surface2 active:opacity-70'

/** Barra lateral de escritorio (>= 1024 px, DISENO_ESCRITORIO §2.1). Debajo de ese ancho no se pinta. */
export function SideNav() {
  const { pathname } = useLocation()
  const profile = useStore((s) => s.profile)
  const profileActive = inSection(pathname, PROFILE_SECTIONS)
  return (
    <aside className="hidden lg:flex flex-col shrink-0 w-sidenav h-dvh sticky top-0 bg-surface border-r border-line">
      <nav className="flex-1 flex flex-col px-3 pt-6 min-h-0" aria-label="Navegación principal">
        <div className="px-4 pb-6 serif text-title text-ink">Biblioteca</div>
        <ul className="flex flex-col gap-1">
          {ITEMS.map((it) => {
            const active = inSection(pathname, it.sections)
            return (
              <li key={it.to}>
                <Link to={it.to} aria-current={active ? 'page' : undefined} className={`${ROW} ${active ? 'bg-surface2 text-ink' : 'text-mute'}`}>
                  {active && <span className="absolute left-0 inset-y-2 w-0.5 rounded-full bg-accent" aria-hidden />}
                  <Icon name={it.icon} size={20} />
                  <span>{it.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="px-3 pb-4 pt-3 border-t border-line">
        <Link to="/perfil" aria-current={profileActive ? 'page' : undefined} className={`${ROW} h-auto py-2 ${profileActive ? 'bg-surface2' : ''}`}>
          {profileActive && <span className="absolute left-0 inset-y-2 w-0.5 rounded-full bg-accent" aria-hidden />}
          <Avatar name={profile.name} color={profile.avatarColor} url={profile.avatarUrl} size={32} />
          <span className="flex flex-col min-w-0">
            <span className="text-body text-ink truncate">{profile.name}</span>
            <span className="text-meta">Ver perfil</span>
          </span>
        </Link>
      </div>
    </aside>
  )
}
