import type { ReactNode } from 'react'
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import type { Item, ShelfType } from '@biblioteca/core'
import { getItem } from '@biblioteca/core'
import { AppText } from '../AppText'
import { Icon, type IconName } from '../Icon'
import { Press } from '../Press'
import { colors } from '../../theme'

// Piezas pequeñas del onboarding (screens/Onboarding.tsx de la PWA).

export const SHELF_ICONS: Record<ShelfType, IconName> = {
  movie: 'film',
  series: 'tv',
  book: 'bookOpen',
  boardgame: 'cards',
  artist: 'sparkle',
  song: 'disc',
}

/** Obras emblemáticas del catálogo para el tutorial (Onboarding.tsx:22). Se leen al pintar, no al cargar el módulo: el catálogo llega después. */
export function tutorialItems(): Item[] {
  return ['movie:el-padrino-1972', 'movie:pulp-fiction-1994', 'series:breaking-bad-2008', 'book:1984-1949']
    .map((id) => getItem(id))
    .filter(Boolean) as Item[]
}

/** Texto de título de paso: `serif text-[28px] leading-tight font-bold`. */
export function StepTitle({ size = 28, children }: { size?: number; children: string }) {
  return <AppText style={[styles.title, { fontSize: size, lineHeight: size * 1.25 }]}>{children}</AppText>
}

/** Botón de ancho completo del onboarding: `rounded-2xl`, `active:scale-[0.98]`. */
export function WideButton({
  label,
  onPress,
  minHeight = 48,
  tone = 'accent',
  bold = false,
  icon,
  style,
}: {
  label: string
  onPress: () => void
  minHeight?: number
  tone?: 'accent' | 'off'
  bold?: boolean
  icon?: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const on = tone === 'accent'
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      scaleTo={on ? 0.98 : undefined}
      onPress={onPress}
      style={[styles.wide, { minHeight }, on ? styles.wideOn : styles.wideOff, style]}
    >
      {icon}
      <AppText style={[styles.wideText, { fontFamily: bold ? 'Archivo-SemiBold' : 'Archivo-SemiBold', color: on ? colors.accentInk : colors.mute }]}>{label}</AppText>
    </Press>
  )
}

/** Logo de Google (colores oficiales), para cuando Google esté activo. */
export function GoogleLogo() {
  // Trazados del SVG de la PWA (Onboarding.tsx:563-568)
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </Svg>
  )
}

export function ShelfGlyph({ shelf, size, color }: { shelf: ShelfType; size: number; color: string }) {
  return <Icon name={SHELF_ICONS[shelf]} size={size} color={color} />
}

const styles = StyleSheet.create({
  title: { fontFamily: 'Archivo-Condensed-ExtraBold', textTransform: 'uppercase', color: colors.ink, textAlign: 'center' },
  wide: { width: '100%', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  wideOn: { backgroundColor: colors.accent },
  wideOff: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
  wideText: { fontSize: 14, lineHeight: 20, letterSpacing: 0 },
})
