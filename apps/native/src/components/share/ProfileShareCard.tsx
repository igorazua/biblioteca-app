import { forwardRef, type ComponentRef } from 'react'
import { StyleSheet, View, type TextStyle } from 'react-native'
import { Image } from 'expo-image'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import type { Item } from '@biblioteca/core'
import { AppText } from '../AppText'
import { posterOf, titleOf } from '../../lib/item'

/**
 * Tarjeta para Story: `generateShareCard` de la PWA (lib/shareCard.ts), que dibujaba un canvas de 1080 × 1920, hecha con vistas.
 * Se maqueta con las MISMAS cotas que el canvas (1080 × 1920) multiplicadas por `S` y se captura con `react-native-view-shot`
 * a 1080 × 1920, así la imagen sale idéntica en cualquier móvil. Los colores son los literales del canvas (no la paleta D30):
 * es la imagen que se publica fuera de la app y debe parecerse a la que daba la PWA.
 *
 * Diferencias con el canvas, a propósito:
 *  - `system-ui` pasa a Inter y `Georgia` a Fraunces (las fuentes de la app).
 *  - El texto del canvas se colocaba por su línea base: aquí se coloca por su caja, con la línea base calculada (`base`).
 *  - La cursiva del pie es sintética hasta que exista Fraunces cursiva estática (B2).
 */
export const CARD_W = 1080
export const CARD_H = 1920
/** Escala de maquetación: la vista mide 360 × 640 pt y se captura a 1080 × 1920 px. */
const S = 1 / 3
const u = (n: number) => n * S

const INK = '#F4EFE6'
const MUTE = '#A39D92'
const BG_DEEP = '#100E0C'
const SURFACE = '#25221F'
const DIVIDER = 'rgba(244, 239, 230, 0.12)'
const ITEM_FILL = 'rgba(26, 24, 22, 0.7)'
const ITEM_STROKE = 'rgba(244, 239, 230, 0.08)'

/** Los dos últimos dígitos hex de `#rrggbb` + alfa, como en el canvas (`${accentColor}25`). */
const withAlpha = (hex: string, aa: string) => `${hex}${aa}`

export interface ShareCardProps {
  title: string
  subtitle?: string
  author: string
  items: Item[]
  accentColor?: string
  shareUrl?: string
  /** Se llama una vez por cada portada que ya ha cargado o ha fallado (hasta `posterCount(items)` veces). */
  onPosterSettled?: () => void
}

/** Cuántas portadas va a intentar cargar la tarjeta (las obras sin portada no cuentan). */
export const posterCount = (items: Item[]) => items.slice(0, 5).filter((it) => posterOf(it)).length

type FontName = 'Inter-400' | 'Inter-500' | 'Inter-600' | 'Inter-700' | 'Fraunces72-400' | 'Fraunces72-700'

/** Texto colocado por su línea base, en unidades del canvas. `base` = y de `fillText`. */
function T({ x, base, size, font, color, width, align = 'left', letterSpacing, style, children, lines = 1 }: {
  x: number
  base: number
  size: number
  font: FontName
  color: string
  width: number
  align?: TextStyle['textAlign']
  letterSpacing?: number
  style?: TextStyle
  children: string
  lines?: number
}) {
  const lh = size * 1.2
  return (
    <AppText
      fixed
      numberOfLines={lines}
      allowFontScaling={false}
      style={[
        {
          position: 'absolute',
          left: u(x),
          top: u(base - size * 0.95),
          width: u(width),
          fontFamily: font,
          fontSize: u(size),
          lineHeight: u(lh),
          color,
          textAlign: align,
          includeFontPadding: false,
          ...(letterSpacing ? { letterSpacing: u(letterSpacing) } : null),
        },
        style,
      ]}
    >
      {children}
    </AppText>
  )
}

