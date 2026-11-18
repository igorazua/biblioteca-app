import { Modal, StyleSheet, View } from 'react-native'
import { AppText } from '../AppText'
import { Press } from '../Press'
import { colors } from '../../theme'

// Confirm de ui.tsx de la PWA: diálogo de confirmación. Se monta cuando hace falta y se quita al cerrar.
// La PWA lo pintaba con Portal dentro del marco; en nativo es un Modal. Atrás de Android cancela (D17).
export interface ConfirmProps {
  title: string
  text: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function Confirm({ title, text, confirmLabel, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Modal transparent animationType="none" visible onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.overlay}>
        <View accessibilityRole="alert" accessibilityLabel={title} style={styles.card}>
          <AppText style={styles.title}>{title}</AppText>
          <AppText style={styles.text}>{text}</AppText>
          <View style={styles.buttons}>
            <Press accessibilityRole="button" accessibilityLabel="Cancelar" onPress={onCancel} style={styles.cancel}>
              <AppText style={styles.cancelText}>Cancelar</AppText>
            </Press>
            <Press accessibilityRole="button" accessibilityLabel={confirmLabel} onPress={onConfirm} style={styles.confirm}>
              <AppText style={styles.confirmText}>{confirmLabel}</AppText>
            </Press>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  card: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 20,
  },
  title: { fontFamily: 'Archivo-SemiBold', fontSize: 18, lineHeight: 28, color: colors.ink },
  text: { fontFamily: 'Archivo-Regular', fontSize: 14, lineHeight: 20, color: colors.mute, marginTop: 6 },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 20 },
  cancel: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sin interlineado en la PWA: los botones heredan la fuente del body (16 px) con interlineado «normal» de Inter (~1,21).
  cancelText: { fontFamily: 'Archivo-Regular', fontSize: 16, lineHeight: 19.4, color: colors.ink },
  confirm: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: colors.stampRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { fontFamily: 'Archivo-SemiBold', fontSize: 16, lineHeight: 19.4, color: '#ffffff' },
})
