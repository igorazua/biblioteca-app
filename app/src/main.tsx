import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { App } from './App'
import { MotionGlobalConfig } from 'framer-motion'

// Solo en desarrollo: abre la app con ?fast para saltar las animaciones (pruebas automáticas en un navegador sin pintar)
if (import.meta.env.DEV && new URLSearchParams(location.search).has('fast')) MotionGlobalConfig.skipAnimations = true

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
