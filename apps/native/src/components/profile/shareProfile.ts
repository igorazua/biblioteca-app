import { Platform, Share } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { ACTIVE_SHELVES, APP_NAME, type Profile, type ShelfType } from '@biblioteca/core'
import { profileUrl, type SharedProfile } from '@biblioteca/core/src/lib/share'
import { WEB_ORIGIN } from '../../lib/webOrigin'

/** Lo que ve quien abre el enlace: nombre, color y el top 3 de cada estantería (Profile.tsx:76). */
export function sharedProfileOf(profile: Pick<Profile, 'name' | 'avatarColor'>, rankings: Partial<Record<ShelfType, string[]>>): SharedProfile {
  const top: SharedProfile['top'] = {}
  for (const t of ACTIVE_SHELVES) {
    const top3 = (rankings[t] ?? []).slice(0, 3)
    if (top3.length) top[t] = top3
  }
  return { k: 'p', n: profile.name, c: profile.avatarColor, top }
}

/**
 * «Enviar enlace» (shareOrCopy de la PWA): hoja de compartir del sistema y, si no la hay, el portapapeles.
 * Devuelve el aviso que toca mostrar: «Enlace de tu perfil copiado» solo si se copió, como en la PWA.
 */
export async function shareProfileLink(profile: Pick<Profile, 'name' | 'avatarColor'>, rankings: Partial<Record<ShelfType, string[]>>): Promise<string | null> {
  const url = profileUrl(WEB_ORIGIN, sharedProfileOf(profile, rankings))
  const title = `Perfil de ${profile.name} en ${APP_NAME}`
  const text = `Lo que más me ha formado según ${APP_NAME}`
  try {
    // En Android `Share` solo lleva el mensaje: el enlace va dentro de él. En iOS va aparte.
    const res = await Share.share(Platform.OS === 'ios' ? { title, message: text, url } : { title, message: `${text}\n${url}` })
    void res
    return null
  } catch {
    try {
      await Clipboard.setStringAsync(url)
      return 'Enlace de tu perfil copiado'
    } catch {
      return 'No se pudo compartir el enlace'
    }
  }
}
