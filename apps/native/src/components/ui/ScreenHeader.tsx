import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { Press } from '../Press'
import { colors } from '../../theme'

// ScreenHeader de ui.tsx de la PWA: cabecera con volver opcional y acciones a la derecha.
// Distinta de ScreenTitle (la cabecera grande de cada pestaña): esta es la de las pantallas de la pila.
export interface ScreenHeaderProps {
  title: string
  onBack?: () => void
  right?: ReactNode
}

export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.row, { paddingTop: Math.max(insets.top, 12) }]}>
      {onBack ? (
        <Press accessibilityRole="button" accessibilityLabel="Volver" onPress={onBack} style={styles.back}>
          <Icon name="back" color={colors.ink} />
        </Press>
      ) : null}
      <AppText numberOfLines={1} style={[styles.title, onBack ? null : styles.titleNoBack]}>
        {title}
      </AppText>
      {right}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, minWidth: 0, fontFamily: 'Archivo-SemiBold', fontSize: 20, lineHeight: 28, color: colors.ink },
  titleNoBack: { paddingLeft: 8 },
})
