import { lazy, Suspense } from 'react'
import { Link, NavLink, Route, Routes, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import { Avatar } from '../components/ui'
import { Icon } from '../components/Icon'
import { useIsDesktop } from '../lib/useMediaQuery'
import { Home } from './Home'

const DuelReel = lazy(() => import('./DuelReel').then((m) => ({ default: m.DuelReel })))
const ShelfRank = lazy(() => import('./ShelfRank').then((m) => ({ default: m.ShelfRank })))

/**
 * La web de escritorio nueva (/nuevo). Vive fuera del AppShell: sin barra lateral, una barra superior fina que se
 * apoya sobre el contenido y las carátulas a pantalla completa.
 */
export function NuevoApp() {
  const desktop = useIsDesktop()
  if (!desktop) return <NarrowNotice />
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg text-ink">
      <TopBar />
      <Suspense fallback={null}>
        <Routes>
          <Route index element={<Home />} />
          <Route path="duelos" element={<DuelReel />} />
          <Route path="duelos/:shelf" element={<DuelReel />} />
          <Route path="estanteria/:type" element={<ShelfRank />} />
          <Route path="*" element={<Navigate to="/nuevo" replace />} />
        </Routes>
      </Suspense>
    </div>
  )
}

const LINKS: { to: string; label: string; end?: boolean; ext?: boolean }[] = [
  { to: '/nuevo', label: 'Inicio', end: true },
  { to: '/nuevo/duelos', label: 'Duelos' },
  { to: '/descubrir', label: 'Descubrir', ext: true },
  { to: '/decidir', label: 'Decidir', ext: true },
]

function TopBar() {
  const profile = useStore((s) => s.profile)
  return (
    <header className="absolute inset-x-0 top-0 z-50 h-16 px-10 flex items-center gap-10 bg-bg">
      <Link to="/nuevo" className="display text-[30px] leading-none text-ink" aria-label="Biblioteca, inicio">
        Biblioteca
      </Link>
      <nav className="flex items-center gap-7" aria-label="Principal">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className="relative py-2 text-[15px] font-semibold">
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-ink' : 'text-ink/60 hover:text-ink transition-colors'}>{l.label}</span>
                {isActive && (
                  <motion.span layoutId="nuevo-nav" className="absolute left-0 right-0 -bottom-0.5 h-[3px] bg-accent" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-5">
        <Link to="/" className="text-[14px] text-ink/60 hover:text-ink transition-colors">App clásica</Link>
        <Link to="/ajustes" aria-label="Ajustes" className="w-10 h-10 flex items-center justify-center text-ink/70 hover:text-ink transition-colors">
          <Icon name="gear" size={20} />
        </Link>
        <Link to="/perfil" aria-label="Tu perfil" className="rounded-full hover:scale-105 transition-transform">
          <Avatar name={profile.name} color={profile.avatarColor} url={profile.avatarUrl} size={34} />
        </Link>
      </div>
    </header>
  )
}

function NarrowNotice() {
  return (
    <div className="h-full w-full bg-bg flex flex-col justify-end p-6 pb-12 gap-4">
      <h1 className="display text-[64px] leading-[0.9] text-ink">Hecha para pantallas grandes</h1>
      <p className="text-body text-ink max-w-sm">Esta versión de la web está pensada para escritorio. En el móvil, usa la app de siempre.</p>
      <Link to="/" className="self-start h-12 px-6 rounded-full bg-accent text-accent-ink font-semibold flex items-center">Ir a la app</Link>
    </div>
  )
}
