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
  conectar: false,
  importar: false,
  metricas: false,
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
