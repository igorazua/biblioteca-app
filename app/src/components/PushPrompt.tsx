import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { isPushSupported, subscribeToPush } from '../lib/push'
import { useStore } from '../store/useStore'
import { Icon } from './Icon'

const DISMISSED_KEY = 'biblio_push_prompt_dismissed'

export function PushPrompt() {
  const entries = useStore((s) => s.entries)
  const [show, setShow] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if (!isPushSupported()) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
    if (localStorage.getItem(DISMISSED_KEY)) return

    const seenCount = Object.values(entries).filter((e) => e.status === 'seen').length
    // Momento de valor: cuando el usuario ya ha catalogado al menos 10 obras
    if (seenCount >= 10) {
      // Pequeño retardo para no interrumpir la interacción del usuario
      const timer = setTimeout(() => {
        setShow(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [entries])

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  const handleAccept = async () => {
    setSubscribing(true)
    try {
      await subscribeToPush()
    } finally {
      localStorage.setItem(DISMISSED_KEY, '1')
      setSubscribing(false)
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
            <div className="w-12 h-12 rounded-2xl bg-accent/15 text-accent flex items-center justify-center">
              <Icon name="bell" size={26} />
            </div>

            <div className="space-y-1.5">
              <h3 id="push-prompt-title" className="text-lg font-bold">
                ¿Te avisamos cuando haya algo bueno?
              </h3>
              <p className="text-xs text-mute leading-relaxed">
                Recomendaciones personalizadas basadas en lo que has valorado y actividad de tus amigos. Como máximo 1 o 2 avisos discretos a la semana.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleAccept}
                disabled={subscribing}
                className="w-full min-h-[46px] rounded-xl bg-accent text-accent-ink font-semibold text-sm flex items-center justify-center active:scale-[0.98] transition-transform"
              >
                {subscribing ? 'Activando...' : 'Activar avisos'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                disabled={subscribing}
                className="w-full min-h-[40px] rounded-xl text-mute text-xs font-medium hover:text-ink transition-colors"
              >
                Ahora no
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
