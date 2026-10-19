// app/src/lib/push.ts
// Soporte cliente para notificaciones Web Push y recordatorios (F-PUSH)
import { supabase } from './supabase'

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  try {
    const reg = await navigator.serviceWorker.ready
    return await reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported() || !supabase) return false

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const reg = await navigator.serviceWorker.ready
    // Intentar obtener clave pública VAPID o usar fallback
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      // Si la app está registrada con VAPID en producción
      const vapidKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY
      const options: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
        ...(vapidKey ? { applicationServerKey: vapidKey } : {}),
      }
      sub = await reg.pushManager.subscribe(options)
    }

    if (!sub) return false

    const subJson = sub.toJSON()
    const endpoint = sub.endpoint
    const p256dh = subJson.keys?.p256dh || ''
    const auth = subJson.keys?.auth || ''

    let deviceId = localStorage.getItem('biblio_device_id')
    if (!deviceId) {
      deviceId = Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem('biblio_device_id', deviceId)
    }

    // La tabla no es accesible desde el navegador; la función asocia el usuario de la sesión (auth.uid()) en el servidor
    const { error } = await supabase.rpc('biblio_push_subscribe', {
      p_endpoint: endpoint,
      p_p256dh: p256dh,
      p_auth: auth,
      p_device_id: deviceId,
    })
    if (error) throw error

    return true
  } catch (err) {
    console.warn('No se pudo completar la suscripción push:', err)
    return false
  }
}
