import { colors, fontFiles, shelfColors, text, type TextStyle as TokenText } from '@biblioteca/tokens'
import type { TextStyle } from 'react-native'

export { colors, shelfColors, fontFiles }

/** Estilo de texto de tokens → estilo de RN. Sin `fontWeight`: el peso va dentro de cada fuente estática (D15). */
export function tx(name: keyof typeof text, extra?: TextStyle): TextStyle {
  const t = text[name] as TokenText
  return {
    fontFamily: t.fontFamily,
    fontSize: t.fontSize,
    ...(t.lineHeight !== undefined ? { lineHeight: t.lineHeight } : null),
    ...(t.letterSpacing !== undefined ? { letterSpacing: t.letterSpacing } : null),
    ...(t.textTransform ? { textTransform: t.textTransform } : null),
    ...(t.color ? { color: t.color } : null),
    ...extra,
  }
}

/** Color con alfa a partir de #rrggbb. */
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}
