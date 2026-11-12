// Avisos en el móvil. Equivale a app/src/lib/push.ts de la PWA, que usaba Web Push (service worker + servidor).
// En nativo hay dos mitades:
//   1. Avisos LOCALES programados en el propio móvil con expo-notifications. Funcionan en Expo Go (iOS y Android) y no
//      necesitan servidor: es lo que está activo hoy.
//   2. Avisos ENVIADOS por el servidor: `registerPushToken` (abajo), preparada y sin llamar.
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { kv } from './storage'
import { supabase } from './supabase'
import { planReminders, type ReminderInput } from '../components/notify/plan'
import type { NotificationTier } from '@biblioteca/core'

const DISMISSED_KEY = 'biblio_push_prompt_dismissed' // misma clave que la PWA, ahora en AsyncStorage
const DEVICE_KEY = 'biblio_device_id'
const CHANNEL_ID = 'avisos'

/** `expo-notifications` no hace nada en web; en iOS y Android sí (los locales también en Expo Go). */
export function isNotifySupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android'
}

export type NotifyPermission = 'granted' | 'denied' | 'undetermined'

/** `Notification.permission` de la PWA: `default` = `undetermined`. */
export async function getNotifyPermission(): Promise<NotifyPermission> {
  if (!isNotifySupported()) return 'denied'
  try {
    const p = await Notifications.getPermissionsAsync()
    if (p.granted) return 'granted'
    return p.status === Notifications.PermissionStatus.UNDETERMINED ? 'undetermined' : 'denied'
  } catch {
    return 'denied'
  }
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Avisos',
    importance: Notifications.AndroidImportance.DEFAULT,
  })
}

/**
 * `subscribeToPush` de la PWA, parte del permiso: pide el diálogo del sistema (en Android 13+ y en iOS). Devuelve si se
 * concedió. En Android 12 o menos no hay diálogo y el permiso ya está concedido.
 */
export async function requestNotifyPermission(): Promise<boolean> {
  if (!isNotifySupported()) return false
  try {
    await ensureChannel()
    const cur = await Notifications.getPermissionsAsync()
    if (cur.granted) return true
    if (!cur.canAskAgain) return false
    const res = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } })
    return res.granted
  } catch (err) {
    console.warn('No se pudo pedir el permiso de avisos:', err)
    return false
  }
}

export async function isPromptDismissed(): Promise<boolean> {
  try {
    return (await kv.getItem(DISMISSED_KEY)) != null
  } catch {
    return false
  }
}

export async function markPromptDismissed(): Promise<void> {
  try {
    await kv.setItem(DISMISSED_KEY, '1')
  } catch {
    // solo recuerda que ya se preguntó
  }
}

/** Quita todos los avisos locales programados (la app no programa otra cosa). */
export async function cancelReminders(): Promise<void> {
  if (!isNotifySupported()) return
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
  } catch {
    // sin permisos o sin módulo: no hay nada que cancelar
  }
}

/**
 * Reprograma los avisos locales según la frecuencia elegida (`settings.notificationTier`). Cancela los anteriores y programa
 * los de las próximas semanas con el estado actual de la biblioteca. Se llama al abrir la app y al cambiar la frecuencia.
 * Devuelve cuántos quedan programados.
 */
export async function syncReminders(tier: NotificationTier | undefined, input: ReminderInput): Promise<number> {
  if (!isNotifySupported()) return 0
  await cancelReminders()
  const effective = tier ?? 'important'
  if (effective === 'none') return 0
  if ((await getNotifyPermission()) !== 'granted') return 0
  try {
    await ensureChannel()
    const plan = planReminders(effective, input)
    for (const r of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.key,
        content: { title: r.title, body: r.body, data: { route: r.route } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined },
      })
    }
    return plan.length
  } catch (err) {
    console.warn('No se pudieron programar los avisos:', err)
    return 0
  }
}

async function deviceId(): Promise<string> {
  let id = await kv.getItem(DEVICE_KEY)
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    await kv.setItem(DEVICE_KEY, id)
  }
  return id
}

/**
 * AVISOS DEL SERVIDOR — PREPARADA Y SIN LLAMAR (nadie la usa todavía).
 * Obtiene el token del móvil y lo registra en Supabase con la misma función que la PWA (`biblio_push_subscribe`), con el
 * token de Expo como `endpoint` y las claves vacías. Falta, para activarla:
 *   1. Un dev build (`eas build`): desde el SDK 53, Expo Go en Android no da token de push. En iOS hace falta además
 *      el entitlement `aps-environment` y la cuenta de Apple Developer.
 *   2. El `projectId` de EAS en `app.json` (`extra.eas.projectId`) y, en Android, la clave FCM v1 subida a EAS.
 *   3. Que el servidor envíe a estos tokens: `supabase/functions/biblio-push-send` solo trata Web Push (y hoy ni siquiera
 *      envía, solo cuenta). Debe distinguir los endpoints `ExponentPushToken[...]` y enviarlos al API de Expo
 *      (https://exp.host/--/api/v2/push/send); hoy la tabla no tiene columna de tipo, basta ese prefijo.
 *   4. El `pg_cron` diario que evalúe las reglas y respete el máximo de 2 a la semana y la ventana 9:00-22:00 (PLAN_MEJORAS §5.3).
 */
export async function registerPushToken(): Promise<boolean> {
  if (!isNotifySupported() || !supabase) return false
  try {
    if (!(await requestNotifyPermission())) return false
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
    const { error } = await supabase.rpc('biblio_push_subscribe', {
      p_endpoint: token.data,
      p_p256dh: '',
      p_auth: '',
      p_device_id: await deviceId(),
    })
    if (error) throw error
    return true
  } catch (err) {
    console.warn('No se pudo completar el registro de avisos:', err)
    return false
  }
}
