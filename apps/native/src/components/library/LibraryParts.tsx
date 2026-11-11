import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getItem, itemsOfType, type Item, type ShelfType } from '@biblioteca/core'
import { posterAspect } from '../../lib/item'
import { alpha, colors, shelfColors, tx } from '../../theme'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { Poster } from '../Poster'
import { SHELF_ICON } from './shelfMeta'

/** Cabecera de pantalla con una acción a la derecha (ScreenTitle.tsx sin acciones). px 20; arriba max(zona segura, 22). */
export function TitleBar({ label, title, subtitle, action }: { label: string; title: string; subtitle?: string; action?: ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: Math.max(insets.top, 22), paddingBottom: 24 }}>
      <View style={{ minHeight: 24, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
        <AppText style={tx('label')}>{label}</AppText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText style={[tx('display'), { color: colors.ink }]}>{title}</AppText>
          {!!subtitle && <AppText style={[tx('meta'), { marginTop: 6 }]}>{subtitle}</AppText>}
        </View>
        {action}
      </View>
    </View>
  )
}

/** Pila de hasta tres portadas giradas, para las estanterías vacías (Library.tsx:162-165). */
export function PosterPile({ shelf }: { shelf: ShelfType }) {
  const picks = itemsOfType(shelf).slice(0, 3)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
      {picks.map((it: Item, i: number) => (
        <View
          key={it.id}
          style={{
            width: 44,
            aspectRatio: posterAspect(it),
            marginLeft: i === 0 ? 0 : -20,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.line,
            overflow: 'hidden',
            transform: [{ rotate: `${(i - 1) * 7}deg` }],
          }}
        >
          <Poster item={it} showTitle={false} style={{ width: 44, height: 44 / posterAspect(it), borderRadius: 8 }} />
        </View>
      ))}
    </View>
  )
}

/**
 * Carrete de fotos inclinado de fondo (Shelf.tsx, FilmStrip). Alto fijo de 144 pt (perforaciones 8 + 8 + fotogramas 96 +
 * 8 + 8, más 8 de relleno arriba y abajo), para centrarlo con `translateY` en el 38 % de la cabecera.
 */
export function FilmStrip({ ids, shelf }: { ids: string[]; shelf: ShelfType }) {
  const found = ids.map((id) => getItem(id)).filter((it): it is Item => Boolean(it))
  const count = Math.max(10, found.length)
  const frames: (Item | null)[] = Array.from({ length: count }, (_, i) => found[i] ?? null)
  const perforations = (
    <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 8, overflow: 'hidden', height: 8 }}>
      {Array.from({ length: count * 3 }, (_, i) => (
        <View key={i} style={{ width: 10, height: 8, borderRadius: 2, backgroundColor: alpha(colors.bg, 0.8) }} />
      ))}
    </View>
  )
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: '-15%',
        right: '-15%',
        top: '38%',
        height: 144,
        transform: [{ translateY: -72 }, { rotate: '-6deg' }],
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingVertical: 8,
        gap: 8,
      }}
    >
      {perforations}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 8, alignItems: 'center', height: 96, overflow: 'hidden' }}>
        {frames.map((it, i) =>
          it ? (
            // la clave lleva el índice: una obra puede repetirse en el carrete; la opacidad va en un envoltorio porque
            // `Poster` es un componente animado y Reanimated avisa de que su `opacity` la pisa la animación de entrada
            <View key={`${it.id}-${i}`} style={{ opacity: 0.8 }}>
              <Poster item={it} showTitle={false} style={{ height: 96, aspectRatio: posterAspect(it), borderRadius: 4 }} />
            </View>
          ) : (
            <View
              key={'icono-' + i}
              style={{ height: 96, aspectRatio: 2 / 3, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(shelfColors[shelf], 0.15) }}
            >
              <Icon name={SHELF_ICON[shelf]} size={26} strokeWidth={1.8} color={shelfColors[shelf]} />
            </View>
          ),
        )}
      </View>
      {perforations}
    </View>
  )
}

/** Fondo de cabecera de estantería: degradado del color de la estantería (alfa 25 %) al fondo, más la capa de legibilidad. */
export function HeroBackdrop({ shelf }: { shelf: ShelfType }) {
  return (
    <>
      <LinearGradient colors={[alpha(shelfColors[shelf], 0.25), colors.bg]} locations={[0, 0.75]} start={{ x: 0.4, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <LinearGradient colors={[alpha(colors.bg, 0.3), alpha(colors.bg, 0.4), colors.bg]} style={StyleSheet.absoluteFill} pointerEvents="none" />
    </>
  )
}

/** Fila de tarjeta con borde redondeado en la primera y la última fila (la lista es una tarjeta con divisores). */
export function CardRow({ first, last, children }: { first: boolean; last: boolean; children: ReactNode }) {
  return (
    <View
      style={{
        marginHorizontal: 20,
        backgroundColor: colors.surface,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderTopWidth: 1,
        borderBottomWidth: last ? 1 : 0,
        borderColor: colors.line,
        borderTopLeftRadius: first ? 16 : 0,
        borderTopRightRadius: first ? 16 : 0,
        borderBottomLeftRadius: last ? 16 : 0,
        borderBottomRightRadius: last ? 16 : 0,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  )
}

/** Vacío de una estantería: texto y botones (Shelf.tsx, Empty). */
export function Empty({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <View style={{ paddingVertical: 56, alignItems: 'center', gap: 16, paddingHorizontal: 20 }}>
      <AppText style={[tx('body'), { color: colors.mute, textAlign: 'center', maxWidth: 240 }]}>{text}</AppText>
      {children}
    </View>
  )
}

