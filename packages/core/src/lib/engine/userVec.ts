/**
 * userVec.ts — Vector de usuario dinámico en el espacio único (MOTOR v2 §2c.4, TAREAS_MOTOR_V2 T11.1).
 *
 * u = normalizar( Σ peso(acción) · decay(t) · vec(obra) )
 *
 * Pesos por acción (MOTOR §2c.4):
 *   - Puesto en ranking: top 10% = +3.0; resto de vistas = +1.0 a +2.0 escalado por percentil
 *   - Pendiente: +0.5
 *   - Descartada: -0.5
 *   - Ganadora de duelo: +0.3
 *   - Perdedora de duelo: -0.15
 *   - Propuesta rechazada: -0.3
 *
 * Decaimiento temporal: vida media de 365 días (1 año).
 */

import type { ShelfType, UserEntry } from '../../types'
import { vecOf } from './features'

const HALF_LIFE_MS = 365 * 24 * 60 * 60 * 1000
const DIM = 48

export interface UserVecOptions {
  shelf: ShelfType
  entries: Record<string, UserEntry>
  ranking?: string[]
  duelHistory?: { winner: string; loser: string; at?: number }[]
  rejectedProposals?: { id: string; at?: number }[]
  now?: number
}

export function calcDecay(at: number, now: number): number {
  const ageMs = Math.max(0, now - at)
  return Math.pow(0.5, ageMs / HALF_LIFE_MS)
}

/**
 * Calcula el vector de usuario normalizado [48] para una estantería
 */
export function computeUserVector(options: UserVecOptions): Float32Array | null {
  const { shelf, entries, ranking = [], duelHistory = [], rejectedProposals = [], now = Date.now() } = options

  const sumVec = new Float32Array(DIM)
  let totalWeight = 0

  const rankingMap = new Map<string, number>()
  ranking.forEach((id, idx) => rankingMap.set(id, idx))
  const rankCount = ranking.length

  // 1. Entradas del usuario (vistas, pendientes, descartadas)
  for (const [id, entry] of Object.entries(entries)) {
    const v = vecOf(shelf, id)
    if (!v) continue

    const at = entry.updatedAt || entry.dismissedAt || now
    const decay = calcDecay(at, now)
    let w = 0

    if (entry.status === 'seen') {
      const pos = rankingMap.get(id)
      if (pos != null && rankCount > 0) {
        const top10Cutoff = Math.max(1, Math.floor(rankCount * 0.1))
        if (pos < top10Cutoff) {
          w = 3.0
        } else {
          const percentile = 1.0 - pos / rankCount
          w = 1.0 + percentile // 1.0 a 2.0
        }
      } else {
        w = 1.5
      }
    } else if (entry.status === 'pending') {
      w = 0.5
    } else if (entry.status === 'dismissed') {
      w = -0.5
    }

    if (w !== 0) {
      const effectiveW = w * decay
      for (let d = 0; d < DIM; d++) {
        sumVec[d] += (v[d] / 127) * effectiveW
      }
      totalWeight += Math.abs(effectiveW)
    }
  }

  // 2. Historial de duelos (+0.3 ganadora, -0.15 perdedora)
  for (const d of duelHistory) {
    const at = d.at || now
    const decay = calcDecay(at, now)

    const vWin = vecOf(shelf, d.winner)
    if (vWin) {
      const effW = 0.3 * decay
      for (let i = 0; i < DIM; i++) {
        sumVec[i] += (vWin[i] / 127) * effW
      }
      totalWeight += effW
    }

    const vLose = vecOf(shelf, d.loser)
    if (vLose) {
      const effW = -0.15 * decay
      for (let i = 0; i < DIM; i++) {
        sumVec[i] += (vLose[i] / 127) * effW
      }
      totalWeight += Math.abs(effW)
    }
  }

  // 3. Propuestas rechazadas con «Seguir buscando» (-0.3)
  for (const r of rejectedProposals) {
    const at = r.at || now
    const decay = calcDecay(at, now)
    const vRej = vecOf(shelf, r.id)
    if (vRej) {
      const effW = -0.3 * decay
      for (let i = 0; i < DIM; i++) {
        sumVec[i] += (vRej[i] / 127) * effW
      }
      totalWeight += Math.abs(effW)
    }
  }

  if (totalWeight === 0) return null

  // Normalizar a longitud unitaria
  let normSq = 0
  for (let d = 0; d < DIM; d++) normSq += sumVec[d] * sumVec[d]
  const norm = Math.sqrt(normSq)
  if (norm === 0) return null

  const u = new Float32Array(DIM)
  for (let d = 0; d < DIM; d++) {
    u[d] = sumVec[d] / norm
  }

  return u
}

/**
 * Similitud coseno entre vector de usuario y una obra en escala [0, 1]
 */
export function cosineWithUser(u: Float32Array | null, shelf: ShelfType, itemId: string): number {
  if (!u) return 0.5
  const v = vecOf(shelf, itemId)
  if (!v) return 0.5

  let dot = 0
  let normSq = 0
  for (let d = 0; d < DIM; d++) {
    const val = v[d] / 127
    dot += u[d] * val
    normSq += val * val
  }

  const norm = Math.sqrt(normSq) || 1
  const cos = dot / norm
  return Math.max(0, Math.min(1, (cos + 1) / 2))
}
