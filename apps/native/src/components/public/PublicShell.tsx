import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { APP_NAME } from '@biblioteca/core'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { Press } from '../Press'
import { alpha, colors, tx } from '../../theme'

/** Altura reservada abajo para la barra fija (botón de 48 + relleno). Las listas la usan como `paddingBottom`. */
export const BOTTOM_BAR_SPACE = 128

/**
 * PublicShell de Public.tsx de la PWA: vista pública sin pestañas ni marco, para quien no tiene la app.
 * Columna de 480 como máximo, cabecera con la marca y «Abrir la app». El contenido ocupa el resto y se desplaza
 * por sí mismo (una `FlatList` o un `ScrollView` de la pantalla), así no hay listas anidadas.
 */
export function PublicShell({ children, bottomBar }: { children: ReactNode; bottomBar?: ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 20) }]}>
      <View style={styles.column}>
        <View style={styles.header}>
          <AppText style={tx('label', { color: colors.accent })}>{APP_NAME.toUpperCase()}</AppText>
          <Press accessibilityRole="link" accessibilityLabel="Abrir la app" onPress={() => router.replace('/')} hitSlop={8}>
            <AppText style={styles.open}>Abrir la app</AppText>
          </Press>
        </View>
        <View style={styles.body}>{children}</View>
      </View>
      {bottomBar ? (
        // Barra fija de la PWA: degradado de fondo (from-bg via-bg/95 to-transparent) y botón abajo.
        <LinearGradient
          colors={[alpha(colors.bg, 0), alpha(colors.bg, 0.95), colors.bg]}
          locations={[0, 0.35, 0.6]}
          style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}
          pointerEvents="box-none"
        >
          <View style={styles.bottomInner}>{bottomBar}</View>
        </LinearGradient>
      ) : null}
    </View>
  )
}

/** Estado «Este link no funciona» (Broken de Public.tsx). */
export function BrokenLink() {
  return (
    <PublicShell>
      <View style={styles.broken}>
        <View style={styles.brokenIcon}>
          <Icon name="link" size={24} color={colors.mute} />
        </View>
        <AppText style={[tx('title'), { color: colors.ink, textAlign: 'center' }]}>Este link no funciona</AppText>
        <AppText style={[tx('body'), { color: colors.mute, textAlign: 'center', maxWidth: 320 }]}>
          Puede que esté cortado o incompleto. Pide que te lo vuelvan a enviar.
        </AppText>
      </View>
    </PublicShell>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, minHeight: 24 },
  open: { fontFamily: 'Archivo-Regular', fontSize: 12, lineHeight: 16.5, color: colors.mute, textDecorationLine: 'underline' },
  body: { flex: 1 },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  bottomInner: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  broken: { paddingVertical: 96, alignItems: 'center', gap: 12 },
  brokenIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
