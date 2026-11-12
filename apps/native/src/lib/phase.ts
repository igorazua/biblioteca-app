/**
 * Pantallas que ya existen en la app nativa. Mientras una esté a `false`, los botones y enlaces que llevan a ella no se
 * muestran (ni se sustituyen por un aviso): la pantalla que los contiene queda como en la PWA, pero sin esa salida.
 * Se cambia a `true` en la fase que construye cada una (docs/PLAN_NATIVO.md §7).
 */
export const BUILT = {
  onboarding: true,
  perfil: true,
  editarPerfil: true,
  ajustes: true,
  conectar: true,
  importar: true,
  metricas: true,
  listas: false,
} as const

/**
 * Inicios de sesión de terceros. Google y Apple necesitan un dev build (módulos nativos) y el bundle ID definitivo:
 * mientras estén a `false`, ninguna pantalla muestra su botón. El correo con código de 6 dígitos ya funciona en Expo Go.
 */
export const BUILT_AUTH = {
  google: false,
  apple: false,
} as const

/** `true` si la ruta lleva a una pantalla que ya existe (para recordatorios y enlaces que llegan del motor). */
export function isBuiltRoute(route: string): boolean {
  const path = route.split('?')[0]
  if (path.startsWith('/perfil/editar')) return BUILT.editarPerfil
  if (path.startsWith('/perfil')) return BUILT.perfil
  if (path.startsWith('/lista')) return BUILT.listas
  for (const k of ['importar', 'ajustes', 'conectar', 'metricas', 'onboarding'] as const) if (path.startsWith(`/${k}`)) return BUILT[k]
  return true
}

/** Texto del botón de un aviso: el de iniciar sesión dice «Entrar con Google» en core, y Google aún no está (BUILT_AUTH). */
export function nudgeActionLabel(n: { actionType: string; actionLabel: string }): string {
  return n.actionType === 'login' && !BUILT_AUTH.google ? 'Entrar con tu correo' : n.actionLabel
}
