// @biblioteca/core — motores y lógica de la app, sin navegador, sin React y sin stores (D25).

export * from './types'
export * from './config'

// Datos y catálogo (la app carga los JSON y los entrega con los `set…`)
export * from './data/aliases'
export * from './data/catalog'
export * from './data/songs'
export * from './data/questions'

// Motor
export * from './lib/engine/anchors'
export * from './lib/engine/axes'
export * from './lib/engine/cleanup'
export * from './lib/engine/deck'
export * from './lib/engine/dimensions'
export * from './lib/engine/events'
export * from './lib/engine/features'
export * from './lib/engine/loadEngine'
export * from './lib/engine/metrics'
export * from './lib/engine/params'
export * from './lib/engine/ranker'
export * from './lib/engine/recog'
export * from './lib/engine/traits'
export * from './lib/engine/userSeeds'
export * from './lib/engine/userVec'

// Decidir: la v2 es la que usa la app. De la v1 solo se exponen los tipos y ayudas que la v2 comparte,
// y la v1 completa queda en el espacio `decideV1`.
export * from './lib/engine/decide2'
export {
  DOUBTFUL_STORAGE_KEY,
  PASSES_STORAGE_KEY,
  PASSES_FOR_DOUBTFUL,
  familyKey,
  sameFamily,
  passesFilters,
  type Answers,
  type DecideInput,
  type DecideProposal,
  type DuelPair,
} from './lib/engine/decide'
export * as decideV1 from './lib/engine/decide'

// Ranking, recomendación y utilidades
export * from './lib/ranking'
export * from './lib/rank'
export * from './lib/deck'
export * from './lib/recommend'
export * from './lib/affinity'
export * from './lib/nudges'
export * from './lib/compareOverview'
// `Question` ya existe en data/questions (las preguntas de Decidir): la del lector se expone como `ReaderQuestion`
export { MOTIVATIONS, QUESTIONS, scoreReader, topMotivations, bookFit, type Question as ReaderQuestion } from './lib/reader'
