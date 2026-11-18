import { lazy, Suspense, useEffect, useState } from 'react'
import { SHELF_ENABLED } from '@biblioteca/core'
import { prefetchEngines, prefetchShelfCatalogs, loadSongs } from './data/loadData'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { TabBar } from './components/TabBar'
import { AppShell, SkipLink } from './components/AppShell'
import { Toast } from './components/ui'
import { UpdatePrompt } from './components/UpdatePrompt'
import { PushPrompt } from './components/PushPrompt'
import { useStore } from './store/useStore'
import { useAuth } from './store/useAuth'
import { useFriends } from './store/useFriends'
import { useCatalog } from './store/useCatalog'
import { pullCloudEntries, pushLocalEntriesToCloud, pullCloudDuels, pushLocalDuelsToCloud, initStoreSync } from './lib/sync'
import { Library } from './screens/Library'

// Rutas secundarias cargadas de forma diferida para mantener el bundle inicial < 300 KB
const Discover = lazy(() => import('./screens/Discover').then((m) => ({ default: m.Discover })))
const Shelf = lazy(() => import('./screens/Shelf').then((m) => ({ default: m.Shelf })))
const ItemDetail = lazy(() => import('./screens/ItemDetail').then((m) => ({ default: m.ItemDetail })))
const CompareHome = lazy(() => import('./screens/CompareHome').then((m) => ({ default: m.CompareHome })))
const CompareSession = lazy(() => import('./screens/CompareSession').then((m) => ({ default: m.CompareSession })))
const WhatToWatch = lazy(() => import('./screens/WhatToWatch').then((m) => ({ default: m.WhatToWatch })))
const Profile = lazy(() => import('./screens/Profile').then((m) => ({ default: m.Profile })))
const Onboarding = lazy(() => import('./screens/Onboarding').then((m) => ({ default: m.Onboarding })))
const Import = lazy(() => import('./screens/Import').then((m) => ({ default: m.Import })))
const Connect = lazy(() => import('./screens/Connect').then((m) => ({ default: m.Connect })))
const ConnectSpotify = lazy(() => import('./screens/ConnectSpotify').then((m) => ({ default: m.ConnectSpotify })))
const ListEditor = lazy(() => import('./screens/ListEditor').then((m) => ({ default: m.ListEditor })))
const PublicList = lazy(() => import('./screens/Public').then((m) => ({ default: m.PublicList })))
const PublicProfile = lazy(() => import('./screens/Public').then((m) => ({ default: m.PublicProfile })))
const JoinInvite = lazy(() => import('./screens/JoinInvite').then((m) => ({ default: m.JoinInvite })))
const Metrics = lazy(() => import('./screens/Metrics').then((m) => ({ default: m.Metrics })))
const Settings = lazy(() => import('./screens/Settings').then((m) => ({ default: m.Settings })))
const EditProfile = lazy(() => import('./screens/EditProfile').then((m) => ({ default: m.EditProfile })))
// Web de escritorio nueva (/nuevo), sin la barra lateral del AppShell
const NuevoApp = lazy(() => import('./nuevo/NuevoApp').then((m) => ({ default: m.NuevoApp })))

function Frame() {
  const onboarded = useStore((s) => s.onboarded)
  const { pathname, search } = useLocation()
  if (!onboarded && pathname !== '/onboarding') return <Navigate to={`/onboarding?next=${encodeURIComponent(pathname + search)}`} replace />
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg" data-overlay-host>
      <SkipLink />
      <Suspense fallback={null}>
        <Routes>
          <Route element={<AppShell />}>
            <Route element={<TabLayout />}>
              <Route index element={<Library />} />
              <Route path="descubrir" element={<Discover />} />
              <Route path="decidir" element={<WhatToWatch />} />
              <Route path="que-vemos" element={<Navigate to="/decidir" replace />} />
              <Route path="comparar" element={<CompareHome />} />
              <Route path="comparar/:shelf" element={<CompareSession />} />
              <Route path="perfil" element={<Profile />} />
            </Route>
            <Route path="estanteria/:type" element={<Shelf />} />
            <Route path="i/:id" element={<ItemDetail />} />
            <Route path="lista/:id" element={<ListEditor />} />
            <Route path="conectar" element={<Connect />} />
            <Route path="conectar/spotify" element={<ConnectSpotify />} />
            <Route path="importar" element={<Import />} />
            <Route path="ajustes" element={<Settings />} />
            <Route path="perfil/editar" element={<EditProfile />} />
            <Route path="metricas" element={<Metrics />} />
          </Route>
          <Route path="nuevo/*" element={<NuevoApp />} />
          {/* Sin barra lateral: la persona aún no ha entrado */}
          <Route path="onboarding" element={<div className="h-full w-full mx-auto md:max-w-column"><Onboarding /></div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  )
}

function TabLayout() {
  const { pathname } = useLocation()
  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
      <TabBar />
    </div>
  )
}

export function App() {
  const [syncToast, setSyncToast] = useState<string | null>(null)
  const user = useAuth((s) => s.user)
  const hasHydrated = useCatalog((s) => s._hasHydrated)

  useEffect(() => {
    // Si la estantería de canciones está encendida, se carga songs.json de /data
    if (SHELF_ENABLED.song) {
      loadSongs()
    }
    // el espacio de obras de cada estantería (vectores) y el catálogo detallado: después de pintar, sin bloquear la primera pantalla
    const t = window.setTimeout(() => {
      prefetchEngines()
      prefetchShelfCatalogs()
    }, 1500)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!hasHydrated) return
    const unsub = useAuth.getState().init()
    const unsubSync = initStoreSync()
    return () => {
      unsub()
      unsubSync?.()
    }
  }, [hasHydrated])

  useEffect(() => {
    if (user && hasHydrated) {
      if (!useStore.getState().onboarded) {
        useStore.getState().completeOnboarding({
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Tú',
          avatarUrl: user.user_metadata?.avatar_url || null,
        })
      }
      const localCount = Object.keys(useStore.getState().entries).length
      const syncKey = `biblio_synced_${user.id}`
      if (localCount > 0 && !localStorage.getItem(syncKey)) {
        ;(async () => {
          const pushed = await pushLocalEntriesToCloud(user.id)
          await pushLocalDuelsToCloud(user.id) // B3: también los duelos hechos sin cuenta
          localStorage.setItem(syncKey, '1')
          if (pushed > 0) {
            setSyncToast(`Hemos guardado tus ${pushed} obras en tu cuenta`)
          }
          await pullCloudEntries(user.id)
          await pullCloudDuels(user.id)
        })().catch((e) => console.warn('Error al sincronizar con la nube:', e))
      } else {
        pullCloudEntries(user.id).then(() => pullCloudDuels(user.id)).catch((e) => console.warn('Error al sincronizar con la nube:', e))
      }
      useFriends.getState().loadFriends()
    }
  }, [user, hasHydrated])

  if (!hasHydrated) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <UpdatePrompt />
      <PushPrompt />
      {syncToast && <Toast message={syncToast} onDone={() => setSyncToast(null)} />}
      <Suspense fallback={null}>
        <Routes>
          <Route path="/l/:payload" element={<PublicList />} />
          <Route path="/p/:payload" element={<PublicProfile />} />
          <Route path="/unete/:code" element={<JoinInvite />} />
          <Route path="/*" element={<Frame />} />
        </Routes>
      </Suspense>
    </>
  )
}
