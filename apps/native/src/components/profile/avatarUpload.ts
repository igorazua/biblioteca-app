import { supabase } from '../../lib/supabase'
import type { CroppedAvatar } from './AvatarCropper'
import { base64ToBytes } from './base64'

/** Foto como `data:` URI: sin sesión se guarda en el propio perfil, como el `FileReader` de la PWA. */
export const toDataUri = (img: CroppedAvatar) => `data:${img.mime};base64,${img.base64}`

/**
 * Sube la foto al almacenamiento de la cuenta (`biblio-avatars/<id>/avatar.<ext>`, igual que la PWA) y guarda su dirección en
 * `biblio_profiles`. Devuelve la dirección pública con `?v=` para saltarse la caché. Lanza si falla algún paso.
 */
export async function uploadAvatarToCloud(userId: string, img: CroppedAvatar): Promise<string> {
  if (!supabase) throw new Error('No conectado')
  const filePath = `${userId}/avatar.${img.mime === 'image/webp' ? 'webp' : 'jpg'}`
  const bytes = base64ToBytes(img.base64)
  const { error } = await supabase.storage.from('biblio-avatars').upload(filePath, bytes.slice().buffer as ArrayBuffer, { contentType: img.mime, upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('biblio-avatars').getPublicUrl(filePath)
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`
  const { error: e2 } = await supabase.from('biblio_profiles').update({ avatar_url: avatarUrl }).eq('id', userId)
  if (e2) throw e2
  return avatarUrl
}
