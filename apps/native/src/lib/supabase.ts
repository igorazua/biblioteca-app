import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Las variables EXPO_PUBLIC_* se sustituyen al empaquetar: hay que leerlas con el nombre literal.
// Sin `.env.local` (o sin alguna de las dos) no hay cliente y la app funciona sin cuenta, como la PWA sin Supabase.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (isSupabaseConfigured) {
  // supabase-js usa URL y URLSearchParams, que Hermes no trae completos. Se carga solo si hay cliente (y no en los tests de node).
  require('react-native-url-polyfill/auto')
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // en nativo no hay URL de vuelta: el código de 6 dígitos se escribe dentro de la app
      },
    })
  : null

let refreshWired = false

/**
 * Renueva la sesión solo con la app en primer plano (recomendación de supabase-js en React Native).
 * Se llama una vez al arrancar; devuelve la función que lo desmonta.
 */
export function wireAutoRefresh(): () => void {
  if (!supabase || refreshWired) return () => {}
  refreshWired = true
  // `react-native` se pide aquí y no arriba para que este módulo se pueda importar en los tests de node.
  const { AppState } = require('react-native') as typeof import('react-native')
  const apply = (state: string) => {
    if (state === 'active') void supabase.auth.startAutoRefresh()
    else void supabase.auth.stopAutoRefresh()
  }
  apply(AppState.currentState ?? 'active')
  const sub = AppState.addEventListener('change', apply)
  return () => {
    sub.remove()
    void supabase.auth.stopAutoRefresh()
    refreshWired = false
  }
}
