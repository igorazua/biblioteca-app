import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ENGINE_VERSION, type Bucket, type EngineEvent, type EventType, type ShelfType } from '@biblioteca/core'
import { sendCloudEvent } from '../lib/sync'
import { useAuth } from './useAuth'

// Los tipos de los eventos del motor viven en @biblioteca/core (lib/engine/events.ts); se reexportan para las pantallas.
export type { EventType, EngineEvent }

interface EventsState {
  events: EngineEvent[]
  currentSid: string
  newSession: (prefix?: string) => string
  addEvent: (e: EngineEvent) => void
  clearEvents: () => void
}

const generateSid = (prefix = 's') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`

export const useEvents = create<EventsState>()(
  persist(
    (set, get) => ({
      events: [],
      currentSid: generateSid(),

      newSession: (prefix = 's') => {
        const sid = generateSid(prefix)
        set({ currentSid: sid })
        return sid
      },

      addEvent: (e) =>
        set((s) => ({
          // FIFO: conservar los últimos 5000 eventos
          events: s.events.length >= 5000 ? [...s.events.slice(-4999), e] : [...s.events, e],
        })),

      clearEvents: () => set({ events: [] }),
    }),
    {
      name: 'biblioteca-events-v1',
      partialize: (s) => ({ events: s.events }),
    }
  )
)

export interface TrackPayload {
  shelf?: ShelfType
  itemId?: string
  data?: Record<string, unknown>
  sid?: string
}

/**
 * Función central de tracking para registrar eventos del motor y métricas.
 * Lo llaman las pantallas y acciones, nunca los algoritmos puros.
 */
export function track(type: EventType, payload: TrackPayload = {}) {
  const store = useEvents.getState()
  const sid = payload.sid || store.currentSid
  const shelf = payload.shelf || 'movie'

  const event: EngineEvent = {
    t: Date.now(),
    v: ENGINE_VERSION,
    sid,
    type,
    shelf,
    itemId: payload.itemId,
    data: payload.data,
  }

  // 1. Guardar en store local
  store.addEvent(event)

  // 2. Enviar a Supabase si hay conexión en segundo plano
  const user = useAuth.getState().user
  sendCloudEvent({
    userId: user?.id,
    sid: event.sid,
    v: event.v,
    t: event.t,
    type: event.type,
    shelf: event.shelf,
    itemId: event.itemId,
    data: event.data,
  }).catch(() => {})

  return event
}
