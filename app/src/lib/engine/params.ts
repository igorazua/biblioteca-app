/**
 * Parámetros ajustables del motor de recomendaciones y métricas.
 * Centraliza todos los números y umbrales (MOTOR.md §10).
 */

export const ENGINE_VERSION = 'm1.1'

export type Bucket = 'seen_likely' | 'social' | 'friend_gem' | 'explore'

export interface EngineParams {
  ENGINE_VERSION: string

  /** Pesos de similitud híbrida entre ejes y embeddings */
  SIM_W: {
    axes: number
    embedding: number
  }

  /** Proporciones base de los cupos del mazo según obras vistas */
  BUCKET_BASE: {
    '<30': Record<Bucket, number>
    '30-150': Record<Bucket, number>
    '>150': Record<Bucket, number>
  }

  /** Rango de ajuste dinámico por tasa de acierto del cupo */
  BUCKET_ADAPT_CLAMP: [number, number]

  /** Vida media en días de la recencia social */
  RECENCY_HALF_LIFE_D: number

  /** Días tras descarte para volver a ser elegible si cumple condiciones */
  DISMISS_RETURN_D: number

  /** Reglas de diversidad en el intercalado del mazo */
  DIVERSITY: {
    sameCollectionMinCards: number
    maxConsecutiveMacro: number
    maxConsecutiveCreator: number
  }

  /** Mínimo de votos bayesiano en Decidir (m) */
  Q_PRIOR_VOTES: number

  /** Modo de Decidir: 'fixed' (5 duelos) o 'adaptive' */
  DECIDE_MODE: 'fixed' | 'adaptive'

  /** Umbrales y temperaturas del motor */
  TAU: number
  BETA: number
  ETA: number

  /** Limpieza de pendientes */
  CLEANUP_MIN: number
  CLEANUP_RECENT_D: number
}

export const PARAMS: EngineParams = {
  ENGINE_VERSION,

  SIM_W: {
    axes: 0.6,
    embedding: 0.4,
  },

  BUCKET_BASE: {
    '<30': {
      seen_likely: 0.7,
      social: 0.18,
      friend_gem: 0.06,
      explore: 0.06,
    },
    '30-150': {
      seen_likely: 0.55,
      social: 0.32,
      friend_gem: 0.07,
      explore: 0.06,
    },
    '>150': {
      seen_likely: 0.42,
      social: 0.45,
      friend_gem: 0.07,
      explore: 0.06,
    },
  },

  BUCKET_ADAPT_CLAMP: [0.6, 1.5],

  RECENCY_HALF_LIFE_D: 30,

  DISMISS_RETURN_D: 365,

  DIVERSITY: {
    sameCollectionMinCards: 6,
    maxConsecutiveMacro: 3,
    maxConsecutiveCreator: 2,
  },

  Q_PRIOR_VOTES: 200,

  DECIDE_MODE: 'fixed',

  TAU: 0.05,
  BETA: 1.5,
  ETA: 0.5,

  CLEANUP_MIN: 3,
  CLEANUP_RECENT_D: 60,
}

/** Devuelve el valor o variante para pruebas A/B futuras */
export function variant<K extends keyof EngineParams>(key: K): EngineParams[K] {
  return PARAMS[key]
}
