import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

import { useStore } from './useStore'

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

export async function checkHandleAvailability(handle: string, currentUserId?: string): Promise<{ available: boolean; error?: string }> {
  if (!supabase) return { available: false, error: 'No conectado' }
  const clean = handle.toLowerCase().trim()
  if (!/^[a-z0-9_.]{3,20}$/.test(clean)) {
    return { available: false, error: 'Debe tener entre 3 y 20 caracteres (letras, números, punto o guion bajo)' }
  }
  const { data, error } = await supabase
    .from('biblio_profiles')
    .select('id')
    .ilike('handle', clean)
    .maybeSingle()

  if (error) return { available: false, error: error.message }
  if (data && data.id !== currentUserId) {
    return { available: false, error: 'Este @usuario ya está en uso' }
  }
  return { available: true }
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
        fetchOrCreateProfile(user).then((profile) => {
          set({ profile, loading: false })
          // Sincronizar identidad nube -> local
          useStore.getState().setProfile({
            name: profile.displayName,
            country: profile.country,
            avatarUrl: profile.avatarUrl,
          })
        })
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
        useStore.getState().setProfile({
          name: profile.displayName,
          country: profile.country,
          avatarUrl: profile.avatarUrl,
        })
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
    try {
      const { error } = await supabase.functions.invoke('biblio-delete-account')
      if (error) throw error
    } catch (err: any) {
      console.warn('Fallo al invocar biblio-delete-account:', err)
      return { error: err }
    }
    await supabase.auth.signOut()
    set({ user: null, profile: null })
    useStore.getState().resetAll()
    return { error: null }
  },

  updateProfile: async (patch) => {
    if (!supabase) return
    const { user, profile } = get()
    if (!user || !profile) return
    const updated = { ...profile, ...patch }
    set({ profile: updated })

    // Sincronizar con el perfil local también
    useStore.getState().setProfile({
      name: updated.displayName,
      country: updated.country,
    })

    await supabase
      .from('biblio_profiles')
      .update({
        display_name: updated.displayName,
        handle: updated.handle ? updated.handle.toLowerCase().trim() : null,
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
