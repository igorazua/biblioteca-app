import type { ShelfType } from './types'

// Nombre provisional del producto (D17): cámbialo solo aquí.
export const APP_NAME = 'Biblioteca'

/** Estanterías que se ven en la app. Para quitar Canciones, ponla a false: no se carga nada de canciones. */
export const SHELF_ENABLED: Record<ShelfType, boolean> = {
  movie: true,
  series: true,
  book: true,
  artist: true,
  boardgame: true,
  song: false,
}

export const PLATFORMS = ['Netflix', 'Prime Video', 'HBO Max', 'Disney+', 'Movistar+', 'Filmin', 'Apple TV+'] as const

export const AVATAR_COLORS = ['#F5B544', '#E5707E', '#5B8DEF', '#6FCF97', '#B48CF2', '#F28FB8', '#56C2C9', '#F2994A']

// Asistente para elegir (D22: nombre provisional). Cámbialo solo aquí.
export const WIZARD_NAME = 'Decidir'
export const WIZARD_TITLE = '¿Te ayudo a elegir?'
export const WIZARD_PATH = '/decidir'
