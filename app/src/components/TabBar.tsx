import { NavLink } from 'react-router-dom'
import { Icon, type IconName } from './Icon'
import { WIZARD_NAME, WIZARD_PATH } from '../config'

const TABS: { to: string; label: string; icon: IconName; center?: boolean; end?: boolean }[] = [
  { to: '/', label: 'Biblioteca', icon: 'library', end: true },
  { to: '/descubrir', label: 'Descubrir', icon: 'cards' },
  { to: WIZARD_PATH, label: WIZARD_NAME, icon: 'sparkle' },
  { to: '/comparar', label: '¡Duelos!', icon: 'scale' },
  { to: '/perfil', label: 'Perfil', icon: 'user' },
]

export function TabBar() {
  return (
    <nav className="shrink-0 glass border-t border-white/[0.06] safe-bottom relative z-30" aria-label="Navegación principal">
      <ul className="flex items-end justify-around px-1 pt-1.5 pb-1.5">
        {TABS.map((t) => (
          <li key={t.to} className="flex-1">
            <NavLink to={t.to} end={t.end} className="flex flex-col items-center gap-0.5 min-h-[48px] justify-end">
              {({ isActive }) =>
                t.center ? (
                  <>
                    <span className={`-mt-6 w-[56px] h-[56px] rounded-[20px] rotate-0 flex items-center justify-center border-4 border-bg transition-transform duration-200 ${isActive ? 'bg-accent text-accent-ink shadow-[0_10px_28px_-8px_rgb(245_181_68/0.8)] scale-105' : 'bg-accent/90 text-accent-ink shadow-lg shadow-black/50'}`}>
                      <Icon name={t.icon} size={26} />
                    </span>
                    <span className={`text-[10.5px] font-medium ${isActive ? 'text-accent' : 'text-mute'}`}>{t.label}</span>
                  </>
                ) : (
                  <>
                    <span className={`relative flex items-center justify-center w-12 h-7 rounded-full transition-colors duration-200 ${isActive ? 'bg-accent/15' : ''}`}>
                      <Icon name={t.icon} size={22} className={isActive ? 'text-accent' : 'text-mute'} />
                    </span>
                    <span className={`text-[10.5px] font-medium ${isActive ? 'text-accent' : 'text-mute'}`}>{t.label}</span>
                  </>
                )
              }
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
