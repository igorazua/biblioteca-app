// Amigos a partir de la agenda (migración 0006). Los números se envían a la función de Supabase, que los compara
// con los de quienes han activado «que me encuentren por mi teléfono» y no los guarda. Los nombres no salen del móvil.
//
// Nativo (docs/APP_NATIVA.md): `expo-contacts` lee la agenda entera tras la pantalla previa y el permiso del sistema.
// Para no agotar el límite de 2000 números al día de `biblio_match_contacts`, el móvil recuerda qué números ya cruzó
// guardando solo un hash (SHA-256 con sal propia de la instalación), nunca el número, y envía únicamente los nuevos.
// `phone` no sale en el índice de core (pendiente de añadirlo): import profundo, es un módulo puro
import { normalizePhone } from '@biblioteca/core/src/lib/phone'
import { kv } from './storage'
import { supabase } from './supabase'

/** PostgREST responde PGRST202 cuando la función no existe (migración 0006 sin aplicar). */
export const isMissingFunction = (e: { code?: string; message?: string } | null | undefined) =>
  Boolean(e && (e.code === 'PGRST202' || /could not find the function/i.test(e.message ?? '')))

export interface PickedContact {
  name: string
  phone: string // E.164
}

export interface ContactOnApp extends PickedContact {
  userId: string
  displayName: string
  avatarUrl: string | null
}

// ── Permiso y lectura ────────────────────────────────────────────────────────────────────────

export type ContactsAccess = 'all' | 'limited' | 'denied' | 'undetermined'
export interface ContactsAccessInfo {
  access: ContactsAccess
  /** `false` cuando el sistema ya no deja volver a preguntar: hay que mandar a Ajustes del teléfono. */
  canAskAgain: boolean
}

// `expo-contacts/legacy` se pide al usarlo y no al importar: así este módulo se puede probar en node.
const native = () => require('expo-contacts/legacy') as typeof import('expo-contacts/legacy')

function toInfo(r: { status: string; canAskAgain: boolean; accessPrivileges?: 'all' | 'limited' | 'none' }): ContactsAccessInfo {
  if (r.status === 'granted') return { access: r.accessPrivileges === 'limited' ? 'limited' : 'all', canAskAgain: r.canAskAgain }
  if (r.status === 'denied') return { access: 'denied', canAskAgain: r.canAskAgain }
  return { access: 'undetermined', canAskAgain: r.canAskAgain }
}

export async function getContactsAccess(): Promise<ContactsAccessInfo> {
  return toInfo(await native().getPermissionsAsync())
}

/** Abre el diálogo del sistema. Llamar solo después de la pantalla previa. El acceso limitado de iOS cuenta como permitido. */
export async function requestContactsAccess(): Promise<ContactsAccessInfo> {
  return toInfo(await native().requestPermissionsAsync())
}

/** iOS 18, acceso limitado: deja elegir qué contactos más ve la app. En Android no hace nada. */
export async function expandLimitedAccess(): Promise<void> {
  try {
    await native().presentAccessPickerAsync()
  } catch {
    // no disponible en esta plataforma o cancelado
  }
}

interface RawPhone {
  number?: string
  digits?: string
  label?: string
  isPrimary?: boolean
}

const MOBILE_LABEL = /mobile|m[oó]vil|cell|iphone|main|principal/i

/**
 * Un único número válido por contacto, en E.164: primero el móvil (por etiqueta), luego el marcado como principal
 * y luego el primero que se pueda normalizar. null si ninguno sirve.
 */
export function pickPhone(phones: RawPhone[] | undefined, country = 'ES'): string | null {
  const list = (phones ?? []).map((p) => ({ p, e164: normalizePhone(p.number ?? p.digits ?? '', country) })).filter((x) => x.e164)
  if (list.length === 0) return null
  const best = list.find((x) => x.p.label && MOBILE_LABEL.test(x.p.label)) ?? list.find((x) => x.p.isPrimary) ?? list[0]
  return best.e164
}

/** Quita los contactos repetidos por número (se queda el primero). */
export function dedupeByPhone(contacts: PickedContact[]): PickedContact[] {
  const seen = new Set<string>()
  const out: PickedContact[] = []
  for (const c of contacts) {
    if (seen.has(c.phone)) continue
    seen.add(c.phone)
    out.push(c)
  }
  return out
}

/** Lee la agenda (hay que tener permiso) y devuelve un contacto por número válido. */
export async function readContacts(country = 'ES'): Promise<PickedContact[]> {
  const C = native()
  const res = await C.getContactsAsync({ fields: [C.Fields.Name, C.Fields.PhoneNumbers] })
  const out: PickedContact[] = []
  for (const c of res.data) {
    const phone = pickPhone(c.phoneNumbers as RawPhone[] | undefined, country)
    if (!phone) continue
    out.push({ name: c.name?.trim() || 'Sin nombre', phone })
  }
  return dedupeByPhone(out)
}

// ── Cruce con memoria de lo ya enviado ───────────────────────────────────────────────────────

export const MAX_PER_CALL = 500
/** Un número que no estaba en la app se vuelve a cruzar pasados 7 días (puede haberse registrado); uno que sí, a los 30. */
const RECHECK_MISS_MS = 7 * 24 * 3600_000
const RECHECK_HIT_MS = 30 * 24 * 3600_000

export interface CachedMatch {
  userId: string
  displayName: string
  avatarUrl: string | null
}
export type CrossCache = Record<string, { at: number; m?: CachedMatch }>

