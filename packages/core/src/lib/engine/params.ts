/**
 * Parámetros ajustables del motor de recomendaciones y métricas.
 * Centraliza todos los números y umbrales (MOTOR.md §10).
 */

export const ENGINE_VERSION = 'm2.3-phases' // 15/11/2026: fases de reconocibilidad en los duelos (PLAN_DECIDIR M3); antes 'm2.2-novelty' (15/11/2026: la propuesta de Decidir descuenta lo que ya has visto (PLAN_DECIDIR M1); antes 'm2.1-quality' (M2) y 'm2.0-brain' (27/10/2026: cerebro y Decidir v2)

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

  /** Mínimo de votos bayesiano en Decidir v1 (m); la v2 usa percentiles */
  Q_PRIOR_VOTES: number

  /** Calidad de una obra sin nota (Decidir, M2): `Q_NOVOTE_BASE + Q_NOVOTE_FAME · fama` (fama 0-1), entre 0,25 y 0,75 */
  Q_NOVOTE_BASE: number
  Q_NOVOTE_FAME: number

  /** Peso de la previa en la utilidad de Decidir v2 (M2): la previa se tipifica en la bolsa (media 0, desviación 1) y se multiplica por esto */
  PRIOR_W: number

  /** Modo de Decidir: 'fixed' (5 duelos) o 'adaptive' */
  DECIDE_MODE: 'fixed' | 'adaptive'

  /** Umbrales y temperaturas del motor */
  TAU: number
  BETA: number
  ETA: number

  /** Limpieza de pendientes */
  CLEANUP_MIN: number
  CLEANUP_RECENT_D: number

  /** Reconocibilidad (R) y época (v2) */
  ERA_WINDOW: [number, number]
  ERA_MEDIAN_AGE: number
  R_W: {
    base: number
    era: number
    zona: [number, number]
    socialFriendRate: number
  }
  NOTORIETY_W: {
    vis: number
    local: number
    lista: number
    llm: number
  }

  /** Orientadores de Decidir (v2) */
  ORIENTER_R_PCT: number
  ORIENTER_MIN: number
  ORIENTER_K: number
  ORIENTER_ROTATION: {
    sessions: number
    decay: number
  }

  /** Boost por tendencia en el país */
  TREND_BOOST: number

  /** Decidir, «algo nuevo» (PLAN_DECIDIR M1): probabilidad de haberla visto si la conoce, por estantería */
  SEEN_GIVEN_KNOWN: Partial<Record<'movie' | 'series' | 'book' | 'boardgame' | 'artist' | 'song', number>>
  SEEN_GIVEN_KNOWN_DEFAULT: number
  /** Decidir M1: probabilidad mínima de haberla visto si la eligió en un duelo */
  SEEN_WINNER_FLOOR: number
  /** Decidir M1: peso del descuento ln(1 − 0,95·pVista) en la utilidad de la propuesta */
  NOVELTY_W: number

  /** Decidir M3: R mínima y nivel de fama máximo de los orientadores por fase (F1 → duelos 1-3; F2 → resto de la primera ronda; F3 → «Seguir buscando») */
  PHASE_F1_R: number
  PHASE_F2_R: number
  PHASE_F3_R: number
  PHASE_F2_MAX_TIER: number
  PHASE_F3_MAX_TIER: number
  /** Decidir M3: duelos con la fase F1 al empezar la sesión */
  PHASE_F1_DUELS: number
  /** Decidir M3: si el conjunto de la fase tiene menos obras disponibles que esto, se completa con las de mayor R del siguiente */
  PHASE_MIN_SET: number
  /** Recog M3: suelo del factor de época de una obra de nivel 1 (antes 0,95) */
  ERA_FLOOR_TIER1: number
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

  Q_NOVOTE_BASE: 0.25,
  Q_NOVOTE_FAME: 0.5,
  PRIOR_W: 0.15,

  DECIDE_MODE: 'fixed',

  TAU: 0.05,
  BETA: 1.5,
  ETA: 0.5,

  CLEANUP_MIN: 3,
  CLEANUP_RECENT_D: 60,

  ERA_WINDOW: [12, 25],
  ERA_MEDIAN_AGE: 25,
  R_W: {
    base: 1.0,
    era: 1.0,
    zona: [0.6, 0.4],
    socialFriendRate: 0.35,
  },
  NOTORIETY_W: {
    vis: 0.45,
    local: 0.15,
    lista: 0.15,
    llm: 0.25,
  },

  ORIENTER_R_PCT: 70,
  ORIENTER_MIN: 40,
  ORIENTER_K: 2,
  ORIENTER_ROTATION: {
    sessions: 3,
    decay: 0.5,
  },

  TREND_BOOST: 0.05,

  // PLAN_DECIDIR M1 (15/11/2026). Conocer una peli o una serie famosa casi siempre es haberla visto (o empezado); un
  // libro, la mitad de las veces (se conoce de oídas); un artista que conoces lo has escuchado. De partida 0,7 / 0,5 /
  // 0,3 / 0,5 / 0,9; series y libros subidos con el banco (240 usuarios): con 0,5 y 0,3 seguía proponiendo lo ya visto.
  SEEN_GIVEN_KNOWN: { movie: 0.7, series: 0.8, book: 0.5, boardgame: 0.5, artist: 0.9 },
  SEEN_GIVEN_KNOWN_DEFAULT: 0.5,
  // si la eligió en un duelo, casi seguro la conoce bien: con NOVELTY_W 2 eso le resta ≈ 3,3 (deja de ser la propuesta
  // salvo que destaque mucho)
  SEEN_WINNER_FLOOR: 0.85,
  // ajustado con el banco: 1 apenas bajaba «propuesta ya vista» en series; 2 sube el acierto entre lo no visto en las
  // cinco estanterías sin bajar la calidad media más de 4 puntos
  NOVELTY_W: 2,

  // PLAN_DECIDIR M3 (T17 §C.1-C.2). F1 (duelos 1-3): propias o nivel 1 con R ≥ 0,8. F2: + nivel ≤ 2 con R ≥ 0,65.
  // F3: + nivel 3 con R ≥ 0,55. Nunca nivel 4 (salvo propias). Con menos de 12 disponibles se completa con el siguiente.
  PHASE_F1_R: 0.8,
  PHASE_F2_R: 0.65,
  PHASE_F3_R: 0.55,
  PHASE_F2_MAX_TIER: 2,
  PHASE_F3_MAX_TIER: 3,
  PHASE_F1_DUELS: 3,
  PHASE_MIN_SET: 12,
  // nivel 1 fuera de la generación del usuario baja a 0,8·notoriedad (no a 0,95): queda por debajo del 0,8 de F1
  ERA_FLOOR_TIER1: 0.8,
}

/** Devuelve el valor o variante para pruebas A/B futuras */
export function variant<K extends keyof EngineParams>(key: K): EngineParams[K] {
  return PARAMS[key]
}
