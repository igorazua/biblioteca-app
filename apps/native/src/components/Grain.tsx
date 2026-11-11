import { Image, StyleSheet, useWindowDimensions, View } from 'react-native'

const GRAIN = require('../../assets/grain.png')

/**
 * Grano de D10: PNG de 160 x 160 en mosaico al 5 %, encima de todo y sin capturar toques. Sin mix-blend (no existe en RN).
 * `Image` no admite `pointerEvents` en RN 0.88: si la capa fuera la imagen sola, se tragaría todos los toques de la app.
 * Por eso va dentro de un `View` con `pointerEvents: 'none'`.
 */
export function Grain() {
  const { width, height } = useWindowDimensions()
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Image source={GRAIN} resizeMode="repeat" style={{ width, height, opacity: 0.05 }} />
    </View>
  )
}