/** Separa los contactos entre los que hay que enviar (nuevos o caducados) y los ya conocidos. Pura: recibe el hash de cada número. */
export function planMatch(contacts: PickedContact[], hashes: string[], cache: CrossCache, now: number) {
  const toSend: { contact: PickedContact; hash: string }[] = []
  const known: { contact: PickedContact; hash: string; m?: CachedMatch }[] = []
  contacts.forEach((contact, i) => {
    const hash = hashes[i]
    const hit = cache[hash]
    const fresh = hit && now - hit.at < (hit.m ? RECHECK_HIT_MS : RECHECK_MISS_MS)
    if (fresh) known.push({ contact, hash, m: hit.m })
    else toSend.push({ contact, hash })
  })
  return { toSend, known }
}

type MatchRow = { idx: number; user_id: string; display_name: string; avatar_url: string | null }

export interface MatchDeps {
  rpc: (phones: string[]) => Promise<{ data: MatchRow[] | null; error: { code?: string; message?: string } | null }>
  hash: (phone: string) => Promise<string>
  loadCache: () => Promise<CrossCache>
  saveCache: (c: CrossCache) => Promise<void>
  now: () => number
}

export interface MatchResult {
  onApp: ContactOnApp[]
  others: PickedContact[]
  /** Cuántos números se enviaron al servidor esta vez (el resto estaban ya cruzados). */
  sent: number
}

/**
 * Separa los contactos en quienes ya usan la app (y aún no son amigos) y el resto.
 * `friendIds`: usuarios que ya son amigos; se quitan de los resultados recordados.
 */
export async function matchContactsWith(deps: MatchDeps, contacts: PickedContact[], friendIds: ReadonlySet<string> = new Set()): Promise<MatchResult> {
  if (contacts.length === 0) return { onApp: [], others: [], sent: 0 }
  const cache = await deps.loadCache()
  const hashes = await Promise.all(contacts.map((c) => deps.hash(c.phone)))
  const now = deps.now()
  const { toSend, known } = planMatch(contacts, hashes, cache, now)

  const found = new Map<string, ContactOnApp>() // por teléfono
  for (const k of known) {
    if (k.m && !friendIds.has(k.m.userId)) found.set(k.contact.phone, { ...k.contact, ...k.m })
  }
  const skip = new Set(known.filter((k) => k.m && friendIds.has(k.m.userId)).map((k) => k.contact.phone))

  let sent = 0
  let stop: Error | null = null
  let missing = false
  for (let start = 0; start < toSend.length && !stop && !missing; start += MAX_PER_CALL) {
    const chunk = toSend.slice(start, start + MAX_PER_CALL)
    const { data, error } = await deps.rpc(chunk.map((c) => c.contact.phone))
    if (error) {
      if (isMissingFunction(error)) missing = true // sin 0006 no hay cruce: todos van a «invitar» y no se recuerda nada
      else stop = new Error(error.message || 'No se pudo buscar en tus contactos')
      break
    }
    sent += chunk.length
    const hitIdx = new Map<number, MatchRow>()
    for (const r of data ?? []) hitIdx.set(r.idx - 1, r) // la función numera desde 1
    chunk.forEach(({ contact, hash }, i) => {
      const r = hitIdx.get(i)
      if (r) {
        const m: CachedMatch = { userId: r.user_id, displayName: r.display_name, avatarUrl: r.avatar_url }
        cache[hash] = { at: now, m }
        found.set(contact.phone, { ...contact, ...m })
      } else {
        cache[hash] = { at: now }
      }
    })
    await deps.saveCache(cache) // tras cada tanda: si se corta, lo ya cruzado no se repite
  }

  // fallo a mitad (p. ej. límite diario): se devuelve lo que se tenga y se avisa después
  const result: MatchResult = {
    onApp: [...found.values()],
    others: contacts.filter((c) => !found.has(c.phone) && !skip.has(c.phone)),
    sent,
  }
  if (stop) throw Object.assign(stop, { partial: result })
  return result
}

// ── Cableado real ────────────────────────────────────────────────────────────────────────────

const SALT_KEY = 'biblio_contacts_salt'
const cacheKey = (userId: string) => `biblio_contacts_xref_v1_${userId}`

async function getSalt(): Promise<string> {
  let salt = await kv.getItem(SALT_KEY)
  if (!salt) {
    const Crypto = require('expo-crypto') as typeof import('expo-crypto')
    salt = Array.from(Crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
    await kv.setItem(SALT_KEY, salt)
  }
  return salt
}

/** SHA-256 de «sal:número». El número nunca se guarda. */
export async function hashPhone(phone: string, salt: string): Promise<string> {
  const Crypto = require('expo-crypto') as typeof import('expo-crypto')
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${phone}`)
}

export async function matchContacts(contacts: PickedContact[], userId: string, friendIds: ReadonlySet<string> = new Set()): Promise<MatchResult> {
  if (!supabase) return { onApp: [], others: contacts, sent: 0 }
  const client = supabase
  const salt = await getSalt()
  return matchContactsWith(
    {
      rpc: async (phones) => {
        const { data, error } = await client.rpc('biblio_match_contacts', { p_phones: phones })
        return { data: (data ?? null) as MatchRow[] | null, error }
      },
      hash: (p) => hashPhone(p, salt),
      loadCache: async () => {
        try {
          return JSON.parse((await kv.getItem(cacheKey(userId))) ?? '{}') as CrossCache
        } catch {
          return {}
        }
      },
      saveCache: (c) => kv.setItem(cacheKey(userId), JSON.stringify(c)),
      now: Date.now,
    },
    contacts,
    friendIds,
  )
}

/** Olvida lo cruzado (al cerrar sesión o borrar la cuenta). */
export async function clearContactsCache(userId: string): Promise<void> {
  await kv.removeItem(cacheKey(userId))
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
