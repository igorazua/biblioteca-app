import { userLang as langOf } from '@biblioteca/core/src/lib/userLang'
import { useStore } from '../store/useStore'

/**
 * Idioma del usuario (`profile.lang`, hoy 'es'), para elegir la versión local de cada obra.
 * Lectura puntual: sirve para helpers, motor y textos de imagen. Los componentes lo leen en cada render.
 * @biblioteca/core recibe el idioma como parámetro; aquí se le pasa el del perfil.
 */
export function userLang(): string {
  return langOf(useStore.getState().profile.lang)
}
