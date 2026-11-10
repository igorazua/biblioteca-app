import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ENGINE_VERSION, type EngineEvent, type EventType, type ShelfType } from '@biblioteca/core'
import { jsonStorage } from '../lib/storage'
import { markHydrated } from './hydrationFlags'

export type { EngineEvent, EventType }

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
    (set) => ({
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
      storage: jsonStorage(),
      skipHydration: true, // la rehidratación la lanza `hydrateAll` cuando el catálogo ya está cargado
      partialize: (s) => ({ events: s.events }),
      onRehydrateStorage: () => () => markHydrated('events'),
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

  // Los eventos se guardan solo en local, con el mismo formato (D7).
  store.addEvent(event)
  // Fase 3: aquí se enviará el evento a Supabase en segundo plano (la PWA llamaba a `sendCloudEvent`).

  return event
}
