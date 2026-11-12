// Spotify con OAuth PKCE (sin servidor). Apagado mientras la app no entregue un `clientId` con `configureSpotify`.
// Ojo: en modo desarrollo Spotify solo deja entrar a 25 usuarios dados de alta a mano.
// Lo que en la PWA tocaba el navegador (`window`, `localStorage`, `sessionStorage`, `crypto`, `import.meta.env`) lo entrega la app.
import type { Connector } from './types'
import { ConnectorUnavailable } from './types'
import type { ImportRow } from '../import/types'

const AUTHORIZE = 'https://accounts.spotify.com/authorize'
const TOKEN = 'https://accounts.spotify.com/api/token'
const SCOPE = 'user-top-read user-follow-read user-library-read'

export interface SpotifyTokens {
  access_token: string
  refresh_token?: string
  /** instante (ms) en que caduca el access_token */
  expires_at: number
}

/** Todo lo que el motor necesita del entorno. */
export interface SpotifyEnv {
  /** Sin él, Spotify queda apagado («Pronto»), igual que sin `VITE_SPOTIFY_CLIENT_ID` en la PWA. */
  clientId: string
  /** Dirección a la que Spotify devuelve el código (la de `/conectar/spotify`). */
  redirectUri: () => string
  /** Tokens guardados (la PWA: localStorage; la nativa: AsyncStorage). */
  tokens: {
    load: () => Promise<SpotifyTokens | null>
    save: (t: SpotifyTokens) => Promise<void>
    clear: () => Promise<void>
  }
  /** Verificador y estado del intento en curso (la PWA: sessionStorage). Los dos se leen y se borran en `finishSpotifyAuth`. */
  session: {
    set: (key: string, value: string) => void
    take: (key: string) => string | null
  }
  /** Bytes aleatorios seguros (`crypto.getRandomValues`). */
  randomBytes: (n: number) => Uint8Array
  /** SHA-256 del texto. */
  sha256: (text: string) => Promise<Uint8Array>
  /** Manda al usuario a Spotify (la PWA: `window.location.assign`; la nativa: una sesión del navegador del sistema). */
  openAuth: (url: string) => Promise<void>
}

const VERIFIER_KEY = 'biblio-spotify-verifier'
const STATE_KEY = 'biblio-spotify-state'

let env: SpotifyEnv | null = null

export function configureSpotify(e: SpotifyEnv | null): void {
  env = e
}

export const spotifyEnabled = (): boolean => Boolean(env?.clientId)

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/** Base64 «seguro para URL» y sin relleno (sin `btoa`, que no es igual en todos los motores de JS). */
export function b64url(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63]
    if (i + 1 < bytes.length) out += B64[(n >> 6) & 63]
    if (i + 2 < bytes.length) out += B64[n & 63]
  }
  return out
}

function randomString(e: SpotifyEnv, len = 64): string {
  return b64url(e.randomBytes(len)).slice(0, len)
}

/** Consulta de la dirección (sin `URLSearchParams`, que Hermes no trae completo). */
function query(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

async function saveTokens(e: SpotifyEnv, t: SpotifyTokens) {
  try { await e.tokens.save(t) } catch { /* almacenamiento bloqueado */ }
}

export async function loadSpotifyTokens(): Promise<SpotifyTokens | null> {
  if (!env) return null
  try {
    return await env.tokens.load()
  } catch {
    return null
  }
}

export async function disconnectSpotify(): Promise<void> {
  if (!env) return
  try { await env.tokens.clear() } catch { /* nada */ }
}

/** Manda al usuario a Spotify a dar permiso. Vuelve a /conectar/spotify con ?code=… */
export async function startSpotifyAuth(): Promise<void> {
  const e = env
  if (!e || !e.clientId) throw new ConnectorUnavailable('Muy pronto')
  const verifier = randomString(e, 96)
  const state = randomString(e, 16)
  try {
    e.session.set(VERIFIER_KEY, verifier)
    e.session.set(STATE_KEY, state)
  } catch { /* si falla, el cambio de código fallará con un mensaje claro */ }
  const qs = query({
    client_id: e.clientId,
    response_type: 'code',
    redirect_uri: e.redirectUri(),
    scope: SCOPE,
    code_challenge_method: 'S256',
    code_challenge: b64url(await e.sha256(verifier)),
    state,
  })
  await e.openAuth(`${AUTHORIZE}?${qs}`)
}

async function tokenRequest(e: SpotifyEnv, body: Record<string, string>): Promise<SpotifyTokens> {
  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: query({ client_id: e.clientId, ...body }),
  })
  if (!res.ok) throw new Error(`Spotify ${res.status}`)
  const j = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number }
  const prev = await loadSpotifyTokens()
  const tokens: SpotifyTokens = {
    access_token: j.access_token,
    // en un refresco Spotify puede no devolver un refresh_token nuevo: se conserva el anterior
    refresh_token: j.refresh_token ?? prev?.refresh_token,
    expires_at: Date.now() + (j.expires_in ?? 3600) * 1000 - 30_000,
  }
  await saveTokens(e, tokens)
  return tokens
}

