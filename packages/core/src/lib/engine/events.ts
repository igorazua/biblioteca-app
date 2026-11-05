/**
 * events.ts — Tipos de los eventos del motor (antes vivían en `store/useEvents.ts`; la app sigue guardándolos y enviándolos).
 * `metrics.ts` los lee para calcular las métricas del motor.
 */
import type { ShelfType } from '../../types'

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
  | 'connect_interest' // «Avísame» de un servicio próximo; data: { service }
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
