import { useCallback, useRef, useState, type ComponentRef, type ReactElement } from 'react'
import { StyleSheet, View } from 'react-native'
import { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import { ACTIVE_SHELVES, getItem, profileUrl, type Item, type Profile, type ShelfType } from '@biblioteca/core'
import { CARD_H, CARD_W, ProfileShareCard, posterCount } from '../components/share/ProfileShareCard'
import { sharedProfileOf } from '../components/profile/shareProfile'
import { WEB_ORIGIN } from './webOrigin'

/**
 * `generateShareCard` + `shareOrDownloadCard` de la PWA (lib/shareCard.ts) en una sola llamada: monta la tarjeta fuera de
 * pantalla, espera a que carguen las portadas, la captura a 1080 × 1920 con react-native-view-shot y abre la hoja de
 * compartir del sistema con expo-sharing (Instagram Stories aparece ahí si está instalada).
 *
 * Uso en Perfil:
 *   const { shareStoryCard, generating, cardHost } = useShareStoryCard()
 *   … dentro del JSX de la pantalla: {cardHost}
 *   const r = await shareStoryCard(profile, rankings)   // { ok, message }
 *   if (r.message) setToast(r.message); if (r.ok) setShareOpen(false)
 */

const POSTER_TIMEOUT = 8000 // una portada que no llega no bloquea la tarjeta: se queda con la inicial, como en el canvas

interface Job {
  title: string
  author: string
  items: Item[]
  shareUrl: string
}

export interface ShareCardResult {
  ok: boolean
  /** Aviso para el toast cuando algo falla; null si todo fue bien (compartido o cancelado). */
  message: string | null
}

/** Las cinco primeras obras de los rankings, sin repetir, recorriendo las estanterías (Profile.tsx:92-100). */
export function topItemsOf(rankings: Partial<Record<ShelfType, string[]>>, max = 5): Item[] {
  const ids: string[] = []
  for (const t of ACTIVE_SHELVES) {
    for (const id of rankings[t] ?? []) {
      if (!ids.includes(id)) ids.push(id)
      if (ids.length >= max) break
    }
    if (ids.length >= max) break
  }
  return ids.map((id) => getItem(id)).filter(Boolean) as Item[]
}

/** Nombre de archivo de la PWA: `biblioteca-<nombre-en-minúsculas>.png`. */
export const cardFileName = (name: string) => `biblioteca-${name.toLowerCase().replace(/\s+/g, '-')}.png`

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

export function useShareStoryCard(): { shareStoryCard: (profile: Pick<Profile, 'name' | 'avatarColor'>, rankings: Partial<Record<ShelfType, string[]>>) => Promise<ShareCardResult>; generating: boolean; cardHost: ReactElement | null } {
  const [job, setJob] = useState<Job | null>(null)
  const [generating, setGenerating] = useState(false)
  const cardRef = useRef<ComponentRef<typeof View>>(null)
  const pending = useRef({ left: 0, done: null as (() => void) | null })

  const onPosterSettled = useCallback(() => {
    const p = pending.current
    p.left = Math.max(0, p.left - 1)
    if (p.left === 0) p.done?.()
  }, [])

  const shareStoryCard = useCallback(
    async (profile: Pick<Profile, 'name' | 'avatarColor'>, rankings: Partial<Record<ShelfType, string[]>>): Promise<ShareCardResult> => {
      if (generating) return { ok: false, message: null }
      setGenerating(true)
      try {
        const items = topItemsOf(rankings)
        if (items.length === 0) return { ok: false, message: 'Ordena alguna obra antes de crear tu tarjeta' }
        if (!(await Sharing.isAvailableAsync())) return { ok: false, message: 'Tu dispositivo no puede compartir imágenes' }

        const shareUrl = profileUrl(WEB_ORIGIN, sharedProfileOf(profile, rankings))
        const wait = posterCount(items)
        const loaded = new Promise<void>((resolve) => {
          pending.current = { left: wait, done: resolve }
          if (wait === 0) resolve()
          setTimeout(resolve, POSTER_TIMEOUT)
        })
        setJob({ title: 'Lo que más me marcó', author: profile.name, items, shareUrl })
        await loaded
        await nextFrame()
        await nextFrame()

        const raw = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile', width: CARD_W, height: CARD_H })
        const uri = raw.startsWith('file://') ? raw : `file://${raw}`
        // Cancelar la hoja del sistema no es un error: `shareAsync` termina igual (la PWA tampoco descargaba al cancelar)
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Mi Biblioteca' })
        return { ok: true, message: null }
      } catch {
        return { ok: false, message: 'No se pudo crear la tarjeta' }
      } finally {
        pending.current = { left: 0, done: null }
        setJob(null)
        setGenerating(false)
      }
    },
    [generating],
  )

  const cardHost = job ? (
    <View pointerEvents="none" style={styles.offscreen} collapsable={false}>
      <ProfileShareCard ref={cardRef} title={job.title} author={job.author} items={job.items} shareUrl={job.shareUrl} onPosterSettled={onPosterSettled} />
    </View>
  ) : null

  return { shareStoryCard, generating, cardHost }
}

// Fuera de la pantalla pero montada (Android no pinta bien una vista con opacidad 0 o sin tamaño)
const styles = StyleSheet.create({
  offscreen: { position: 'absolute', left: -4000, top: 0 },
})