export const ProfileShareCard = forwardRef<ComponentRef<typeof View>, ShareCardProps>(function ProfileShareCard(
  { title, subtitle = 'Lo que más me marcó', author, items, accentColor = '#F2B04A', shareUrl, onPosterSettled },
  ref,
) {
  const list = items.slice(0, 5)
  return (
    // collapsable={false}: Android no debe quitar esta vista del árbol, view-shot la necesita
    <View ref={ref} collapsable={false} style={styles.card}>
      {/* 1. Fondo cálido con degradado radial + resplandor del acento arriba a la izquierda */}
      <Svg width={u(CARD_W)} height={u(CARD_H)} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* canvas: createRadialGradient(540,400,100 → 540,960,1200). SVG no tiene radio de arranque: el foco hace de centro pequeño */}
          <RadialGradient id="bg" gradientUnits="userSpaceOnUse" cx="540" cy="960" r="1200" fx="540" fy="400">
            <Stop offset="0" stopColor="#1A1816" />
            <Stop offset="0.6" stopColor={BG_DEEP} />
            <Stop offset="1" stopColor="#0A0908" />
          </RadialGradient>
          <RadialGradient id="glow" gradientUnits="userSpaceOnUse" cx="200" cy="250" r="500">
            <Stop offset="0" stopColor={accentColor} stopOpacity={0x25 / 255} />
            <Stop offset="1" stopColor={accentColor} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={CARD_W} height={CARD_H} fill="url(#bg)" />
        <Rect x="0" y="0" width={CARD_W} height="800" fill="url(#glow)" />
      </Svg>

      {/* 2. Cabecera */}
      <View style={{ position: 'absolute', left: u(80), top: u(100), width: u(240), height: u(56), borderRadius: u(28), backgroundColor: withAlpha(accentColor, '33') }} />
      <T x={120} base={136} size={22} font="Inter-700" color={accentColor} width={200} letterSpacing={3}>
        BIBLIOTECA
      </T>
      <T x={80} base={220} size={32} font="Inter-500" color={MUTE} width={920}>
        {subtitle.toUpperCase()}
      </T>
      <T x={80} base={300} size={64} font="Fraunces72-700" color={INK} width={920}>
        {title}
      </T>
      <T x={80} base={360} size={36} font="Inter-600" color={accentColor} width={920}>
        {`por ${author}`}
      </T>
      <View style={{ position: 'absolute', left: u(80), top: u(409), width: u(920), height: u(2), backgroundColor: DIVIDER }} />

      {/* 3. Hasta 5 obras */}
      {list.map((it, i) => {
        const y = 460 + i * 230
        const poster = posterOf(it)
        const shown = titleOf(it)
        const meta = [it.creator, it.year].filter(Boolean).join(' · ')
        return (
          <View key={it.id} style={StyleSheet.absoluteFill} pointerEvents="none">
            <View
              style={{
                position: 'absolute',
                left: u(80),
                top: u(y),
                width: u(920),
                height: u(190),
                borderRadius: u(24),
                backgroundColor: ITEM_FILL,
                borderWidth: u(2),
                borderColor: ITEM_STROKE,
              }}
            />
            {/* número de ranking */}
            <View style={{ position: 'absolute', left: u(140 - 36), top: u(y + 95 - 36), width: u(72), height: u(72), borderRadius: u(36), backgroundColor: accentColor, alignItems: 'center', justifyContent: 'center' }}>
              <AppText fixed allowFontScaling={false} style={{ fontFamily: 'Inter-700', fontSize: u(36), lineHeight: u(36) * 1.2, color: BG_DEEP, includeFontPadding: false }}>
                {`${i + 1}`}
              </AppText>
            </View>
            {/* póster 100 × 150, esquinas 14 */}
            <View style={{ position: 'absolute', left: u(200), top: u(y + 20), width: u(100), height: u(150), borderRadius: u(14), overflow: 'hidden', backgroundColor: SURFACE }}>
              {poster ? (
                <Image
                  source={{ uri: poster }}
                  contentFit="cover"
                  transition={0}
                  cachePolicy="memory-disk"
                  style={StyleSheet.absoluteFill}
                  onLoad={onPosterSettled}
                  onError={onPosterSettled}
                />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <AppText fixed allowFontScaling={false} style={{ fontFamily: 'Inter-700', fontSize: u(32), lineHeight: u(32) * 1.2, color: MUTE, includeFontPadding: false }}>
                    {shown.slice(0, 1)}
                  </AppText>
                </View>
              )}
            </View>
            <T x={330} base={y + 80} size={38} font="Fraunces72-700" color={INK} width={650}>
              {shown.length > 28 ? `${shown.slice(0, 27)}…` : shown}
            </T>
            <T x={330} base={y + 125} size={28} font="Inter-400" color={MUTE} width={650}>
              {meta.length > 36 ? `${meta.slice(0, 35)}…` : meta}
            </T>
            {it.genres?.length ? (
              <T x={330} base={y + 160} size={22} font="Inter-500" color={withAlpha(accentColor, 'CC')} width={650}>
                {it.genres.slice(0, 3).join(' / ')}
              </T>
            ) : null}
          </View>
        )
      })}

      {/* 4. Pie */}
      <View style={{ position: 'absolute', left: u(80), top: u(1719), width: u(920), height: u(2), backgroundColor: DIVIDER }} />
      <T x={80} base={1780} size={30} font="Fraunces72-400" color={INK} width={920} style={{ fontStyle: 'italic' }}>
        «Todo lo que te ha formado, en tus estanterías»
      </T>
      {shareUrl ? (
        <T x={80} base={1830} size={26} font="Inter-500" color={accentColor} width={920}>
          {shareUrl.replace(/^https?:\/\//, '')}
        </T>
      ) : null}
    </View>
  )
})

const styles = StyleSheet.create({
  // Fuera de pantalla: se monta solo mientras se captura (lo hace `useShareStoryCard`)
  card: { width: u(CARD_W), height: u(CARD_H), backgroundColor: BG_DEEP, overflow: 'hidden' },
})
