import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface BiblioProfile {
  id: string
  displayName: string
  handle: string | null
  avatarUrl: string | null
  country: string
}

interface AuthState {
  user: User | null
  profile: BiblioProfile | null
  loading: boolean
  error: string | null
  isConfigured: boolean

  init: () => () => void
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<{ error: Error | null }>
  updateProfile: (patch: Partial<BiblioProfile>) => Promise<void>
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,
  isConfigured: isSupabaseConfigured,

  init: () => {
    if (!supabase) {
      set({ loading: false })
      return () => {}
    }

    // 1. Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null
      set({ user })
      if (user) {
        fetchOrCreateProfile(user).then((profile) => set({ profile, loading: false }))
      } else {
        set({ loading: false })
      }
    })

    // 2. Suscribirse a cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null
      set({ user })
      if (user) {
        const profile = await fetchOrCreateProfile(user)
        set({ profile, loading: false })
      } else {
        set({ profile: null, loading: false })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  },

  signInWithGoogle: async () => {
    if (!supabase) return { error: new Error('Supabase no está configurado') }
    set({ error: null })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) set({ error: error.message })
    return { error }
  },

  signInWithOtp: async (email: string) => {
    if (!supabase) return { error: new Error('Supabase no está configurado') }
    set({ error: null })
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) set({ error: error.message })
    return { error }
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },

  deleteAccount: async () => {
    if (!supabase) return { error: new Error('No configurado') }
    const { user } = get()
    if (!user) return { error: null }
    // Elimina las entradas y el perfil de la base de datos
    const { error: err1 } = await supabase.from('biblio_entries').delete().eq('user_id', user.id)
    const { error: err2 } = await supabase.from('biblio_profiles').delete().eq('id', user.id)
    await supabase.auth.signOut()
    set({ user: null, profile: null })
    return { error: err1 || err2 }
  },

  updateProfile: async (patch) => {
    if (!supabase) return
    const { user, profile } = get()
    if (!user || !profile) return
    const updated = { ...profile, ...patch }
    set({ profile: updated })
    await supabase
      .from('biblio_profiles')
      .update({
        display_name: updated.displayName,
        handle: updated.handle,
        avatar_url: updated.avatarUrl,
        country: updated.country,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
  },
}))

async function fetchOrCreateProfile(user: User): Promise<BiblioProfile> {
  if (!supabase) {
    return {
      id: user.id,
      displayName: user.email?.split('@')[0] || 'Usuario',
      handle: null,
      avatarUrl: null,
      country: 'ES',
    }
  }

  const { data } = await supabase
    .from('biblio_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (data) {
    return {
      id: data.id,
      displayName: data.display_name,
      handle: data.handle,
      avatarUrl: data.avatar_url,
      country: data.country || 'ES',
    }
  }

  // Si no existe, lo creamos
  const meta = user.user_metadata || {}
  const displayName = meta.full_name || meta.name || user.email?.split('@')[0] || 'Amigo'
  const avatarUrl = meta.avatar_url || meta.picture || null

  const newProfile = {
    id: user.id,
    display_name: displayName,
    avatar_url: avatarUrl,
    country: 'ES',
  }

  await supabase.from('biblio_profiles').insert(newProfile)

  return {
    id: user.id,
    displayName,
    handle: null,
    avatarUrl,
    country: 'ES',
  }
}