/** Cambia el código que trae la redirección por los tokens. Devuelve false si el estado no coincide. */
export async function finishSpotifyAuth(code: string, state: string | null): Promise<boolean> {
  const e = env
  if (!e || !e.clientId) return false
  let verifier: string | null = null
  let expected: string | null = null
  try {
    verifier = e.session.take(VERIFIER_KEY)
    expected = e.session.take(STATE_KEY)
  } catch { /* nada */ }
  if (!verifier || !expected || expected !== state) return false
  await tokenRequest(e, { grant_type: 'authorization_code', code, redirect_uri: e.redirectUri(), code_verifier: verifier })
  return true
}

async function validToken(): Promise<string> {
  const e = env
  if (!e) throw new ConnectorUnavailable('Vuelve a conectar Spotify')
  let t = await loadSpotifyTokens()
  if (!t) throw new ConnectorUnavailable('Vuelve a conectar Spotify')
  if (Date.now() >= t.expires_at) {
    if (!t.refresh_token) throw new ConnectorUnavailable('Vuelve a conectar Spotify')
    t = await tokenRequest(e, { grant_type: 'refresh_token', refresh_token: t.refresh_token })
  }
  return t.access_token
}

async function api<T>(path: string): Promise<T> {
  const token = await validToken()
  const res = await fetch(`https://api.spotify.com${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 401 || res.status === 403) throw new ConnectorUnavailable('Vuelve a conectar Spotify')
  if (!res.ok) throw new Error(`Spotify ${res.status}`)
  return res.json() as Promise<T>
}

interface SpArtist { name: string }

/** Artistas top (4 semanas, 6 meses, años), seguidos y los de los álbumes guardados, sin repetir. */
export async function fetchSpotifyArtists(): Promise<ImportRow[]> {
  const names = new Map<string, string>() // clave en minúsculas -> nombre
  const add = (a?: SpArtist) => {
    if (a?.name && !names.has(a.name.toLowerCase())) names.set(a.name.toLowerCase(), a.name)
  }

  for (const range of ['short_term', 'medium_term', 'long_term']) {
    const j = await api<{ items: SpArtist[] }>(`/v1/me/top/artists?time_range=${range}&limit=50`)
    j.items.forEach(add)
  }

  let after: string | undefined
  for (let i = 0; i < 20; i++) {
    const j = await api<{ artists: { items: SpArtist[]; cursors?: { after?: string } } }>(
      `/v1/me/following?type=artist&limit=50${after ? `&after=${after}` : ''}`
    )
    j.artists.items.forEach(add)
    after = j.artists.cursors?.after
    if (!after || j.artists.items.length < 50) break
  }

  for (let offset = 0; offset < 1000; offset += 50) {
    const j = await api<{ items: { album: { artists: SpArtist[] } }[]; next: string | null }>(`/v1/me/albums?limit=50&offset=${offset}`)
    for (const it of j.items) it.album.artists.forEach(add)
    if (!j.next) break
  }

  return [...names.values()].map((title) => ({ type: 'artist' as const, title, status: 'seen' as const }))
}

export const spotify: Connector = {
  id: 'spotify',
  method: 'oauth',
  shelves: ['artist'],
  fetchRows: () => fetchSpotifyArtists(),
}
