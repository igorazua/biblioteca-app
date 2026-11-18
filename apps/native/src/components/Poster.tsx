import { memo, useId, useState } from 'react'
import { Image as RNImage, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native'
import { Image } from 'expo-image'
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg'
import { typeName, type Item } from '@biblioteca/core'
import { posterOf, posterShape, titleOf } from '../lib/item'
import { colors } from '../theme'
import { AppText } from './AppText'

const GRAIN = require('../../assets/grain.png')

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Poster.tsx:16-25: paletas oscuras (fondo profundo, tono medio, claro)
const PALETTES: [string, string, string][] = [
  ['#0d1b2a', '#1b4965', '#5fa8d3'],
  ['#1a0b10', '#6d1a36', '#e07a5f'],
  ['#0b1a14', '#1f4d3a', '#8cc084'],
  ['#160f24', '#45306b', '#b392f0'],
  ['#1f1206', '#7a4210', '#f2a541'],
  ['#0a1416', '#16525a', '#7ad3c9'],
  ['#1c0a06', '#8c2f1b', '#f28c5e'],
  ['#101010', '#3a3a46', '#c9c3b6'],
]

export interface PosterProps {
  item?: Item | null
  style?: StyleProp<ViewStyle>
  showTitle?: boolean
  /** Dentro de un duelo se oculta el relleno difuminado de los juegos de mesa (`[&_.blur-xl]:hidden`). */
  noBlur?: boolean
  /** Sin fundido de entrada: la portada de la ficha queda bajo la capa del vuelo y debe estar ya pintada al retirarla. */
  instant?: boolean
}

/**
 * Portada: la real del catálogo o, si falta o falla, una generada (paleta del título, composición geométrica, viñeta y
 * grano, y el título en la serif). Los tamaños de la generada van en «cqw» de la PWA: 1 cqw = 1 % del ancho medido.
 * Mientras no hay imagen se ve el fondo `surface2` (el brillo de carga de la PWA no se porta).
 */
export const Poster = memo(function Poster({ item, style, showTitle = true, noBlur = false, instant = false }: PosterProps) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [failed, setFailed] = useState<string | null>(null)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((o) => (o.w === width && o.h === height ? o : { w: width, h: height }))
  }

  if (!item) {
    return <View style={[styles.base, styles.skeleton, style]} />
  }
  const src = posterOf(item)
  const title = titleOf(item)

  // Juegos de mesa: imagen entera y, sin forma conocida, el aire se rellena con ella misma ampliada y difuminada.
  if (src && failed !== src && item.type === 'boardgame') {
    const hasShape = item.posterRatio != null
    return (
      <View style={[styles.base, { backgroundColor: colors.surface2 }, style]}>
        {!hasShape && !noBlur && (
          <Image
            source={{ uri: src }}
            blurRadius={24}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={`${item.id}-bg`}
            style={[StyleSheet.absoluteFill, { opacity: 0.7, transform: [{ scale: 1.25 }] }]}
          />
        )}
        <Image
          source={{ uri: src }}
          accessibilityLabel={`Portada de ${title}`}
          contentFit="contain"
          transition={instant ? 0 : 280}
          cachePolicy="memory-disk"
          recyclingKey={item.id}
          onError={() => setFailed(src)}
          style={StyleSheet.absoluteFill}
        />
      </View>
    )
  }
  if (src && failed !== src) {
    return (
      <View style={[styles.base, { backgroundColor: colors.surface2 }, style]}>
        <Image
          source={{ uri: src }}
          accessibilityLabel={`Portada de ${title}`}
          contentFit="cover"
          transition={instant ? 0 : 280}
          cachePolicy="memory-disk"
          recyclingKey={item.id}
          onError={() => setFailed(src)}
          style={StyleSheet.absoluteFill}
        />
      </View>
    )
  }

  // ── Portada generada ──
  const h = hash(item.id)
  const [deep, mid, light] = PALETTES[h % PALETTES.length]
  const angle = 155 + ((h >> 5) % 50)
  const cx = 25 + ((h >> 9) % 50)
  const cy = 18 + ((h >> 13) % 30)
  const shape = (h >> 17) % 3 // 0 círculo, 1 arco, 2 franja
  const len = title.length
  const isSquare = posterShape(item.type) === 'square'
  const cqwTitle = isSquare
    ? len > 30 ? 8.5 : len > 18 ? 10.5 : len > 10 ? 12.5 : 15
    : len > 30 ? 9.5 : len > 18 ? 11.5 : len > 10 ? 13.5 : 16
  const { w, h: H } = size
  const q = w / 100 // 1 cqw en puntos
  const pad = (isSquare ? 6.5 : 8) * q
  const labelSize = (isSquare ? 4.2 : 4.6) * q

  // linear-gradient(angle) de CSS → línea del degradado dentro de la caja w × H
  const rad = (angle * Math.PI) / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  const L = Math.abs(w * dx) + Math.abs(H * dy)
  const gx1 = w / 2 - (dx * L) / 2
  const gy1 = H / 2 - (dy * L) / 2
  const gx2 = w / 2 + (dx * L) / 2
  const gy2 = H / 2 + (dy * L) / 2
  const bandY = ((cy + 8) / 100) * H

  return (
    <View accessibilityRole="image" accessibilityLabel={`Portada de ${title}`} onLayout={onLayout} style={[styles.base, { backgroundColor: deep }, style]}>
      {w > 0 && (
        <>
          <Svg width={w} height={H} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={`${uid}bg`} gradientUnits="userSpaceOnUse" x1={gx1} y1={gy1} x2={gx2} y2={gy2}>
                <Stop offset="0" stopColor={mid} />
                <Stop offset="0.72" stopColor={deep} />
                <Stop offset="1" stopColor={deep} />
              </LinearGradient>
              <RadialGradient id={`${uid}orb`} cx="0.35" cy="0.35" r="0.919" gradientUnits="objectBoundingBox">
                <Stop offset="0" stopColor={light} />
                <Stop offset="0.7" stopColor={mid} />
                <Stop offset="1" stopColor={mid} />
              </RadialGradient>
              <LinearGradient id={`${uid}band`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={light} stopOpacity="0" />
                <Stop offset="0.5" stopColor={light} stopOpacity="1" />
                <Stop offset="1" stopColor={light} stopOpacity="0" />
              </LinearGradient>
              <RadialGradient id={`${uid}glow`} cx={cx / 100} cy={cy / 100} rx="1.2" ry="0.9" gradientUnits="objectBoundingBox">
                <Stop offset="0" stopColor={light} stopOpacity="0.133" />
                <Stop offset="0.6" stopColor={light} stopOpacity="0" />
                <Stop offset="1" stopColor={light} stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id={`${uid}vig`} cx="0.5" cy="0.4" rx="1.2" ry="1" gradientUnits="objectBoundingBox">
                <Stop offset="0" stopColor="#000" stopOpacity="0" />
                <Stop offset="0.55" stopColor="#000" stopOpacity="0" />
                <Stop offset="1" stopColor="#000" stopOpacity="0.55" />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={w} height={H} fill={`url(#${uid}bg)`} />
            {shape === 0 && <Circle cx={cx * q} cy={(cy / 100) * H + 31 * q} r={31 * q} fill={`url(#${uid}orb)`} opacity={0.55} />}
            {shape === 1 && <Circle cx={cx * q} cy={((cy - 10) / 100) * H + 55 * q} r={55 * q - 0.8 * q} stroke={light} strokeWidth={1.6 * q} fill="none" opacity={0.35} />}
            {shape === 2 && (
              <Rect
                x={-0.2 * w}
                y={bandY}
                width={1.4 * w}
                height={0.22 * H}
                fill={`url(#${uid}band)`}
                opacity={0.32}
                rotation={-18 + ((h >> 3) % 36)}
                origin={`${0.5 * w}, ${bandY + 0.11 * H}`}
              />
            )}
            <Rect x={0} y={0} width={w} height={H} fill={`url(#${uid}glow)`} />
            <Rect x={0} y={0} width={w} height={H} fill={`url(#${uid}vig)`} />
          </Svg>
          <RNImage source={GRAIN} resizeMode="repeat" pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: w, height: H, opacity: 0.22 }} />
          {showTitle && (
            <View style={{ ...StyleSheet.absoluteFill as object, justifyContent: 'flex-end', padding: pad }}>
              <AppText fixed numberOfLines={1} style={{ fontFamily: 'Archivo-SemiBold', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontSize: labelSize, letterSpacing: 0.24 * labelSize }}>
                {typeName(item.type)}
              </AppText>
              <AppText fixed style={{ fontFamily: 'Archivo-SemiBold', color: '#fff', fontSize: cqwTitle * q, lineHeight: cqwTitle * q * 1.02, letterSpacing: -0.01 * cqwTitle * q, marginTop: 2.5 * q }}>
                {title}
              </AppText>
              <View style={{ marginTop: 3 * q, height: 1, width: 18 * q, backgroundColor: light, opacity: 0.8 }} />
              <AppText fixed numberOfLines={1} style={{ fontFamily: 'Archivo-Regular', color: 'rgba(255,255,255,0.65)', marginTop: 2.5 * q, fontSize: (isSquare ? 4.5 : 5) * q }}>
                {item.year} · {item.creator}
              </AppText>
            </View>
          )}
        </>
      )}
    </View>
  )
})

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  skeleton: { backgroundColor: colors.surface2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
})
