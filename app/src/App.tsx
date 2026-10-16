import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { TabBar } from './components/TabBar'
import { useStore } from './store/useStore'
import { Discover } from './screens/Discover'
import { Library } from './screens/Library'
import { Shelf } from './screens/Shelf'
import { ItemDetail } from './screens/ItemDetail'
import { Compare } from './screens/Compare'
import { WhatToWatch } from './screens/WhatToWatch'
import { Profile } from './screens/Profile'
import { Onboarding } from './screens/Onboarding'
import { ListEditor } from './screens/ListEditor'
import { PublicList, PublicProfile } from './screens/Public'

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
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

function TabLayout() {
  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 min-h-0 relative">
        <Outlet />
      </div>
      <TabBar />
    </div>
  )
}

export function App() {
  return (
    <Routes>
      {/* Vistas públicas de links compartidos: sin marco ni barra, como una web normal */}
      <Route path="/l/:payload" element={<PublicList />} />
      <Route path="/p/:payload" element={<PublicProfile />} />
      <Route path="/*" element={<Frame />} />
    </Routes>
  )
}
