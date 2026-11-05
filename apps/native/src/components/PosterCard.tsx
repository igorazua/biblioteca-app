import { StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { SHELF_LABEL, type Item } from '@biblioteca/core'
import { posterAspect, posterOf, posterShape, titleOf } from '../lib/item'
import { colors, tx } from '../theme'
import { AppText } from './AppText'
import { Press } from './Press'

export interface PosterCardProps {
  item: Item
  subtitle?: string
  badge?: string
  onPress?: () => void
  showType?: boolean
  /** Si true, mantiene el hueco vertical 2:3 para no descuadrar la rejilla mixta */
  mixed?: boolean
}

function Badge({ text }: { text: string }) {
  return (
    <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(16,14,12,0.85)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
      <AppText style={{ fontFamily: 'Inter-500', fontSize: 11, color: colors.ink, fontVariant: ['tabular-nums'] }}>{text}</AppText>
    </View>
  )
}

/** PosterCard.tsx: portada con título y metadatos debajo (8 pt). Tres ramas: normal, cuadrada en rejilla mixta, juego con forma en rejilla mixta. */
export function PosterCard({ item, subtitle, badge, onPress, showType = false, mixed = false }: PosterCardProps) {
  const shelfLabel = SHELF_LABEL[item.type]?.singular || item.type
  const metaText = subtitle || [item.year, item.creator].filter(Boolean).join(' · ')
  const isSquareMixed = mixed && posterShape(item.type) === 'square'
  const shaped = item.type === 'boardgame' && item.posterRatio != null
  const src = posterOf(item)
  const title = titleOf(item)

  const placeholder = (pad: number, bg: string) => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: pad, backgroundColor: bg }}>
      <AppText style={[tx('meta'), { textAlign: 'center' }]}>{title}</AppText>
    </View>
  )

  return (
    <Press
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={title}
      style={shaped && !mixed ? { height: '100%', justifyContent: 'flex-end' } : undefined}
    >
      {isSquareMixed ? (
        <View style={{ aspectRatio: 2 / 3, width: '100%', borderRadius: 10, overflow: 'hidden', backgroundColor: colors.surface }}>
          <View style={{ width: '100%', aspectRatio: 1, overflow: 'hidden' }}>
            {src ? <Image source={{ uri: src }} contentFit="cover" cachePolicy="memory-disk" recyclingKey={item.id} style={StyleSheet.absoluteFill} /> : placeholder(8, colors.surface2)}
          </View>
          <View style={{ flex: 1, padding: 8, justifyContent: 'center', backgroundColor: colors.surface }}>
            {showType && <AppText numberOfLines={1} style={{ fontFamily: 'Inter-400', fontSize: 10, color: colors.mute, textTransform: 'uppercase', letterSpacing: 0.25 }}>{shelfLabel}</AppText>}
            <AppText numberOfLines={2} style={{ fontFamily: 'Fraunces72-600', fontSize: 12, lineHeight: 15, color: colors.ink }}>{title}</AppText>
            <AppText numberOfLines={1} style={{ fontFamily: 'Inter-400', fontSize: 11, color: colors.mute, marginTop: 2 }}>{item.creator}</AppText>
          </View>
          {badge && <Badge text={badge} />}
        </View>
      ) : shaped && mixed ? (
        <View style={{ aspectRatio: 2 / 3, width: '100%', borderRadius: 10, overflow: 'hidden', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          {src ? <Image source={{ uri: src }} contentFit="contain" cachePolicy="memory-disk" recyclingKey={item.id} style={StyleSheet.absoluteFill} /> : placeholder(12, colors.surface2)}
          {badge && <Badge text={badge} />}
        </View>
      ) : (
        <View style={{ aspectRatio: posterAspect(item), width: '100%', borderRadius: 10, overflow: 'hidden', backgroundColor: colors.surface }}>
          {src ? <Image source={{ uri: src }} contentFit={shaped ? 'contain' : 'cover'} cachePolicy="memory-disk" recyclingKey={item.id} style={StyleSheet.absoluteFill} /> : placeholder(12, colors.surface2)}
          {badge && <Badge text={badge} />}
        </View>
      )}
      {!isSquareMixed && (
        <View style={{ marginTop: 8 }}>
          {showType && <AppText style={[tx('label'), { marginBottom: 2 }]}>{shelfLabel}</AppText>}
          <AppText numberOfLines={2} style={[tx('item'), { color: colors.ink }]}>{title}</AppText>
          {!!metaText && <AppText numberOfLines={1} style={[tx('meta'), { marginTop: 2 }]}>{metaText}</AppText>}
        </View>
      )}
    </Press>
  )
}
