import { useRef, type ComponentRef } from 'react'
import { View, useWindowDimensions } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getItem } from '@biblioteca/core'
import { AppText } from '../../components/AppText'
import { Icon } from '../../components/Icon'
import { Poster } from '../../components/Poster'
import { Press } from '../../components/Press'
import { detailHeroSize, useFlight } from '../../lib/flight'
import { titleOf } from '../../lib/item'
import { colors, tx } from '../../theme'

/**
 * Ficha mínima: póster y título. El póster llega volando desde la carta (D12): al medirse el hueco avisa a la capa de vuelo
 * del destino. Mientras el póster viaja, el de la ficha está oculto. Con reducir movimiento no hay vuelo: fundido.
 */
export default function Ficha() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const item = id ? getItem(id) : undefined
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const flight = useFlight()
  const slot = useRef<ComponentRef<typeof View>>(null)

  if (!item) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <AppText style={tx('meta')}>No encuentro esta obra.</AppText>
      </View>
    )
  }
  const { w, h } = detailHeroSize(item, width)
  const flying = flight.activeId === item.id

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: Math.max(insets.top, 12), paddingHorizontal: 20 }}>
      <Press onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -12 }}>
        <Icon name="back" size={20} color={colors.ink} />
      </Press>
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <View
          ref={slot}
          collapsable={false}
          onLayout={() => slot.current?.measureInWindow((x, y, pw, ph) => flight.land(item.id, [x, y, pw, ph]))}
          style={{ width: w, height: h, opacity: flying ? 0 : 1 }}
        >
          {flight.reduceMotion ? (
            <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1 }}>
              <Poster item={item} style={{ width: w, height: h, borderRadius: 10 }} />
            </Animated.View>
          ) : (
            <Poster item={item} style={{ width: w, height: h, borderRadius: 10 }} />
          )}
        </View>
      </View>
      <AppText style={[tx('title'), { color: colors.ink, marginTop: 24 }]}>{titleOf(item)}</AppText>
      <AppText style={[tx('meta'), { marginTop: 6 }]}>{[item.year, item.creator].filter(Boolean).join(' · ')}</AppText>
    </View>
  )
}
