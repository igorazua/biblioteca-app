import { Stack } from 'expo-router'
import { colors } from '../../../theme'

/**
 * Pila de ¡Duelos!: portada (`index`) y sesión (`[shelf]`). D16: el gesto de volver de iOS queda desactivado en la sesión,
 * que lleva el abanico. D17: atrás de Android sale de la sesión sin confirmar (cada duelo ya está guardado).
 */
export default function CompararLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[shelf]" options={{ gestureEnabled: false }} />
    </Stack>
  )
}
