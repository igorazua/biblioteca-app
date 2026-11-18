import { View } from 'react-native'
import { colors } from '../theme'
import { AppText } from './AppText'

/** `Tag variant="brand"` de ui.tsx: surface2, texto ink, 11 px medium, rounded-lg, borde line. */
export function Tag({ children }: { children: string }) {
  return (
    <View style={{ backgroundColor: colors.surface2, borderColor: colors.line, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2 }}>
      <AppText numberOfLines={1} style={{ fontFamily: 'Archivo-Regular', fontSize: 11, lineHeight: 17.9, letterSpacing: 0.275, color: colors.ink }}>
        {children}
      </AppText>
    </View>
  )
}
