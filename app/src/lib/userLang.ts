import { useStore } from '../store/useStore'

/**
 * Idioma del usuario (`profile.lang`, hoy 'es'), para elegir la versión local de cada obra.
 * Lectura puntual: sirve para helpers, motor y textos de imagen. Los componentes lo leen en cada render.
 */
export function userLang(): string {
  return useStore.getState().profile.lang || 'es'
}
