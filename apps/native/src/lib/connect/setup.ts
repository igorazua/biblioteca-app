import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { router } from 'expo-router'
import { configureSpotify, setConnectClient, type SpotifyTokens } from '@biblioteca/core'
import { supabase } from '../supabase'

// Entrega a core lo que los conectores tomaban del navegador en la PWA (cliente de Supabase y entorno de Spotify).
// Las variables EXPO_PUBLIC_* se leen con su nombre literal (se sustituyen al empaquetar).
const TOKENS_KEY = 'biblio-spotify-tokens'

/** La dirección a la que Spotify devuelve el código: la ruta `/conectar/spotify` de la app. Hay que darla de alta en el panel de Spotify. */
export const spotifyRedirectUri = (): string => Linking.createURL('conectar/spotify')

const session = new Map<string, string>() // el verificador y el estado del intento en curso viven solo en memoria

let done = false

/** Idempotente: la llaman las pantallas de Conectar al cargarse. */
export function setupConnect(): void {
  if (done) return
  done = true
  setConnectClient(supabase)
  configureSpotify({
    clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || '',
    redirectUri: spotifyRedirectUri,
    tokens: {
      load: async () => {
        const raw = await AsyncStorage.getItem(TOKENS_KEY)
        return raw ? (JSON.parse(raw) as SpotifyTokens) : null
      },
      save: (t) => AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(t)),
      clear: () => AsyncStorage.removeItem(TOKENS_KEY),
    },
    session: {
      set: (k, v) => void session.set(k, v),
      take: (k) => {
        const v = session.get(k) ?? null
        session.delete(k)
        return v
      },
    },
    randomBytes: (n) => Crypto.getRandomBytes(n),
    sha256: async (text) => new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new TextEncoder().encode(text))),
    // La PWA salía de la página; aquí se abre la sesión del navegador del sistema y, al volver, se lleva a /conectar/spotify con el
    // mismo `?code=…&state=…` que traía la redirección de la PWA (o `?error=…` si se cancela o se deniega).
    openAuth: async (url) => {
      const res = await WebBrowser.openAuthSessionAsync(url, spotifyRedirectUri())
      if (res.type === 'success') {
        const q = Linking.parse(res.url).queryParams ?? {}
        const pick = (k: string) => (typeof q[k] === 'string' ? (q[k] as string) : undefined)
        router.replace({ pathname: '/conectar/spotify', params: { code: pick('code'), state: pick('state'), error: pick('error') } })
      } else {
        router.replace({ pathname: '/conectar/spotify', params: { error: 'access_denied' } })
      }
    },
  })
}
