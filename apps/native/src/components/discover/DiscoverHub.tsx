import { useMemo } from 'react'
import { ScrollView, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ACTIVE_SHELVES, SHELF_LABEL, itemsOfType, type ShelfType } from '@biblioteca/core'
import type { UserEntry } from '@biblioteca/core'
import { AppText } from '../AppText'
import { Icon, type IconName } from '../Icon'
import { Poster } from '../Poster'
import { Press } from '../Press'
import { colors } from '../../theme'
import { useMyShelves } from '../../lib/myShelves'

export const SHELF_ICON: Record<ShelfType, IconName> = {
  movie: 'film',
  series: 'tv',
  song: 'music',
  book: 'bookOpen',
  boardgame: 'dice',
  artist: 'user',
}

/** Obras de la estantería sin entrada del usuario (Discover.tsx:354 y :325). */
export function remainingOf(shelf: ShelfType, entries: Record<string, UserEntry>): number {
  return itemsOfType(shelf).filter((i) => !entries[i.id]).length
}

/** Pantalla de categorías antes del mazo (D1, variante hub; Discover.tsx:334-417). */
export function DiscoverHub({ entries, catalogVersion, onPick }: { entries: Record<string, UserEntry>; catalogVersion: number; onPick: (s: ShelfType) => void }) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const myShelves = useMyShelves()
  const cardW = (width - 40 - 14) / 2 // grid-cols-2 gap-3.5
  const cards = useMemo(
    () =>
      myShelves.map((s) => {
        const items = itemsOfType(s)
        return { s, count: items.filter((i) => !entries[i.id]).length, top3: items.slice(0, 3) }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, catalogVersion, myShelves.join()],
  )
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: Math.max(insets.top, 12) }}
    >
      <View style={{ paddingTop: 12, paddingBottom: 12 }}>
        <AppText style={{ fontFamily: 'Archivo-SemiBold', fontSize: 11, lineHeight: 14, letterSpacing: 0.55, textTransform: 'uppercase', color: colors.accent }}>Explorar Catálogo</AppText>
        <AppText accessibilityRole="header" style={{ fontFamily: 'Archivo-SemiBold', fontSize: 24, lineHeight: 32, letterSpacing: -0.6, color: colors.ink }}>¿Qué te apetece hoy?</AppText>
      </View>
      <AppText style={{ fontFamily: 'Archivo-Regular', fontSize: 12, lineHeight: 19.5, color: colors.mute, marginBottom: 20 }}>
        Elige una estantería cultural para empezar una sesión de tarjetas y descubrir obras afines.
      </AppText>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {cards.map(({ s, count, top3 }) => (
          <Press
            key={s}
            onPress={() => onPick(s)}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={`${SHELF_LABEL[s].plural}, ${count} por ver`}
            style={{
              width: cardW,
              borderRadius: 24,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.line,
              padding: 16,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 1,
              shadowOffset: { width: 0, height: 1 },
              elevation: 1,
            }}
          >
            <View style={{ height: 80, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row' }}>
                {top3.map((it, i) => (
                  <View
                    key={it.id}
                    style={{
                      width: 48,
                      height: 64,
                      marginLeft: i ? -16 : 0,
                      transform: [{ rotate: `${(i - 1) * 8}deg` }],
                      borderRadius: 8,
                      backgroundColor: colors.surface2,
                      shadowColor: '#000',
                      shadowOpacity: 0.3,
                      shadowRadius: 3,
                      shadowOffset: { width: 0, height: 3 },
                      elevation: 3,
                    }}
                  >
                    <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
                      <Poster item={it} showTitle={false} style={{ flex: 1 }} />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Icon name={SHELF_ICON[s]} size={16} color={colors.accent} />
              <AppText numberOfLines={1} style={{ flexShrink: 1, fontFamily: 'Archivo-SemiBold', fontSize: 10, lineHeight: 12, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.accent }}>
                {SHELF_LABEL[s].singular}
              </AppText>
            </View>
            <AppText style={{ fontFamily: 'Archivo-SemiBold', fontSize: 16, lineHeight: 20, color: colors.ink }}>{SHELF_LABEL[s].plural}</AppText>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 8, rowGap: 2, marginTop: 12 }}>
              <AppText style={{ fontFamily: 'Archivo-Regular', fontSize: 12, lineHeight: 16, color: colors.mute, fontVariant: ['tabular-nums'] }}>{`${count} por ver`}</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppText style={{ fontFamily: 'Archivo-SemiBold', fontSize: 11, lineHeight: 16, color: colors.accent }}>Swipear</AppText>
                <Icon name="chevron" size={13} color={colors.accent} />
              </View>
            </View>
          </Press>
        ))}
      </View>
    </ScrollView>
  )
}
