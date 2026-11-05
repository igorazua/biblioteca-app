import { View } from 'react-native'
import Svg, { Text as SvgText } from 'react-native-svg'
import { router } from 'expo-router'
import type { Item } from '@biblioteca/core'
import { rankNum } from '@biblioteca/tokens'
import { posterAspect, titleOf } from '../lib/item'
import { colors, tx } from '../theme'
import { AppText } from './AppText'
import { Icon } from './Icon'
import { Poster } from './Poster'
import { Press } from './Press'

const openItem = (id: string) => router.push({ pathname: '/i/[id]', params: { id } })

/**
 * Número de ranking hueco (D11): texto SVG con trazo de 1,5 pt y relleno transparente, Fraunces opsz 144 peso 800.
 * La caja mide 86 x 0,8 de alto de línea; la línea base queda ~3 pt por encima del borde inferior, como en la web.
 */
export function RankNumber({ rank, skeleton }: { rank: number; skeleton?: boolean }) {
  const size = 86
  const w = String(rank).length * size * 0.62 + 6
  return (
    <Svg width={w} height={size} style={{ position: 'absolute', left: 0, bottom: 0 }} pointerEvents="none">
      <SvgText
        x={1}
        y={size - 3.3}
        fontFamily={rankNum.fontFamily}
        fontSize={size}
        fill={skeleton ? 'rgba(163,157,146,0.3)' : 'none'}
        stroke={skeleton ? 'none' : rankNum.strokeColor}
        strokeWidth={rankNum.strokeWidth}
      >
        {String(rank)}
      </SvgText>
    </Svg>
  )
}

/** Portada con su puesto (filas horizontales de la Biblioteca). Con `rank`, un número grande y hueco asoma por detrás a la izquierda. */
export function PosterTile({ item, size = 104, rank, faded }: { item?: Item | null; size?: number; rank?: number; faded?: boolean }) {
  const numW = rank === undefined ? 0 : rank >= 10 ? 58 : 34
  const inner = (
    <View style={{ width: size + numW, paddingLeft: numW }}>
      {rank !== undefined && <RankNumber rank={rank} skeleton={!item} />}
      <View style={{ opacity: faded ? 0.55 : 1 }}>
        <Poster item={item} style={{ width: '100%', aspectRatio: item ? posterAspect(item) : 2 / 3, borderRadius: 10 }} />
      </View>
    </View>
  )
  if (!item) return inner
  return (
    <Press scaleTo={0.97} onPress={() => openItem(item.id)} accessibilityLabel={`${rank ? `Nº ${rank}: ` : ''}${titleOf(item)}`}>
      {inner}
    </Press>
  )
}

interface RowProps {
  item?: Item | null
  rank?: number
  note?: string
  highlight?: boolean
  selecting?: boolean
  selected?: boolean
  onToggle?: () => void
}

export function ItemRow({ item, rank, note, highlight, selecting, selected, onToggle }: RowProps) {
  if (!item) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, minHeight: 56 }}>
        {rank !== undefined && <AppText style={{ width: 24, textAlign: 'center', fontFamily: 'Inter-500', fontSize: 12, color: 'rgba(163,157,146,0.4)' }}>{rank}</AppText>}
        <View style={{ width: 32, aspectRatio: 2 / 3, borderRadius: 6, backgroundColor: colors.surface2 }} />
        <View style={{ flex: 1, gap: 6, paddingVertical: 4 }}>
          <View style={{ height: 14, width: '75%', borderRadius: 4, backgroundColor: colors.surface2 }} />
          <View style={{ height: 12, width: '50%', borderRadius: 4, backgroundColor: colors.surface2 }} />
        </View>
      </View>
    )
  }
  return (
    <Press
      onPress={selecting ? onToggle : () => openItem(item.id)}
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityState={selecting ? { checked: !!selected } : undefined}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, minHeight: 56, width: '100%', backgroundColor: selected ? 'rgba(242,176,74,0.15)' : undefined }}
    >
      {selecting && (
        <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.accent : colors.surface, borderColor: selected ? colors.accent : colors.line }}>
          {selected && <Icon name="check" size={13} strokeWidth={3} color={colors.accentInk} />}
        </View>
      )}
      {rank !== undefined && !selecting && (
        <AppText style={{ width: 24, textAlign: 'center', fontFamily: 'Inter-600', fontSize: 12, lineHeight: 16, color: highlight ? colors.accent : colors.mute, fontVariant: ['tabular-nums'] }}>{rank}</AppText>
      )}
      <Poster item={item} style={{ width: 36, aspectRatio: posterAspect(item), borderRadius: 6, alignSelf: 'center' }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText numberOfLines={1} style={[tx('item'), { color: colors.ink, lineHeight: 20 }]}>{titleOf(item)}</AppText>
        <AppText numberOfLines={1} style={[tx('meta'), { marginTop: 2 }]}>{item.year} · {item.creator}</AppText>
        {!!note && <AppText numberOfLines={1} style={[tx('label'), { color: colors.accent, marginTop: 2 }]}>{note}</AppText>}
      </View>
    </Press>
  )
}
