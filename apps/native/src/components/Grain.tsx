import { Image, StyleSheet, useWindowDimensions } from 'react-native'

const GRAIN = require('../../assets/grain.png')

/**
 * Grano de D10: PNG de 160 x 160 en mosaico al 5 %, encima de todo y sin capturar toques. Sin mix-blend (no existe en RN).
 */
export function Grain() {
  const { width, height } = useWindowDimensions()
  return <Image source={GRAIN} resizeMode="repeat" pointerEvents="none" style={[StyleSheet.absoluteFill, { width, height, opacity: 0.05 }]} />
}
