import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ENGINE_VERSION, type Bucket } from '../lib/engine/params'
import { sendCloudEvent } from '../lib/sync'
import { useAuth } from './useAuth'
import type { ShelfType } from '../types'

export type EventType =
  // Descubrir
  | 'deck_shown' // data: { pos, bucket: Bucket, score }
  | 'deck_swipe' // data: { pos, bucket, dir: 'left'|'right'|'up', ms }
  | 'deck_open' // abre la ficha desde la tarjeta
  | 'deck_session_end' // data: { cards, swipes }
  // Decidir
  | 'dec_start' // data: { answers }
  | 'dec_duel' // data: { a, b, winner, step, phase: 'coarse'|'fine', infoGain }
  | 'dec_propose' // itemId = propuesta; data: { round, score, reasons, candidates }
  | 'dec_accept' // itemId
  | 'dec_reject' // «Seguir buscando»; itemId
  | 'dec_abandon' // sale sin aceptar; data: { step }
  // Limpieza
  | 'clean_start'
  | 'clean_swipe' // data: { dir }
  | 'clean_end'
  // Importación
  | 'import_started' // data: { source }
  | 'import_done' // data: { source, total, sure, doubt, none }
  // Resultado a posteriori
  | 'entry_status' // data: { from, to, via: 'deck'|'decide'|'clean'|'add'|'other' }
  | 'entry_ranked' // data: { pos, total, pct }
  // Recordatorios
  | 'nudge_shown'
  | 'nudge_tap'
  | 'nudge_dismiss'

export interface EngineEvent {
  t: number // Date.now()
  v: string // ENGINE_VERSION
  sid: string // id de sesión de pantalla
  type: EventType
  shelf: ShelfType
  itemId?: string
  data?: Record<string, unknown>
}

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
