import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Grain } from '../components/Grain'
import { AppText } from '../components/AppText'
import { loadCore, loadShelves } from '../data/loadData'
import { FlightProvider } from '../lib/flight'
import { useHydrated } from '../store'
import { colors } from '../theme'

void SplashScreen.preventAutoHideAsync()

// Las fuentes estáticas de assets/fonts (tokens: `fontFiles`). Los `require` tienen que ser literales para Metro.
const FONTS = {
  'Fraunces72-400': require('../../assets/fonts/Fraunces72-400.ttf'),
  'Fraunces72-500': require('../../assets/fonts/Fraunces72-500.ttf'),
  'Fraunces72-600': require('../../assets/fonts/Fraunces72-600.ttf'),
  'Fraunces72-700': require('../../assets/fonts/Fraunces72-700.ttf'),
  'Fraunces144-800': require('../../assets/fonts/Fraunces144-800.ttf'),
  'Inter-400': require('../../assets/fonts/Inter-400.ttf'),
  'Inter-500': require('../../assets/fonts/Inter-500.ttf'),
  'Inter-600': require('../../assets/fonts/Inter-600.ttf'),
  'Inter-700': require('../../assets/fonts/Inter-700.ttf'),
  'Inter-900': require('../../assets/fonts/Inter-900.ttf'),
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONTS)
  const [data, setData] = useState<'loading' | 'ready' | Error>('loading')
  const hydrated = useHydrated() // stores leídos de AsyncStorage tras el catálogo: sin esto la biblioteca se pinta vacía un instante

  useEffect(() => {
    loadCore()
      .then(() => {
        setData('ready')
        void loadShelves('movie') // el detalle de las estanterías llega después, sin bloquear
      })
      .catch((e: unknown) => setData(e instanceof Error ? e : new Error(String(e))))
  }, [])

  const ready = (fontsLoaded || fontError) && data !== 'loading' && (hydrated || data instanceof Error)
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync()
  }, [ready])
  if (!ready) return null

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {data instanceof Error ? (
          <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
            <AppText style={{ color: colors.ink }}>No se han podido cargar los datos del catálogo.</AppText>
            <AppText style={{ color: colors.mute, marginTop: 8 }}>{data.message}</AppText>
          </View>
        ) : (
          <FlightProvider>
            {/* D16: el gesto de volver de iOS queda activo en la ficha (pantalla de la pila) */}
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, gestureEnabled: true }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="i/[id]" options={{ animation: 'fade' }} />
            </Stack>
          </FlightProvider>
        )}
        <Grain />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
