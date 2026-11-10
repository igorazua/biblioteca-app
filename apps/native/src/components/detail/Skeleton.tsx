import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Press } from '../Press'
import { colors } from '../../theme'

/** Ficha mientras la obra no está en el catálogo (ItemDetail.tsx:65-76). Sin brillo de carga: bloques lisos. */
export function DetailSkeleton({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets()
  const block = { backgroundColor: colors.surface2 } as const
  return (
    <View style={{ flex: 1, padding: 16, paddingTop: 16 + Math.max(insets.top, 0), backgroundColor: colors.bg }}>
      <View style={{ paddingVertical: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Press onPress={onBack} accessibilityRole="button" accessibilityLabel="Volver" style={[{ width: 40, height: 40, borderRadius: 20 }, block]} />
      </View>
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
        <View style={[{ width: 112, height: 160, borderRadius: 16 }, block]} />
        <View style={{ flex: 1, paddingVertical: 8, gap: 12 }}>
          <View style={[{ height: 24, borderRadius: 4, width: '75%' }, block]} />
          <View style={[{ height: 16, borderRadius: 4, width: '50%' }, block]} />
        </View>
      </View>
      <View style={[{ height: 96, borderRadius: 16, marginBottom: 16 }, block]} />
    </View>
  )
}
