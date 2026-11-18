// Tokens de diseño de la app nativa, copiados de app/src/index.css (web-congelada-v1) y actualizados a Taquilla (docs/IDENTIDAD.md).
// Sin dependencias. Los nombres de la web se mantienen; los valores de texto van en puntos (pt).
// Regla de conversión: letterSpacing = em × fontSize (en pt); lineHeight = multiplicador × fontSize (en pt).
// Lo que no está en index.css no figura aquí.

// ── Colores ───────────────────────────────────────────────────────────────────────────────────────
// Equivalen a --color-* de @theme. `accent-ink` se escribe accentInk (no hay guiones en las claves).
export const colors = {
  // D30 (11/11/2026, revisado): más claros que la PWA (#100e0c, #1a1816, #25221f, #2c2824, #a39d92). En el móvil todo se
  // veía negro. Criterio de tema oscuro: fondo gris muy oscuro y cálido en vez de casi negro, cada nivel de superficie
  // ~5 % más claro que el anterior para que se lea la elevación, bordes visibles y texto secundario con contraste AA de sobra.
  bg: '#1e1b17',
  surface: '#2a2620',
  surface2: '#36312a',
  line: '#4a433b',
  // Taquilla (18/11/2026, docs/IDENTIDAD.md): rojo cartel como acento, tinta casi blanca; los fondos siguen en D30.
  ink: '#f4f3f1',
  mute: '#bdb6a9',
  accent: '#ff5a3c',
  accentInk: '#120f0a',
  secundario: '#d9714e',
  stampRed: '#ef4b4b',
  stampGreen: '#3ec878',
  stampBlue: '#4a8df0',
  // Lados del duelo (D33, Taquilla): cian a la izquierda y rojo a la derecha; la confirmación sigue en verde (#38c172).
  duelA: '#2ec4c8',
  duelB: '#ff5a3c',
  duelDone: '#38c172',
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
// Taquilla: una sola familia, Archivo (Google Fonts, OFL 1.1). En nativo cada peso/anchura es un archivo estático
// con su propio nombre: ver `fontFiles` y los `fontFamily` de `text`.
export const fonts = {
  sans: 'Archivo',
  display: 'Archivo Condensed',
} as const

/**
 * Nombre lógico de cada fuente estática → archivo en apps/native/assets/fonts/.
 * Se genera con packages/tokens/scripts/make-fonts.py a partir de `Archivo[wdth,wght].ttf` oficial.
 */
export const fontFiles = {
  'Archivo-Condensed-ExtraBold': 'Archivo-Condensed-ExtraBold.ttf', // wdth 62, wght 800: titulares, números de ranking, sellos (MAYÚSCULAS)
  'Archivo-Regular': 'Archivo-Regular.ttf', // wdth 100, wght 400: texto
  'Archivo-SemiBold': 'Archivo-SemiBold.ttf', // wdth 100, wght 600: botones, títulos de obra
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
  // text-display: Archivo condensada 800, MAYÚSCULAS, 36pt, lh 1, -0.01em (Taquilla)
  display: { fontFamily: 'Archivo-Condensed-ExtraBold', fontSize: 36, lineHeight: 36, fontWeight: 800, letterSpacing: -0.36, textTransform: 'uppercase' },
  // text-title: Archivo condensada 800, MAYÚSCULAS, 26pt, lh 1.05, -0.01em
  title: { fontFamily: 'Archivo-Condensed-ExtraBold', fontSize: 26, lineHeight: 27.3, fontWeight: 800, letterSpacing: -0.26, textTransform: 'uppercase' },
  // text-item: título de obra en listas y tarjetas: Archivo SemiBold normal, 16pt, lh 1.2
  item: { fontFamily: 'Archivo-SemiBold', fontSize: 16, lineHeight: 19.2, fontWeight: 600 },
  // text-body: Archivo Regular, 15px, lh 1.45, 400
  body: { fontFamily: 'Archivo-Regular', fontSize: 15, lineHeight: 21.75, fontWeight: 400 },
  // text-meta: Archivo Regular, 13px, lh 1.4, 400, color mute
  meta: { fontFamily: 'Archivo-Regular', fontSize: 13, lineHeight: 18.2, fontWeight: 400, color: colors.mute },
  // text-label: Archivo SemiBold, 11px, lh 1, 0.14em, mayúsculas, color mute
  label: { fontFamily: 'Archivo-SemiBold', fontSize: 11, lineHeight: 11, fontWeight: 600, letterSpacing: 1.54, textTransform: 'uppercase', color: colors.mute },
  // .label-caps: 11px, 600, 0.16em, mayúsculas, sin interlineado fijo.
  labelCaps: { fontFamily: 'Archivo-SemiBold', fontSize: 11, fontWeight: 600, letterSpacing: 1.76, textTransform: 'uppercase' },
} as const satisfies Record<string, TextStyle>

// ── .rank-num: número de ranking hueco ───────────────────────────────────────────────────────────
// No fija tamaño en la web (lo pone el componente). lineHeight 0.8 es multiplicador.
export const rankNum = {
  fontFamily: 'Archivo-Condensed-ExtraBold' as FontName,
  fontWeight: 800,
  lineHeightRatio: 0.8,
  widthAxis: 62, // wdth de la instancia condensada
  color: 'transparent',
  strokeColor: 'rgba(244, 243, 241, 0.55)', // ink de Taquilla con alfa 0,55
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
