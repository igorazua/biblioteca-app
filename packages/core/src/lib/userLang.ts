/**
 * Idioma del usuario (`profile.lang`, hoy 'es'), para elegir la versión local de cada obra.
 * Función pura: quien la llama pasa el idioma del perfil (p. ej. useStore.getState().profile.lang).
 */
export function userLang(profileLang?: string | null): string {
  return profileLang || 'es'
}
