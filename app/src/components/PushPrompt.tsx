import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { isPushSupported, subscribeToPush } from '../lib/push'
import { useStore } from '../store/useStore'
import { Icon } from './Icon'
import type { NotificationTier } from '../types'

const DISMISSED_KEY = 'biblio_push_prompt_dismissed'

export function PushPrompt() {
  const entries = useStore((s) => s.entries)
  const setSettings = useStore((s) => s.setSettings)
  const [show, setShow] = useState(false)
  const [subscribingTier, setSubscribingTier] = useState<NotificationTier | null>(null)

  useEffect(() => {
    if (!isPushSupported()) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
    if (localStorage.getItem(DISMISSED_KEY)) return

    const seenCount = Object.values(entries).filter((e) => e.status === 'seen').length
    // Momento de valor: cuando el usuario ya ha catalogado al menos 10 obras
    if (seenCount >= 10) {
      const timer = setTimeout(() => {
        setShow(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [entries])

  const handleSelectTier = async (tier: NotificationTier) => {
    setSubscribingTier(tier)
    try {
      if (tier !== 'none') {
        await subscribeToPush()
      }
      setSettings({ notificationTier: tier })
    } finally {
      localStorage.setItem(DISMISSED_KEY, '1')
      setSubscribingTier(null)
      setShow(false)
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            role="dialog"
            aria-labelledby="push-prompt-title"
            className="w-full max-w-sm rounded-[24px] bg-surface border border-line p-5 shadow-2xl text-ink space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-accent/15 text-accent flex items-center justify-center">
                <Icon name="bell" size={26} />
              </div>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-mute bg-surface2 px-2.5 py-1 rounded-full border border-line">
                Alertas
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 id="push-prompt-title" className="text-lg font-bold">
                ¿Qué notificaciones quieres recibir?
              </h3>
              <p className="text-xs text-mute leading-relaxed">
                Elige con qué frecuencia quieres enterarte de novedades, estrenos y la actividad de tus amigos.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {/* Opción 1: Solo importantes (Recomendado) */}
              <button
                type="button"
                onClick={() => handleSelectTier('important')}
                disabled={subscribingTier !== null}
                className="w-full p-3 rounded-2xl bg-accent text-accent-ink font-medium text-sm flex items-center justify-between active:scale-[0.98] transition-transform shadow-sm text-left"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-[13px] flex items-center gap-1.5">
                    Solo importantes
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-black/15 text-accent-ink px-1.5 py-0.5 rounded-full">
                      Recomendado
                    </span>
                  </span>
                  <span className="text-[11px] opacity-85 font-normal">
                    Estrenos pendientes y duelos de amigos
                  </span>
                </div>
                {subscribingTier === 'important' ? (
                  <span className="text-xs font-semibold animate-pulse">Activando…</span>
                ) : (
                  <Icon name="chevron" size={16} className="opacity-70" />
                )}
              </button>

              {/* Opción 2: Todas las notificaciones */}
              <button
                type="button"
                onClick={() => handleSelectTier('all')}
                disabled={subscribingTier !== null}
                className="w-full p-3 rounded-2xl bg-surface2 border border-line hover:border-line2 text-ink font-medium text-sm flex items-center justify-between active:scale-[0.98] transition-transform text-left"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-[13px]">Todas las notificaciones</span>
                  <span className="text-[11px] text-mute font-normal">
                    Recomendaciones semanales y toda la actividad
                  </span>
                </div>
                {subscribingTier === 'all' ? (
                  <span className="text-xs text-mute font-medium animate-pulse">Activando…</span>
                ) : (
                  <Icon name="chevron" size={16} className="text-mute" />
                )}
              </button>

              {/* Opción 3: No activar ninguna */}
              <button
                type="button"
                onClick={() => handleSelectTier('none')}
                disabled={subscribingTier !== null}
                className="w-full min-h-[38px] rounded-xl text-mute text-xs font-medium hover:text-ink transition-colors mt-0.5"
              >
                No activar ninguna
              </button>
            </div>

            <p className="text-[11px] text-center text-mute/80 pt-0.5">
              Podrás cambiar tus preferencias en cualquier momento en tu Perfil → Ajustes.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
