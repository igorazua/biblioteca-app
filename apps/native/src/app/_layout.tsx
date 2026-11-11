import { useEffect, useState } from 'react'
import { AppState, View } from 'react-native'
import { Stack, usePathname, useRootNavigationState, useRouter } from 'expo-router'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Grain } from '../components/Grain'
import { AppText } from '../components/AppText'
import { loadCore, loadShelves } from '../data/loadData'
import { FlightProvider } from '../lib/flight'
import { useCloudBoot } from '../lib/sync'
import { Toast } from '../components/ui'
import { useHydrated, useStore } from '../store'
import { flushStorage } from '../lib/storage'
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

// App.tsx:42 de la PWA: sin onboarding hecho, todo lleva a /onboarding?next=… Las rutas públicas (/l, /p, /unete) quedan
// fuera, igual que en la PWA, donde están fuera del Frame.
const OUTSIDE_ONBOARDING = /^\/(onboarding|l\/|p\/|unete\/)/

function OnboardingGate() {
  const onboarded = useStore((s) => s.onboarded)
  const pathname = usePathname()
  const router = useRouter()
  const navReady = !!useRootNavigationState()?.key
  useEffect(() => {
    if (!navReady || onboarded || OUTSIDE_ONBOARDING.test(pathname)) return
    router.replace({ pathname: '/onboarding', params: { next: pathname } })
  }, [navReady, onboarded, pathname, router])
  return null
}

// Lo pendiente de guardar se escribe al pasar a segundo plano: el sistema puede cerrar la app sin avisar.
AppState.addEventListener('change', (st) => {
  if (st !== 'active') void flushStorage()
})

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONTS)
  const [data, setData] = useState<'loading' | 'ready' | Error>('loading')
  const hydrated = useHydrated() // stores leídos de AsyncStorage tras el catálogo: sin esto la biblioteca se pinta vacía un instante
  const { syncToast, clearSyncToast } = useCloudBoot(hydrated) // sesión de Supabase, subida/bajada de la nube y amigos reales (no hace nada sin cuenta)

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
            <OnboardingGate />
          </FlightProvider>
        )}
        {syncToast ? <Toast message={syncToast} onDone={clearSyncToast} /> : null}
        <Grain />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
