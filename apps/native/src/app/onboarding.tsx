import { useCallback, useEffect, useState } from 'react'
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { ACTIVE_SHELVES, type ShelfType } from '@biblioteca/core'
import { AppText } from '../components/AppText'
import { Icon } from '../components/Icon'
import { Press } from '../components/Press'
import { LoginSheet } from '../components/auth/LoginSheet'
import { StepDuel, StepFriends, StepGestures, StepShelves, StepStart, StepWelcome } from '../components/onboarding/Steps'
import { tutorialItems } from '../components/onboarding/parts'
import { useCatalogTick } from '../components/library/shelfMeta'
import { useAuth } from '../store/useAuth'
import { useStore } from '../store'
import { alpha, colors } from '../theme'

const STEPS = [0, 1, 2, 3, 4, 5]
const EASE = Easing.bezier(0.23, 1, 0.32, 1) // curva de la transición entre pasos (Onboarding.tsx:177)
const MS = 220

/**
 * Onboarding (screens/Onboarding.tsx). Seis pasos: bienvenida, tres gestos, duelo, amigos, cuenta y estanterías.
 * Llega con `?next=…` desde la redirección del _layout (App.tsx:42) y al terminar vuelve a esa ruta (o a /descubrir).
 */
export default function Onboarding() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduce = useReducedMotion()
  const { next } = useLocalSearchParams<{ next?: string }>()
  const complete = useStore((s) => s.completeOnboarding)
  const isConfigured = useAuth((s) => s.isConfigured)
  useCatalogTick() // las obras del tutorial salen del catálogo, que puede terminar de cargar justo después

  const items = tutorialItems()
  const [step, setStep] = useState(0)
  const [shown, setShown] = useState(0) // el paso que se ve (cambia cuando termina la salida del anterior)
  const [selectedShelves, setSelectedShelves] = useState<ShelfType[]>([...ACTIVE_SHELVES])
  const [login, setLogin] = useState(false)
  // Lo que se ha probado en los pasos 1 y 2 vive aquí para que no se pierda al volver atrás (Onboarding.tsx:68, 94)
  const [tried, setTried] = useState({ left: false, right: false, up: false })
  const [winner, setWinner] = useState<'a' | 'b' | null>(null)

  // Transición: sale el paso anterior (opacidad 1 → 0, y 0 → -14) y entra el nuevo (0 → 1, y 14 → 0), 220 ms cada una (mode="wait").
  const p = useSharedValue(1)
  const entering = useSharedValue(false)
  useEffect(() => {
    if (step === shown) return
    if (reduce) {
      setShown(step)
      return
    }
    entering.value = false
    p.value = withTiming(0, { duration: MS, easing: EASE }, (fin) => {
      'worklet'
      if (fin) scheduleOnRN(setShown, step)
    })
  }, [step, shown, reduce, p, entering])
  useEffect(() => {
    if (reduce) return
    entering.value = true
    p.value = 0
    p.value = withTiming(1, { duration: MS, easing: EASE })
  }, [shown, reduce, p, entering])
  const stepStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: entering.value ? (1 - p.value) * 14 : (p.value - 1) * 14 }],
  }))

  // Atrás de Android: al paso anterior; en el primero, sale como cualquier pantalla.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (login) return false
      if (step > 0) {
        setStep((s) => s - 1)
        return true
      }
      return false
    })
    return () => sub.remove()
  }, [step, login])

  const finish = useCallback(
    (patch: Parameters<typeof complete>[0] = {}, redirect?: string) => {
      complete(patch)
      const target = redirect || (typeof next === 'string' && next !== '/' && next.startsWith('/') && !next.startsWith('/onboarding') ? next : '/descubrir')
      router.replace(target as never)
    },
    [complete, next, router],
  )

  const toggleShelf = (s: ShelfType) =>
    setSelectedShelves((cur) => (cur.includes(s) ? (cur.length > 1 ? cur.filter((x) => x !== s) : cur) : [...cur, s]))

  // Sesión iniciada desde el paso de cuenta: la PWA lo resuelve con el efecto de App.tsx:123-131 (nombre y foto del usuario).
  const onLoggedIn = () => {
    // Si ya había onboarding hecho (tutorial reabierto desde Ajustes), no se pisa el nombre ni la foto que ya tiene.
    if (useStore.getState().onboarded) return finish()
    const user = useAuth.getState().user
    finish({
      name: (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || 'Tú',
      avatarUrl: (user?.user_metadata?.avatar_url as string | undefined) || null,
    })
  }

  return (
    <View style={styles.root}>
      {/* No se vuelve atrás desde aquí con el gesto de iOS: el onboarding es el principio de la pila */}
      <Stack.Screen options={{ gestureEnabled: false, animation: 'fade' }} />
      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, 12), paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera común */}
        <View style={styles.bar}>
          {step > 0 ? (
            <Press accessibilityRole="button" accessibilityLabel="Atrás" onPress={() => setStep(step - 1)} style={styles.back}>
              <Icon name="back" size={16} color={colors.mute} />
              <AppText style={styles.barText}>Atrás</AppText>
            </Press>
          ) : (
            <View style={{ width: 48 }} />
          )}

          <View style={styles.dots} accessibilityLabel={`Paso ${step + 1} de 6`}>
            {STEPS.map((i) => (
              <View
                key={i}
                style={[styles.dot, i === step ? styles.dotOn : i < step ? styles.dotDone : styles.dotOff]}
              />
            ))}
          </View>

          <Press accessibilityRole="button" accessibilityLabel="Saltar" onPress={() => finish()} style={styles.skip}>
            <AppText style={styles.barText}>Saltar</AppText>
          </Press>
        </View>

        {/* Contenedor central */}
        <View style={styles.center}>
          <Animated.View style={[styles.stepBox, stepStyle]}>
            {shown === 0 && <StepWelcome items={items} onNext={() => setStep(1)} />}
            {shown === 1 && <StepGestures items={items} tried={tried} onTry={(d) => setTried((t) => ({ ...t, [d]: true }))} onNext={() => setStep(2)} />}
            {shown === 2 && <StepDuel items={items} winner={winner} onWinner={setWinner} onNext={() => setStep(3)} />}
            {shown === 3 && <StepFriends items={items} onNext={() => setStep(4)} />}
            {shown === 4 && (
              <StepStart
                accountAvailable={isConfigured}
                onGoogle={() => void useAuth.getState().signInWithGoogle()}
                onEmail={() => setLogin(true)}
                onImport={() => finish({}, '/importar')}
                onExplore={() => setStep(5)}
              />
            )}
            {shown === 5 && <StepShelves selected={selectedShelves} onToggle={toggleShelf} onFinish={() => finish()} />}
          </Animated.View>
        </View>
      </ScrollView>

      {login && (
        <LoginSheet
          onClose={() => setLogin(false)}
          onDone={() => {
            setLogin(false)
            onLoggedIn()
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 20 },
  bar: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 8 },
  skip: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  barText: { fontFamily: 'Inter-600', fontSize: 12, lineHeight: 16, color: colors.mute },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  dotOn: { width: 24, backgroundColor: colors.accent },
  dotDone: { width: 8, backgroundColor: alpha(colors.accent, 0.5) },
  dotOff: { width: 6, backgroundColor: colors.line },
  center: { flex: 1, justifyContent: 'center', paddingVertical: 8 },
  stepBox: { width: '100%', maxWidth: 384, alignSelf: 'center', alignItems: 'center' },
})
