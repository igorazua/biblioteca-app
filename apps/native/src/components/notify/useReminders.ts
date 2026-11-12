import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { useRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { kv } from '../../lib/storage'
import { isNotifySupported, syncReminders } from '../../lib/notify'
import { isBuiltRoute } from '../../lib/phase'
import { useAuth, useFriends, useStore } from '../../store'

/**
 * Mantiene al día los avisos locales y atiende el toque en uno de ellos. Se monta una sola vez, en `_layout`.
 * Reprograma al abrir la app, al volver a primer plano y al cambiar la frecuencia o el número de obras.
 */
export function useReminders(): void {
  const router = useRouter()
  const tier = useStore((s) => s.settings.notificationTier)
  const entries = useStore((s) => s.entries)
  const rankings = useStore((s) => s.rankings)
  const nudgeDismiss = useStore((s) => s.nudgeDismiss)
  const user = useAuth((s) => s.user)
  const friendsCount = useFriends((s) => s.realFriends.length)

  // Siempre el último estado, sin reiniciar el efecto en cada cambio de `entries`
  const latest = useRef({ tier, entries, rankings, nudgeDismiss, hasAccount: Boolean(user), friendsCount })
  latest.current = { tier, entries, rankings, nudgeDismiss, hasAccount: Boolean(user), friendsCount }

  const run = useRef(async () => {})
  run.current = async () => {
    const s = latest.current
    let hasUsedDecide = false
    try {
      hasUsedDecide = (await kv.getItem('biblio_used_decide')) != null
    } catch {
      // sin marca: se trata como «nunca»
    }
    await syncReminders(s.tier, {
      hasAccount: s.hasAccount,
      entries: s.entries,
      rankings: s.rankings,
      friendsCount: s.friendsCount,
      hasUsedDecide,
      dismissHistory: s.nudgeDismiss,
    })
  }

  const entryCount = Object.keys(entries).length
  const userId = user?.id
  useEffect(() => {
    if (!isNotifySupported()) return
    const t = setTimeout(() => void run.current(), 3000)
    return () => clearTimeout(t)
  }, [tier, entryCount, userId])

  useEffect(() => {
    if (!isNotifySupported()) return
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') void run.current()
    })
    return () => sub.remove()
  }, [])

  // Toque en un aviso: abre la ruta que lleva en `data.route`, si esa pantalla existe
  const response = Notifications.useLastNotificationResponse()
  const handled = useRef<string | null>(null)
  useEffect(() => {
    if (!response) return
    const id = `${response.notification.request.identifier}@${response.notification.date}`
    if (handled.current === id) return
    handled.current = id
    const route = response.notification.request.content.data?.route
    if (typeof route === 'string' && route !== '/' && isBuiltRoute(route)) router.push(route as never)
  }, [response, router])
}
