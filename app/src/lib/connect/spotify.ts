// Spotify con OAuth PKCE en el navegador (sin servidor). Apagado mientras no exista VITE_SPOTIFY_CLIENT_ID.
// Ojo: en modo desarrollo Spotify solo deja entrar a 25 usuarios dados de alta a mano.
import type { Connector } from './types'
import { ConnectorUnavailable } from './types'
import type { ImportRow } from '../import/types'

const AUTHORIZE = 'https://accounts.spotify.com/authorize'
const TOKEN = 'https://accounts.spotify.com/api/token'
const SCOPE = 'user-top-read user-follow-read user-library-read'
const TOKENS_KEY = 'biblio-spotify-tokens'
const VERIFIER_KEY = 'biblio-spotify-verifier'
const STATE_KEY = 'biblio-spotify-state'

export const SPOTIFY_CLIENT_ID: string = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined) ?? ''
export const spotifyEnabled = Boolean(SPOTIFY_CLIENT_ID)
export const spotifyRedirectUri = () => `${window.location.origin}/conectar/spotify`

interface Tokens {
  access_token: string
  refresh_token?: string
  /** instante (ms) en que caduca el access_token */
  expires_at: number
}

function b64url(bytes: Uint8Array): string {
  let s = ''
  bytes.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomString(len = 64): string {
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  return b64url(bytes).slice(0, len)
}

async function challengeOf(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return b64url(new Uint8Array(digest))
}

function saveTokens(t: Tokens) {
  try { localStorage.setItem(TOKENS_KEY, JSON.stringify(t)) } catch { /* almacenamiento bloqueado */ }
}

export function loadSpotifyTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY)
    return raw ? (JSON.parse(raw) as Tokens) : null
  } catch {
    return null
  }
}

export function disconnectSpotify() {
  try { localStorage.removeItem(TOKENS_KEY) } catch { /* nada */ }
}

/** Manda al usuario a Spotify a dar permiso. Vuelve a /conectar/spotify con ?code=… */
export async function startSpotifyAuth(): Promise<void> {
  if (!spotifyEnabled) throw new ConnectorUnavailable('Muy pronto')
  const verifier = randomString(96)
  const state = randomString(16)
  try {
    sessionStorage.setItem(VERIFIER_KEY, verifier)
    sessionStorage.setItem(STATE_KEY, state)
  } catch { /* si falla, el cambio de código fallará con un mensaje claro */ }
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: spotifyRedirectUri(),
    scope: SCOPE,
    code_challenge_method: 'S256',
    code_challenge: await challengeOf(verifier),
    state,
  })
  window.location.assign(`${AUTHORIZE}?${params.toString()}`)
}

async function tokenRequest(body: Record<string, string>): Promise<Tokens> {
  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, ...body }).toString(),
  })
  if (!res.ok) throw new Error(`Spotify ${res.status}`)
  const j = await res.json()
  const prev = loadSpotifyTokens()
  const tokens: Tokens = {
    access_token: j.access_token,
    // en un refresco Spotify puede no devolver un refresh_token nuevo: se conserva el anterior
    refresh_token: j.refresh_token ?? prev?.refresh_token,
    expires_at: Date.now() + (j.expires_in ?? 3600) * 1000 - 30_000,
  }
  saveTokens(tokens)
  return tokens
}

/** Cambia el código que trae la redirección por los tokens. Devuelve false si el estado no coincide. */
export async function finishSpotifyAuth(code: string, state: string | null): Promise<boolean> {
  let verifier: string | null = null
  let expected: string | null = null
  try {
    verifier = sessionStorage.getItem(VERIFIER_KEY)
    expected = sessionStorage.getItem(STATE_KEY)
    sessionStorage.removeItem(VERIFIER_KEY)
    sessionStorage.removeItem(STATE_KEY)
  } catch { /* nada */ }
  if (!verifier || !expected || expected !== state) return false
  await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: spotifyRedirectUri(), code_verifier: verifier })
  return true
}

async function validToken(): Promise<string> {
  let t = loadSpotifyTokens()
  if (!t) throw new ConnectorUnavailable('Vuelve a conectar Spotify')
  if (Date.now() >= t.expires_at) {
    if (!t.refresh_token) throw new ConnectorUnavailable('Vuelve a conectar Spotify')
    t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh_token })
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
