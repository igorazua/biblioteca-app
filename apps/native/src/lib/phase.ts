/**
 * Pantallas que ya existen en la app nativa. Mientras una esté a `false`, los botones y enlaces que llevan a ella no se
 * muestran (ni se sustituyen por un aviso): la pantalla que los contiene queda como en la PWA, pero sin esa salida.
 * Se cambia a `true` en la fase que construye cada una (docs/PLAN_NATIVO.md §7).
 */
export const BUILT = {
  onboarding: false,
  perfil: false,
  editarPerfil: false,
  ajustes: false,
  conectar: false,
  importar: false,
  metricas: false,
  listas: false,
} as const
