import { useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { TabBar } from './components/TabBar'
import { Toast } from './components/ui'
import { UpdatePrompt } from './components/UpdatePrompt'
import { PushPrompt } from './components/PushPrompt'
import { useStore } from './store/useStore'
import { useAuth } from './store/useAuth'
import { useFriends } from './store/useFriends'
import { useCatalog } from './store/useCatalog'
import { pullCloudEntries, pushLocalEntriesToCloud, initStoreSync } from './lib/sync'
import { Discover } from './screens/Discover'
import { Library } from './screens/Library'
import { Shelf } from './screens/Shelf'
import { ItemDetail } from './screens/ItemDetail'
import { Compare } from './screens/Compare'
import { WhatToWatch } from './screens/WhatToWatch'
import { Profile } from './screens/Profile'
import { Onboarding } from './screens/Onboarding'
import { Import } from './screens/Import'
import { ListEditor } from './screens/ListEditor'
import { PublicList, PublicProfile } from './screens/Public'
import { JoinInvite } from './screens/JoinInvite'
import { Metrics } from './screens/Metrics'
import { Settings } from './screens/Settings'
import { EditProfile } from './screens/EditProfile'

function Frame() {
  const onboarded = useStore((s) => s.onboarded)
  const { pathname, search } = useLocation()
  if (!onboarded && pathname !== '/onboarding') return <Navigate to={`/onboarding?next=${encodeURIComponent(pathname + search)}`} replace />
  return (
    <div className="desk-bg h-full w-full flex items-center justify-center">
      <div className="frame">
        <Routes>
          <Route element={<TabLayout />}>
            <Route index element={<Library />} />
            <Route path="descubrir" element={<Discover />} />
            <Route path="decidir" element={<WhatToWatch />} />
            <Route path="que-vemos" element={<Navigate to="/decidir" replace />} />
            <Route path="comparar" element={<Compare />} />
            <Route path="perfil" element={<Profile />} />
          </Route>
          <Route path="estanteria/:type" element={<Shelf />} />
          <Route path="i/:id" element={<ItemDetail />} />
          <Route path="lista/:id" element={<ListEditor />} />
          <Route path="importar" element={<Import />} />
          <Route path="ajustes" element={<Settings />} />
          <Route path="perfil/editar" element={<EditProfile />} />
          <Route path="metricas" element={<Metrics />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
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
            transition={{ duration: 0.12 }}
            className="h-full w-full"
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
  const user = useAuth((s) => s.user)
  const hasHydrated = useCatalog((s) => s._hasHydrated)
  const [syncToast, setSyncToast] = useState<string | null>(null)

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
        pushLocalEntriesToCloud(user.id).then((pushed) => {
          localStorage.setItem(syncKey, '1')
          if (pushed > 0) {
            setSyncToast(`Hemos guardado tus ${pushed} obras en tu cuenta`)
          }
          pullCloudEntries(user.id)
        })
      } else {
        pullCloudEntries(user.id)
      }
      useFriends.getState().loadFriends()
    }
  }, [user, hasHydrated])

  if (!hasHydrated) {
    return (
      <div className="desk-bg h-full w-full flex items-center justify-center">
        <div className="frame flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <>
      <UpdatePrompt />
      <PushPrompt />
      {syncToast && <Toast message={syncToast} onDone={() => setSyncToast(null)} />}
      <Routes>
        {/* Vistas públicas de links compartidos: sin marco ni barra, como una web normal */}
        <Route path="/l/:payload" element={<PublicList />} />
        <Route path="/p/:payload" element={<PublicProfile />} />
        <Route path="/unete/:code" element={<JoinInvite />} />
        <Route path="/*" element={<Frame />} />
      </Routes>
    </>
  )
}
