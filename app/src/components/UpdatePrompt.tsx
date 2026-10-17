import { useRegisterSW } from 'virtual:pwa-register/react'
import { motion, AnimatePresence } from 'framer-motion'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (!r) return
      // Comprobar actualización periódica cada 30 minutos
      setInterval(() => {
        r.update()
      }, 30 * 60 * 1000)

      // Comprobar actualización al volver a la pestaña
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          r.update()
        }
      })
    },
  })

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.aside
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl bg-ink px-4 py-3 text-bg shadow-2xl flex items-center justify-between gap-3 border border-white/10"
        >
          <span className="text-sm font-medium">Hay una versión nueva</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateServiceWorker(true)}
              className="px-3 py-1.5 rounded-xl bg-accent text-accent-ink text-xs font-bold active:scale-95 transition-transform"
            >
              Actualizar
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="p-1 text-xs text-mute hover:text-bg opacity-70"
              aria-label="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
