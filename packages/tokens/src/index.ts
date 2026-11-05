// Tokens de diseño de la app nativa, copiados de app/src/index.css (web-congelada-v1).
// Sin dependencias. Los nombres de la web se mantienen; los valores de texto van en puntos (pt).
// Regla de conversión: letterSpacing = em × fontSize (en pt); lineHeight = multiplicador × fontSize (en pt).
// Lo que no está en index.css no figura aquí.

// ── Colores ───────────────────────────────────────────────────────────────────────────────────────
// Equivalen a --color-* de @theme. `accent-ink` se escribe accentInk (no hay guiones en las claves).
export const colors = {
  bg: '#100e0c',
  surface: '#1a1816',
  surface2: '#25221f',
  line: '#2c2824',
  ink: '#f4efe6',
  mute: '#a39d92',
  accent: '#f2b04a',
  accentInk: '#100e0c',
  secundario: '#d9714e',
  stampRed: '#ef4b4b',
  stampGreen: '#3ec878',
  stampBlue: '#4a8df0',
} as const

// --color-shelf-* de @theme.
export const shelfColors = {
  movie: '#f2b04a',
  series: '#ff6b5b',
  book: '#e37d8c',
  artist: '#9d8cff',
  boardgame: '#4fd1a5',
  song: '#c084fc',
} as const

// ── Familias ──────────────────────────────────────────────────────────────────────────────────────
// Nombres de la web (--font-sans / --font-serif). En nativo cada peso es un archivo estático con su
// propio nombre: ver `fontFiles` y los `fontFamily` de `text`.
export const fonts = {
  sans: 'Inter Variable',
  serif: 'Fraunces Variable',
} as const

/**
 * Nombre lógico de cada fuente estática → archivo en apps/native/assets/fonts/.
 * Se genera con packages/tokens/scripts/make-fonts.py. El nombre lógico es el que usa `fontFamily`.
 */
export const fontFiles = {
  'Fraunces72-400': 'Fraunces72-400.ttf', // Fraunces, opsz 72, wght 400
  'Fraunces72-500': 'Fraunces72-500.ttf', // opsz 72, wght 500
  'Fraunces72-600': 'Fraunces72-600.ttf', // opsz 72, wght 600
  'Fraunces72-700': 'Fraunces72-700.ttf', // opsz 72, wght 700
  'Fraunces144-800': 'Fraunces144-800.ttf', // opsz 144, wght 800 (número de ranking)
  'Inter-400': 'Inter-400.ttf',
  'Inter-500': 'Inter-500.ttf',
  'Inter-600': 'Inter-600.ttf',
  'Inter-700': 'Inter-700.ttf',
  'Inter-900': 'Inter-900.ttf',
} as const

export type FontName = keyof typeof fontFiles

// ── Estilos de texto (text-* y .label-caps) ───────────────────────────────────────────────────────
export interface TextStyle {
  fontFamily: FontName
  fontSize: number // pt
  lineHeight?: number // pt; ausente si la web no fija interlineado
  fontWeight: 400 | 500 | 600 | 700 | 800 | 900
  letterSpacing?: number // pt (em × fontSize)
  textTransform?: 'uppercase'
  color?: string
}

export const text = {
  // text-display: Fraunces, 30px, lh 1.05, 500, -0.02em
  display: { fontFamily: 'Fraunces72-500', fontSize: 30, lineHeight: 31.5, fontWeight: 500, letterSpacing: -0.6 },
  // text-title: Fraunces, 22px, lh 1.15, 500, -0.015em
  title: { fontFamily: 'Fraunces72-500', fontSize: 22, lineHeight: 25.3, fontWeight: 500, letterSpacing: -0.33 },
  // text-item: Fraunces, 16px, lh 1.2, 500 (sin letter-spacing)
  item: { fontFamily: 'Fraunces72-500', fontSize: 16, lineHeight: 19.2, fontWeight: 500 },
  // text-body: Inter, 15px, lh 1.45, 400
  body: { fontFamily: 'Inter-400', fontSize: 15, lineHeight: 21.75, fontWeight: 400 },
  // text-meta: Inter, 13px, lh 1.4, 400, color mute
  meta: { fontFamily: 'Inter-400', fontSize: 13, lineHeight: 18.2, fontWeight: 400, color: colors.mute },
  // text-label: Inter, 11px, lh 1, 500, 0.14em, mayúsculas, color mute
  label: { fontFamily: 'Inter-500', fontSize: 11, lineHeight: 11, fontWeight: 500, letterSpacing: 1.54, textTransform: 'uppercase', color: colors.mute },
  // .label-caps: 11px, 600, 0.16em, mayúsculas. La web no fija familia ni interlineado: hereda el body
  // (Inter, interlineado normal), por eso se usa Inter-600 y sin lineHeight.
  labelCaps: { fontFamily: 'Inter-600', fontSize: 11, fontWeight: 600, letterSpacing: 1.76, textTransform: 'uppercase' },
} as const satisfies Record<string, TextStyle>

// ── .rank-num: número de ranking hueco ───────────────────────────────────────────────────────────
// No fija tamaño en la web (lo pone el componente). lineHeight 0.8 es multiplicador.
export const rankNum = {
  fontFamily: 'Fraunces144-800' as FontName,
  fontWeight: 800,
  lineHeightRatio: 0.8,
  opsz: 144,
  color: 'transparent',
  strokeColor: 'rgba(244, 241, 234, 0.55)', // rgb(244 241 234 / 0.55)
  strokeWidth: 1.5,
} as const

// ── .glass ────────────────────────────────────────────────────────────────────────────────────────
// backdrop-filter no existe en nativo: blur y saturate se guardan como valores para expo-blur o un fondo sólido.
export const glass = {
  background: 'rgba(15, 14, 13, 0.78)', // rgb(15 14 13 / 0.78)
  blur: 18,
  saturate: 1.4,
} as const

// ── Radios y espaciados que fija index.css ────────────────────────────────────────────────────────
// Solo los valores que aparecen en el CSS. Los radios y márgenes de cada componente están en docs/MEDIDAS_NATIVA.md.
export const radius = {
  frame: 38, // .frame (marco de escritorio)
  focus: 8, // :focus-visible
} as const

export const spacing = {
  safeTopMin: 12, // .safe-top: padding-top mínimo
  safeBottomMin: 0, // .safe-bottom: padding-bottom mínimo
} as const

export const tokens = {
  colors,
  shelfColors,
  fonts,
  fontFiles,
  text,
  rankNum,
  glass,
  radius,
  spacing,
} as const

export type Tokens = typeof tokens
