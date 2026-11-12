// Lo que los conectores de @biblioteca/core necesitan del navegador. Antes lo leían ellos mismos (lib/connect/server.ts
// importaba el cliente de Supabase y lib/connect/spotify.ts usaba window, localStorage, sessionStorage, crypto e
// import.meta.env); ahora la PWA se lo entrega al arrancar (`main.tsx`), con las mismas claves de almacenamiento para
// que los tokens de Spotify ya guardados sigan valiendo.
import { configureSpotify, setConnectClient, type SpotifyTokens } from '@biblioteca/core'
import { supabase } from './supabase'

const TOKENS_KEY = 'biblio-spotify-tokens'

/** Lectura síncrona de los tokens guardados (la pantalla Conectar la usa para su estado inicial, como antes). */
export function loadSpotifyTokensSync(): SpotifyTokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY)
    return raw ? (JSON.parse(raw) as SpotifyTokens) : null
  } catch {
    return null
  }
}

export function setupConnectors(): void {
  setConnectClient(supabase)
  configureSpotify({
    clientId: (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined) ?? '',
    redirectUri: () => `${window.location.origin}/conectar/spotify`,
    tokens: {
      load: async () => loadSpotifyTokensSync(),
      save: async (t) => {
        try { localStorage.setItem(TOKENS_KEY, JSON.stringify(t)) } catch { /* almacenamiento bloqueado */ }
      },
      clear: async () => {
        try { localStorage.removeItem(TOKENS_KEY) } catch { /* nada */ }
      },
    },
    session: {
      set: (key, value) => sessionStorage.setItem(key, value),
      take: (key) => {
        const v = sessionStorage.getItem(key)
        sessionStorage.removeItem(key)
        return v
      },
    },
    randomBytes: (n) => {
      const bytes = new Uint8Array(n)
      crypto.getRandomValues(bytes)
      return bytes
    },
    sha256: async (text) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))),
    openAuth: async (url) => {
      window.location.assign(url)
    },
  })
}
