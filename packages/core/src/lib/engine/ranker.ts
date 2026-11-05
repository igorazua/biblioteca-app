/**
 * ranker.ts — Modelo que aprende a ordenar por regresión logística (MOTOR v2 §2c.4, TAREAS_MOTOR_V2 T11.2).
 *
 * Combina las señales del motor en una única puntuación calibrada:
 *   z = bias + Σ w_i · feature_i
 *   p = 1 / (1 + exp(-z))
 *
 * Señales evaluadas (MOTOR §2c.4):
 *   - cosUser: cos(u, vec) afinidad latente con el usuario
 *   - recog: reconocibilidad R calculada por Motor R
 *   - quality: calidad global bayesiana + notas de amigos
 *   - social: presencia y notas en perfiles de amigos
 *   - popPct: percentil de popularidad [0..1]
 *   - trend: factor de tendencia en el país
 *   - moodFit: encaje con el estado de ánimo seleccionado [0..1]
 *   - platformFit: 1 si está en alguna plataforma del usuario, 0 si no
 *   - novelty: 1 - popPct o factor de no-exploración
 */

export interface RankerFeatures {
  cosUser?: number
  recog?: number
  quality?: number
  social?: number
  popPct?: number
  trend?: number
  moodFit?: number
  platformFit?: number
  novelty?: number
}

export type EngineMode = 'deck' | 'decide' | 'recommend'

export interface RankerWeights {
  bias: number
  wCosUser: number
  wRecog: number
  wQuality: number
  wSocial: number
  wPopPct: number
  wTrend: number
  wMoodFit: number
  wPlatformFit: number
  wNovelty: number
}

// Pesos a mano de partida (MOTOR §2c.4 / T11.2) calibrados para cada motor
export const DEFAULT_RANKER_WEIGHTS: Record<EngineMode, RankerWeights> = {
  deck: {
    bias: -1.2,
    wCosUser: 2.2,
    wRecog: 1.8,
    wQuality: 1.5,
    wSocial: 1.2,
    wPopPct: 0.3,
    wTrend: 0.4,
    wMoodFit: 0.8,
    wPlatformFit: 0.5,
    wNovelty: 0.9,
  },
  decide: {
    bias: -0.8,
    wCosUser: 2.5,
    wRecog: 1.2,
    wQuality: 1.8,
    wSocial: 1.0,
    wPopPct: 0.2,
    wTrend: 0.6,
    wMoodFit: 1.6,
    wPlatformFit: 0.7,
    wNovelty: 0.4,
  },
  recommend: {
    bias: -1.0,
    wCosUser: 2.8,
    wRecog: 1.4,
    wQuality: 1.6,
    wSocial: 1.1,
    wPopPct: 0.4,
    wTrend: 0.5,
    wMoodFit: 1.0,
    wPlatformFit: 0.6,
    wNovelty: 0.7,
  },
}

function sigmoid(z: number): number {
  if (z > 15) return 1.0
  if (z < -15) return 0.0
  return 1 / (1 + Math.exp(-z))
}

/**
 * Puntuación del ranker [0, 1] combinando señales ponderadas
 */
export function scoreItem(
  features: RankerFeatures,
  mode: EngineMode = 'deck',
  customWeights?: Partial<RankerWeights>
): number {
  const w = { ...DEFAULT_RANKER_WEIGHTS[mode], ...(customWeights || {}) }

  const cosUser = features.cosUser ?? 0.5
  const recog = features.recog ?? 0.5
  const quality = features.quality ?? 0.65
  const social = features.social ?? 0.0
  const popPct = features.popPct ?? 0.5
  const trend = features.trend ?? 0.0
  const moodFit = features.moodFit ?? 0.5
  const platformFit = features.platformFit ?? 0.0
  const novelty = features.novelty ?? 0.5

  const z =
    w.bias +
    w.wCosUser * cosUser +
    w.wRecog * recog +
    w.wQuality * quality +
    w.wSocial * social +
    w.wPopPct * popPct +
    w.wTrend * trend +
    w.wMoodFit * moodFit +
    w.wPlatformFit * platformFit +
    w.wNovelty * novelty

  return sigmoid(z)
}
