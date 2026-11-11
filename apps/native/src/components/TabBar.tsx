import { Platform, StyleSheet, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from 'expo-router/js-tabs'
import { colors, alpha } from '../theme'
import { AppText } from './AppText'
import { Icon, type IconName } from './Icon'
import { Press } from './Press'

// TabBar.tsx:6-10 — las cinco pestañas, con sus iconos. El nombre de ruta es el del archivo en src/app/(tabs).
const ICONS: Record<string, IconName> = {
  index: 'library',
  descubrir: 'cards',
  decidir: 'sparkle',
  comparar: 'scale',
  perfil: 'user',
}

/**
 * Barra inferior (TabBar.tsx). D9: cristal con `expo-blur` en iOS y fondo opaco en Android. Pastilla del icono 48 x 28, icono
 * 22, etiqueta 10,5 medium; activa en acento. D19: tocar la pestaña activa lo avisa con `tabPress` (las pantallas suben al
 * principio con `useScrollToTop`). Etiquetas con tope de fuente 1,0 (D18).
 */
export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const Bg = Platform.OS === 'ios' ? (
    <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(30,27,23,0.78)' }]} />
    </BlurView>
  ) : (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(30,27,23,0.96)' }]} />
  )
  return (
    <View
      accessibilityRole="tablist"
      style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingBottom: insets.bottom, overflow: 'hidden', zIndex: 30 }}
    >
      {Bg}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingHorizontal: 4, paddingTop: 6, paddingBottom: 6 }}>
        {state.routes.map((route, i) => {
          const focused = state.index === i
          const label = descriptors[route.key].options.title ?? route.name
          const color = focused ? colors.accent : colors.mute
          const onPress = () => {
            const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
            if (!focused && !e.defaultPrevented) navigateToTab(route.key)
          }
          return (
            <View key={route.key} style={{ flex: 1 }}>
              <Press
                onPress={onPress}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
                style={{ minHeight: 48, alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}
              >
                <View style={{ width: 48, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? alpha(colors.accent, 0.15) : 'transparent' }}>
                  <Icon name={ICONS[route.name] ?? 'library'} size={22} color={color} />
                </View>
                <AppText fixed numberOfLines={1} style={{ fontFamily: 'Inter-500', fontSize: 10.5, color }}>
                  {label}
                </AppText>
              </Press>
            </View>
          )
        })}
      </View>
    </View>
  )
}
