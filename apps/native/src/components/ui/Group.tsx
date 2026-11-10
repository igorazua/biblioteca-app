import { Fragment, Children, type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { AppText } from '../AppText'
import { alpha, colors, tx } from '../../theme'

// Group de Group.tsx de la PWA: título pequeño, una tarjeta y filas separadas por líneas, estilo ajustes.
export interface GroupProps {
  title?: string
  /** Texto bajo la tarjeta. Solo texto: va dentro de AppText. */
  footer?: string
  /** Filas (normalmente `Row` o `Toggle` dentro de `Row`). Los nulos no cuentan para los separadores. */
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

export function Group({ title, footer, children, style }: GroupProps) {
  const rows = Children.toArray(children)
  return (
    <View style={style}>
      {title ? <AppText style={styles.title}>{title}</AppText> : null}
      <View style={styles.card}>
        {rows.map((child, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={styles.divider} /> : null}
            {child}
          </Fragment>
        ))}
      </View>
      {footer ? <AppText style={styles.footer}>{footer}</AppText> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  title: { ...tx('labelCaps', { color: colors.mute, paddingHorizontal: 4, marginBottom: 8 }) },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: alpha(colors.line, 0.6) },
  // leading-relaxed = 1,625 × 11
  footer: { fontFamily: 'Inter-400', fontSize: 11, lineHeight: 17.875, color: colors.mute, paddingHorizontal: 4, marginTop: 8 },
})
