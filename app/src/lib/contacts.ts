// Amigos a partir de la agenda (migración 0006). Los números se envían a la función de Supabase, que los compara
// con los de quienes han activado «que me encuentren por mi teléfono» y no los guarda.
import { supabase } from './supabase'
import { normalizePhone } from './phone'

/** PostgREST responde PGRST202 cuando la función no existe (migración 0006 sin aplicar). */
export const isMissingFunction = (e: { code?: string; message?: string } | null | undefined) =>
  Boolean(e && (e.code === 'PGRST202' || /could not find the function/i.test(e.message ?? '')))

interface ContactsManager {
  select: (props: string[], opts?: { multiple?: boolean }) => Promise<{ name?: string[]; tel?: string[] }[]>
}

/**
 * Selector de contactos del navegador. Solo existe en Chrome para Android: allí el sistema pide permiso y la persona
 * elige qué contactos compartir (puede marcarlos todos). En iPhone y ordenador no hay forma de leer la agenda desde la web.
 */
export const canPickContacts = () =>
  typeof navigator !== 'undefined' && 'contacts' in navigator && typeof window !== 'undefined' && 'ContactsManager' in window

export interface PickedContact {
  name: string
  phone: string // E.164
}

export async function pickContacts(country = 'ES'): Promise<PickedContact[]> {
  const mgr = (navigator as unknown as { contacts: ContactsManager }).contacts
  const raw = await mgr.select(['name', 'tel'], { multiple: true })
  const out: PickedContact[] = []
  const seen = new Set<string>()
  for (const c of raw) {
    const name = c.name?.find((n) => n.trim())?.trim() || 'Sin nombre'
    // un contacto puede tener varios números: se queda el primero válido (normalmente el móvil)
    const phone = (c.tel ?? []).map((t) => normalizePhone(t, country)).find(Boolean)
    if (!phone || seen.has(phone)) continue
    seen.add(phone)
    out.push({ name, phone })
  }
  return out
}

export interface ContactOnApp extends PickedContact {
  userId: string
  displayName: string
  avatarUrl: string | null
}

const MAX_PER_CALL = 500

/** Separa los contactos en quienes ya usan la app (y aún no son amigos) y el resto. */
export async function matchContacts(contacts: PickedContact[]): Promise<{ onApp: ContactOnApp[]; others: PickedContact[] }> {
  if (!supabase || contacts.length === 0) return { onApp: [], others: contacts }
  const found = new Map<number, ContactOnApp>()
  for (let start = 0; start < contacts.length; start += MAX_PER_CALL) {
    const chunk = contacts.slice(start, start + MAX_PER_CALL)
    const { data, error } = await supabase.rpc('biblio_match_contacts', { p_phones: chunk.map((c) => c.phone) })
    if (error) {
      if (isMissingFunction(error)) break // sin 0006 no hay cruce: todos van a «invitar»
      throw new Error(error.message)
    }
    for (const r of (data ?? []) as { idx: number; user_id: string; display_name: string; avatar_url: string | null }[]) {
      const i = start + r.idx - 1 // la función numera desde 1
      if (contacts[i] && !found.has(i)) found.set(i, { ...contacts[i], userId: r.user_id, displayName: r.display_name, avatarUrl: r.avatar_url })
    }
  }
  return {
    onApp: [...found.values()],
    others: contacts.filter((_, i) => !found.has(i)),
  }
}

/** ¿Te pueden encontrar por tu teléfono? null si no se sabe (sin sesión o sin 0006). */
export async function getPhoneDiscoverable(): Promise<boolean | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('biblio_phone_status')
  return error ? null : Boolean(data)
}

/** Guarda tu número (solo su huella en el servidor) o lo quita con null. */
export async function setPhoneDiscoverable(raw: string | null, country = 'ES'): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Sin conexión' }
  const phone = raw === null ? null : normalizePhone(raw, country)
  if (raw !== null && !phone) return { ok: false, error: 'Ese número no parece válido' }
  const { error } = await supabase.rpc('biblio_set_phone', { p_phone: phone })
  if (error) return { ok: false, error: isMissingFunction(error) ? 'Aún no disponible: falta actualizar el servidor' : error.message }
  return { ok: true }
}

