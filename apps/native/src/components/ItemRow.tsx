import { useRef, type ComponentRef } from 'react'
import { View } from 'react-native'
import Svg, { Text as SvgText } from 'react-native-svg'
import { router } from 'expo-router'
import type { Item } from '@biblioteca/core'
import { rankNum } from '@biblioteca/tokens'
import { posterAspect, titleOf } from '../lib/item'
import { useFlight } from '../lib/flight'
import { colors, tx } from '../theme'
import { AppText } from './AppText'
import { Poster } from './Poster'
import { Press } from './Press'

type Flight = ReturnType<typeof useFlight>

/**
 * Abre la ficha de una obra. Si el póster tiene su sitio medido (`node`), lanza el vuelo (D12) desde esa posición y
 * después navega; si no, navega sin vuelo. `radius` es el radio de la carta de origen.
 */
export function openItemFrom(node: ComponentRef<typeof View> | null, item: Item, flight: Flight, radius: number) {
  const go = () => router.push({ pathname: '/i/[id]', params: { id: item.id } })
  if (!node) return go()
  node.measureInWindow((x, y, w, h) => {
    flight.start(item, [x, y, w, h], radius)
    go()
  })
}

/**
 * Número de ranking hueco (D11): texto SVG con trazo de 1,5 pt y relleno transparente, Archivo condensada 800 (Taquilla).
 * La caja mide 86 x 0,8 de alto de línea; la línea base queda ~3 pt por encima del borde inferior, como en la web.
 */
export function RankNumber({ rank }: { rank: number }) {
  const size = 86
  const w = String(rank).length * size * 0.45 + 6 // cifras de Archivo condensada: ~0,43 em
  return (
    <Svg width={w} height={size} style={{ position: 'absolute', left: 0, bottom: 0 }} pointerEvents="none">
      <SvgText
        x={1}
        y={size - 3.3}
        fontFamily={rankNum.fontFamily}
        fontSize={size}
        fill="none"
        stroke={rankNum.strokeColor}
        strokeWidth={rankNum.strokeWidth}
      >
        {String(rank)}
      </SvgText>
    </Svg>
  )
}

/**
 * Portada en filas horizontales (PosterTile, ItemRow.tsx de la PWA). Con `rank`, el número hueco asoma por detrás a la
 * izquierda (34 pt de ancho si es de una cifra, 58 si son dos o más). `faded`: obras sin ordenar (opacidad 0,55).
 */
export function PosterTile({ item, size = 104, rank, faded }: { item?: Item | null; size?: number; rank?: number; faded?: boolean }) {
  const flight = useFlight()
  const posterRef = useRef<ComponentRef<typeof View>>(null)
  const numW = rank === undefined ? 0 : rank >= 10 ? 58 : 34

  if (!item) {
    return (
      <View style={{ width: size + numW, paddingLeft: numW, aspectRatio: 2 / 3 }}>
        <View style={{ flex: 1, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2 }} />
      </View>
    )
  }

  return (
    <Press
      scaleTo={0.97}
      onPress={() => openItemFrom(posterRef.current, item, flight, 10)}
      accessibilityRole="button"
      accessibilityLabel={`${rank ? `Nº ${rank}: ` : ''}${titleOf(item)}`}
    >
      <View style={{ width: size + numW, paddingLeft: numW }}>
        {rank !== undefined && <RankNumber rank={rank} />}
        <View ref={posterRef} collapsable={false} style={{ width: size, opacity: faded ? 0.55 : 1 }}>
          <Poster item={item} style={{ width: '100%', aspectRatio: posterAspect(item), borderRadius: 10 }} />
        </View>
      </View>
    </Press>
  )
}

interface RowProps {
  item: Item
  /** Puesto (1 = primero). Sin él, la fila no lleva número. */
  rank?: number
  /** Hueco de 24 pt donde iría el puesto (filas «nuevas» sin puesto, para alinear con las ordenadas). */
  indent?: boolean
  /** Línea de nota en acento, p. ej. «De Amigo». */
  note?: string
  /** Línea de metadatos en gris al final, p. ej. «nueva». */
  tail?: string
  highlight?: boolean
}

/** Fila de lista de Biblioteca y Estantería (ItemRow.tsx de la PWA): puesto, portada 36 pt y textos. */
export function ItemRow({ item, rank, indent, note, tail, highlight }: RowProps) {
  const flight = useFlight()
  const posterRef = useRef<ComponentRef<typeof View>>(null)
  return (
    <Press
      onPress={() => openItemFrom(posterRef.current, item, flight, 6)}
      accessibilityRole="button"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, minHeight: 56, width: '100%' }}
    >
      {rank !== undefined && (
        <AppText style={{ width: 24, textAlign: 'center', fontFamily: 'Archivo-SemiBold', fontSize: 12, lineHeight: 16, color: highlight ? colors.accent : colors.mute, fontVariant: ['tabular-nums'] }}>
          {rank}
        </AppText>
      )}
      {rank === undefined && indent && <View style={{ width: 24 }} />}
      <View ref={posterRef} collapsable={false} style={{ alignSelf: 'center' }}>
        <Poster item={item} style={{ width: 36, aspectRatio: posterAspect(item), borderRadius: 6 }} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText numberOfLines={1} style={[tx('item'), { color: colors.ink, lineHeight: 20 }]}>{titleOf(item)}</AppText>
        <AppText numberOfLines={1} style={[tx('meta'), { marginTop: 2 }]}>{[item.year, item.creator].filter(Boolean).join(' · ')}</AppText>
        {!!tail && <AppText numberOfLines={1} style={[tx('meta'), { marginTop: 2 }]}>{tail}</AppText>}
        {!!note && <AppText numberOfLines={1} style={[tx('label'), { color: colors.accent, marginTop: 2 }]}>{note}</AppText>}
      </View>
    </Press>
  )
}
