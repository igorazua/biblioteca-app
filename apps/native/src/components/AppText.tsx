import { Text, type TextProps } from 'react-native'

/**
 * Texto de la app. D18: se respeta el tamaño de letra del sistema hasta 1,2×; con `fixed` (etiquetas de la barra y títulos
 * sobre pósteres) el tope es 1,0×. React 19 ignora `Text.defaultProps`, por eso es un componente propio.
 */
export function AppText({ fixed, maxFontSizeMultiplier, ...rest }: TextProps & { fixed?: boolean }) {
  return <Text maxFontSizeMultiplier={maxFontSizeMultiplier ?? (fixed ? 1 : 1.2)} {...rest} />
}
