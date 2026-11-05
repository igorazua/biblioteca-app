import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, tx } from '../theme'
import { AppText } from './AppText'

/**
 * Cabecera de pantalla reducida (ScreenTitle.tsx): etiqueta y título. Sin contador, progreso ni acciones: esas partes se
 * portan con las pantallas reales. px 20; arriba max(zona segura, 22); abajo 24.
 */
export function ScreenTitle({ label, title, subtitle }: { label?: string; title: string; subtitle?: string }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: Math.max(insets.top, 22), paddingBottom: 24 }}>
      <View style={{ minHeight: 24, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
        {!!label && <AppText style={tx('label')}>{label}</AppText>}
      </View>
      <AppText style={[tx('display'), { color: colors.ink }]}>{title}</AppText>
      {!!subtitle && <AppText style={[tx('meta'), { marginTop: 6 }]}>{subtitle}</AppText>}
    </View>
  )
}
