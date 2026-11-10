import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText } from '../AppText'
import { Icon, type IconName } from '../Icon'
import { Press } from '../Press'
import { alpha, colors } from '../../theme'

// Row de Group.tsx de la PWA: icono, título, subtítulo y a la derecha un control, un valor o un chevrón si pulsa.
// La PWA navegaba con `to` (react-router): en nativo se pasa `onPress` y la pantalla navega.
export interface RowProps {
  icon?: IconName
  /** Color del cuadradito del icono (Ajustes). Con `tint` el icono va en blanco. */
  tint?: string
  title: string
  sub?: string
  right?: ReactNode
  onPress?: () => void
  danger?: boolean
}

export function Row({ icon, tint, title, sub, right, onPress, danger = false }: RowProps) {
  const iconBg = danger ? alpha(colors.stampRed, 0.15) : tint ?? colors.surface2
  const iconColor = danger ? colors.stampRed : tint ? '#ffffff' : alpha(colors.ink, 0.8)

  const body = (
    <>
      {icon ? (
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Icon name={icon} size={18} color={iconColor} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText style={[styles.title, danger ? { color: colors.stampRed } : null]}>{title}</AppText>
        {sub ? <AppText style={styles.sub}>{sub}</AppText> : null}
      </View>
      {right}
      {onPress && !right ? <Icon name="chevron" size={16} color={colors.mute} /> : null}
    </>
  )

  if (onPress) {
    return (
      <Press accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={styles.row}>
        {body}
      </Press>
    )
  }
  return <View style={styles.row}>{body}</View>
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  title: { fontFamily: 'Inter-600', fontSize: 14, lineHeight: 20, color: colors.ink },
  sub: { fontFamily: 'Inter-400', fontSize: 12, lineHeight: 16.5, color: colors.mute, marginTop: 2 },
})
