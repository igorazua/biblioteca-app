import { useEffect, type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { PLATFORMS, type Item } from '@biblioteca/core'
import type { Option } from '@biblioteca/core'
import { colors, tx } from '../../theme'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { Poster } from '../Poster'
import { Press } from '../Press'
import { Button } from '../ui'

/** Aparición de framer-motion (`initial` → `animate`, con retraso): opacidad 0 → 1 y desplazamiento en y o x. */
export function Appear({ delay = 0, ms = 200, dy = 0, dx = 0, style, children }: { delay?: number; ms?: number; dy?: number; dx?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const k = useSharedValue(0)
  useEffect(() => {
    k.value = withDelay(delay, withTiming(1, { duration: ms, easing: Easing.bezier(0.25, 0.1, 0.35, 1) }))
  }, [k, delay, ms])
  const anim = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ translateY: (1 - k.value) * dy }, { translateX: (1 - k.value) * dx }] }))
  return <Animated.View style={[style, anim]}>{children}</Animated.View>
}

/** Degradado lineal que cubre la caja, del color `from` al `to` pasando por las paradas dadas (stops en 0-1). */
export function Fade({ dir, stops }: { dir: 'right' | 'up'; stops: [number, string, number][] }) {
  const id = dir === 'right' ? 'fr' : 'fu'
  // `up`: de abajo (opaco) a arriba (transparente). `right`: de izquierda (opaco) a derecha.
  const p = dir === 'right' ? { x1: '0', y1: '0', x2: '1', y2: '0' } : { x1: '0', y1: '1', x2: '0', y2: '0' }
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} {...p}>
          {stops.map(([o, c, a], i) => (
            <Stop key={i} offset={String(o)} stopColor={c} stopOpacity={a} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  )
}

const BG = '#1e1b17'

/** Tres portadas en rejilla de tres columnas con 1 pt de separación. */
function PosterStrip({ items, opacity }: { items: Item[]; opacity: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', gap: 1, opacity }]}>
      {items.map((it) => (
        <View key={it.id} style={{ flex: 1 }}>
          <Poster item={it} showTitle={false} noBlur style={StyleSheet.absoluteFill} />
        </View>
      ))}
    </View>
  )
}

/** Tarjeta de estantería de la primera fase de Decidir (WhatToWatch.tsx:562-581). */
export function ShelfCard({ title, sub, cover, index, onPress }: { title: string; sub: string; cover: Item[]; index: number; onPress: () => void }) {
  return (
    <Appear delay={index * 50} dy={12} style={{ flex: 1, minHeight: 110 }}>
      <Press
        onPress={onPress}
        scaleTo={0.985}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${sub}`}
        style={{ flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}
      >
        <PosterStrip items={cover} opacity={0.3} />
        <Fade dir="right" stops={[[0, BG, 1], [0.5, BG, 0.8], [1, BG, 0]]} />
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, justifyContent: 'center', paddingHorizontal: 20 }}>
          <AppText style={[tx('title'), { fontFamily: 'Inter-600', color: colors.ink }]}>{title}</AppText>
          <AppText style={[tx('meta'), { marginTop: 4 }]}>{sub}</AppText>
        </View>
        <View style={{ position: 'absolute', right: 16, bottom: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron" size={16} color={colors.ink} />
        </View>
      </Press>
    </Appear>
  )
}

/** Respuesta en tarjeta: título grande abajo y, si la opción lo pide, tres portadas de fondo (WhatToWatch.tsx:834-859). */
export function ChoiceCard({ option, posters, selected, delay, onPress }: { option: Option; posters: Item[]; selected: boolean; delay: number; onPress: () => void }) {
  return (
    <Appear delay={delay * 1000} dy={12} style={{ flex: 1, minHeight: 96 }}>
      <Press
        onPress={onPress}
        scaleTo={0.985}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={option.sub ? `${option.label}. ${option.sub}` : option.label}
        style={{ flex: 1, minHeight: 96, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: selected ? colors.accent : colors.line, backgroundColor: colors.surface }}
      >
        {posters.length > 0 && (
          <>
            <PosterStrip items={posters} opacity={0.35} />
            <Fade dir="up" stops={[[0, BG, 1], [0.5, BG, 0.75], [1, BG, 0.1]]} />
          </>
        )}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 }}>
          <AppText style={[tx('title'), { fontFamily: 'Fraunces72-600', color: colors.ink, lineHeight: 25.3 }]}>{option.label}</AppText>
          {!!option.sub && <AppText style={[tx('meta'), { marginTop: 4 }]}>{option.sub}</AppText>}
        </View>
      </Press>
    </Appear>
  )
}

/** Plataformas en tarjetas (varias a la vez). Sin ninguna o con todas marcadas, no se filtra (WhatToWatch.tsx:862-888). */
export function PlatformTiles({ value, onChange, onNext }: { value: string[]; onChange: (v: string[]) => void; onNext: () => void }) {
  const all = PLATFORMS.every((p) => value.includes(p))
  const tile = (label: string, active: boolean, onPress: () => void) => (
    <Press
      key={label}
      onPress={onPress}
      scaleTo={0.985}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      style={{
        width: '48.5%',
        flexGrow: 1,
        minHeight: 64,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        backgroundColor: active ? colors.surface2 : colors.surface,
        borderColor: active ? colors.accent : colors.line,
      }}
    >
      <AppText numberOfLines={1} style={[tx('body'), { fontFamily: 'Inter-500', flexShrink: 1, color: active ? colors.ink : 'rgba(244,239,230,0.8)' }]}>
        {label}
      </AppText>
      {active && <Icon name="check" size={16} color={colors.accent} strokeWidth={2.5} />}
    </Press>
  )
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {tile('Todas', all, () => onChange(all ? [] : [...PLATFORMS]))}
        {PLATFORMS.map((p) => tile(p, value.includes(p), () => onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p])))}
      </View>
      <AppText style={[tx('meta'), { marginTop: 12, marginBottom: 24 }]}>Sin ninguna o con todas marcadas, no filtramos por plataforma.</AppText>
      <Button variant="primary" onPress={onNext} style={{ marginTop: 'auto', alignSelf: 'stretch' }}>
        Seguir
      </Button>
    </View>
  )
}

/** Botón «Pasar» del duelo (WhatToWatch.tsx:691): ámbar con halo. */
export function PassButton({ onPress }: { onPress: () => void }) {
  const k = useSharedValue(0)
  useEffect(() => {
    k.value = withTiming(1, { duration: 220, easing: Easing.bezier(0.16, 1, 0.3, 1) })
  }, [k])
  const anim = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ translateY: (1 - k.value) * 8 }, { scale: 0.96 + 0.04 * k.value }] }))
  return (
    <Animated.View style={anim}>
      <Press
        onPress={onPress}
        scaleTo={0.95}
        accessibilityRole="button"
        accessibilityLabel="Pasar"
        style={{
          minHeight: 42,
          paddingHorizontal: 20,
          borderRadius: 999,
          backgroundColor: '#ffb340',
          borderWidth: 1,
          borderColor: 'rgba(255,179,64,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: 'rgb(255,150,40)',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 11,
          elevation: 6,
        }}
      >
        <AppText style={{ fontFamily: 'Inter-600', fontSize: 14, lineHeight: 20, color: '#1a1206' }}>Pasar</AppText>
      </Press>
    </Animated.View>
  )
}
