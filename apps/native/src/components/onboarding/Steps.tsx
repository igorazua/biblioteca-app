import { useEffect, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated'
import { ACTIVE_SHELVES, SHELF_LABEL, type Item, type ShelfType } from '@biblioteca/core'
import { APP_NAME } from '@biblioteca/core'
import { titleOf } from '../../lib/item'
import { haptic } from '../../lib/haptics'
import { BUILT, BUILT_AUTH } from '../../lib/phase'
import { alpha, colors } from '../../theme'
import { AppText } from '../AppText'
import { DuelFan } from '../DuelFan'
import { sideOf } from '../duel/sides'
import { Icon } from '../Icon'
import { Poster } from '../Poster'
import { Press } from '../Press'
import { Avatar } from '../ui'
import { PracticeCard, type PracticeDir, type PracticeHandle } from './PracticeCard'
import { GoogleLogo, ShelfGlyph, StepTitle, WideButton } from './parts'

// Los seis pasos de screens/Onboarding.tsx. Cada uno recibe lo que necesita; la cabecera y la transición viven en la pantalla.

const SPRING = { stiffness: 500, damping: 25, mass: 1 } // transición por defecto de framer para x, y, scale y rotate

// ─── Paso 0: bienvenida y manifiesto ─────────────────────────────────────────────────────────────

function Cover({ item, w, h, from, to, z }: { item: Item; w: number; h: number; from: { rotate: number; x: number; scale: number; y: number }; to: { rotate: number; x: number; scale: number; y: number }; z: number }) {
  const reduce = useReducedMotion()
  const p = useSharedValue(reduce ? 1 : 0)
  useEffect(() => {
    if (!reduce) p.value = withSpring(1, SPRING)
  }, [p, reduce])
  const style = useAnimatedStyle(() => {
    const k = p.value
    const f = (a: number, b: number) => a + (b - a) * k
    return { transform: [{ translateX: f(from.x, to.x) }, { translateY: f(from.y, to.y) }, { rotate: `${f(from.rotate, to.rotate)}deg` }, { scale: f(from.scale, to.scale) }] }
  })
  return (
    <Animated.View style={[styles.cover, { width: w, height: h, zIndex: z }, style]}>
      <View style={[styles.coverClip, { borderColor: z > 10 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' }]}>
        <Poster item={item} showTitle={false} style={StyleSheet.absoluteFill} />
      </View>
    </Animated.View>
  )
}

export function StepWelcome({ items, onNext }: { items: Item[]; onNext: () => void }) {
  const still = { scale: 1, y: 0 }
  return (
    <View style={{ width: '100%', gap: 28 }}>
      <View style={styles.fan}>
        {items[1] && <Cover item={items[1]} w={96} h={144} z={10} from={{ rotate: -14, x: -50, ...still }} to={{ rotate: -10, x: -44, ...still }} />}
        {items[0] && <Cover item={items[0]} w={112} h={160} z={20} from={{ rotate: 0, x: 0, scale: 0.95, y: 10 }} to={{ rotate: 0, x: 0, scale: 1, y: 0 }} />}
        {items[2] && <Cover item={items[2]} w={96} h={144} z={10} from={{ rotate: 14, x: 50, ...still }} to={{ rotate: 10, x: 44, ...still }} />}
      </View>

      <View style={{ gap: 8, alignItems: 'center' }}>
        <AppText style={styles.kicker}>{APP_NAME}</AppText>
        <AppText style={styles.hero}>Lo que te ha formado, ordenado por ti.</AppText>
        <AppText style={styles.lead}>Películas, series, libros, música y juegos de mesa. En estanterías compartidas y sin notas numéricas vacías.</AppText>
      </View>

      <View style={styles.shelfGrid}>
        {ACTIVE_SHELVES.map((s) => (
          <View key={s} style={styles.shelfCell}>
            <ShelfGlyph shelf={s} size={19} color={colors.accent} />
            <AppText numberOfLines={1} style={styles.shelfCellText}>
              {SHELF_LABEL[s].plural}
            </AppText>
          </View>
        ))}
      </View>

      <View style={{ paddingTop: 8 }}>
        <WideButton label="Empezar tutorial" onPress={() => { haptic('tap'); onNext() }} />
      </View>
    </View>
  )
}

// ─── Paso 1: tres gestos con tarjeta real ────────────────────────────────────────────────────────

function GestureButton({ dir, tried, onPress }: { dir: PracticeDir; tried: boolean; onPress: () => void }) {
  const spec = {
    left: { arrow: '←', icon: 'x' as const, size: 14, label: 'No me interesa', on: 'rgba(244,63,94,0.15)', border: '#f43f5e', color: '#fb7185' },
    up: { arrow: '↑', icon: 'bookmark' as const, size: 13, label: 'Guardar', on: 'rgba(14,165,233,0.15)', border: '#0ea5e9', color: '#38bdf8' },
    right: { arrow: '→', icon: 'check' as const, size: 14, label: 'La he visto', on: 'rgba(16,185,129,0.15)', border: '#10b981', color: '#34d399' },
  }[dir]
  const tint = tried ? spec.color : colors.mute
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={spec.label}
      scaleTo={0.95}
      onPress={onPress}
      style={[styles.gBtn, { backgroundColor: tried ? spec.on : colors.surface, borderColor: tried ? spec.border : colors.line }]}
    >
      <View style={styles.gTop}>
        <AppText style={[styles.gArrow, { color: tint }]}>{spec.arrow}</AppText>
        <Icon name={spec.icon} size={spec.size} color={tint} strokeWidth={2.5} />
      </View>
      <AppText style={[styles.gLabel, { color: tint }]}>{spec.label}</AppText>
    </Press>
  )
}

export function StepGestures({
  items,
  tried,
  onTry,
  onNext,
}: {
  items: Item[]
  tried: Record<PracticeDir, boolean>
  onTry: (dir: PracticeDir) => void
  onNext: () => void
}) {
  const card = useRef<PracticeHandle>(null)
  const all = tried.left && tried.right && tried.up
  const mark = onTry
  return (
    <View style={{ width: '100%', gap: 16 }}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <StepTitle size={26}>Descubre con tres gestos</StepTitle>
        <AppText style={styles.sub}>Desliza la tarjeta en cualquier dirección o pulsa los botones.</AppText>
      </View>

      <PracticeCard ref={card} items={items} onDir={mark} />

      <View style={styles.gRow}>
        <GestureButton dir="left" tried={tried.left} onPress={() => card.current?.fling('left')} />
        <GestureButton dir="up" tried={tried.up} onPress={() => card.current?.fling('up')} />
        <GestureButton dir="right" tried={tried.right} onPress={() => card.current?.fling('right')} />
      </View>

      <View style={{ paddingTop: 8 }}>
        <WideButton
          minHeight={50}
          bold
          tone={all ? 'accent' : 'off'}
          label={all ? 'Continuar al ranking' : 'Prueba los 3 gestos para continuar'}
          onPress={() => { haptic('tap'); onNext() }}
        />
      </View>
    </View>
  )
}

// ─── Paso 2: ranking A/B simulado ────────────────────────────────────────────────────────────────

export function StepDuel({ items, winner, onWinner, onNext }: { items: Item[]; winner: 'a' | 'b' | null; onWinner: (w: 'a' | 'b') => void; onNext: () => void }) {
  const a = items[0]
  const b = items[1]
  if (!a || !b) return null
  // Nota: el DuelFan nativo no admite `texts` (pregunta, pista y pastilla de la variante de la PWA); lleva los suyos fijos.
  const chosen = winner === 'a' ? titleOf(a) : winner === 'b' ? titleOf(b) : ''
  return (
    <View style={{ width: '100%' }}>
      <View style={{ alignItems: 'center', gap: 4, marginBottom: 8 }}>
        <StepTitle>Tu ranking sin poner notas</StepTitle>
        <AppText style={styles.sub}>Poner un 7 o un 8 no define tu gusto. Al comparar eliges entre dos y tu top se ordena solo.</AppText>
      </View>

      <View style={styles.duelBox}>
        <DuelFan
          key={`${a.id}|${b.id}`}
          left={sideOf(a)}
          right={sideOf(b)}
          onChoose={(w) => {
            onWinner(w)
            haptic('success')
          }}
        />
      </View>

      <AppText style={styles.duelHint}>
        {winner ? `¡Elegida! Has votado por ${chosen}.` : 'Desliza hacia la que prefieras o toca una carta'}
      </AppText>

      <View style={{ paddingTop: 8 }}>
        <WideButton
          minHeight={50}
          bold
          tone={winner ? 'accent' : 'off'}
          label={winner ? 'Siguiente' : 'Elige una para continuar'}
          onPress={() => { haptic('tap'); onNext() }}
        />
      </View>
    </View>
  )
}

// ─── Paso 3: amigos y afinidad ───────────────────────────────────────────────────────────────────

export function StepFriends({ items, onNext }: { items: Item[]; onNext: () => void }) {
  const it = items[0]
  return (
    <View style={{ width: '100%', gap: 24 }}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <StepTitle>El criterio de tus amigos</StepTitle>
        <AppText style={styles.sub}>Sin algoritmos comerciales. Ves quién la ha visto, en qué puesto de su ranking la coloca y sus notas reales.</AppText>
      </View>

      <View style={styles.demo}>
        <View style={styles.demoTop}>
          <View style={styles.demoPoster}>{it && <Poster item={it} showTitle={false} style={StyleSheet.absoluteFill} />}</View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText numberOfLines={1} style={styles.demoTitle}>{it ? titleOf(it) : ''}</AppText>
            <AppText style={styles.demoSub}>{it ? `${it.year} · Coppola` : ''}</AppText>
            <View style={styles.demoFaces}>
              <Avatar name="Carlos" color="#f59e0b" size={24} />
              <Avatar name="Laura" color="#3b82f6" size={24} />
              <AppText style={styles.demoFacesText}>La tienen en su top</AppText>
            </View>
          </View>
        </View>
        <View style={styles.demoQuote}>
          <View style={styles.demoQuoteTop}>
            <AppText style={styles.demoName}>Carlos</AppText>
            <AppText style={styles.demoPos}>Puesto #1</AppText>
          </View>
          <AppText style={styles.demoText}>«Una obra maestra absoluta de ritmo y fotografía.»</AppText>
        </View>
      </View>

      <View style={{ paddingTop: 8 }}>
        <WideButton label="Siguiente" onPress={() => { haptic('tap'); onNext() }} />
      </View>
    </View>
  )
}

// ─── Paso 4: cómo empezar ────────────────────────────────────────────────────────────────────────

export function StepStart({
  accountAvailable,
  onGoogle,
  onEmail,
  onImport,
  onExplore,
}: {
  /** hay Supabase configurado: sin él no se ofrece cuenta */
  accountAvailable: boolean
  onGoogle: () => void
  onEmail: () => void
  onImport: () => void
  onExplore: () => void
}) {
  return (
    <View style={{ width: '100%', gap: 16 }}>
      <View style={{ alignItems: 'center', gap: 4, marginBottom: 8 }}>
        <StepTitle>¿Cómo quieres empezar?</StepTitle>
        <AppText style={styles.sub}>Elige cómo prefieres comenzar a guardar tus obras.</AppText>
      </View>

      {/* Opción 1: cuenta. Google solo cuando exista (BUILT_AUTH.google); el correo con código funciona ya. */}
      {accountAvailable && (
        <View style={styles.option}>
          {BUILT_AUTH.google && (
            <Press
              accessibilityRole="button"
              accessibilityLabel="Entrar con Google"
              scaleTo={0.98}
              onPress={() => { haptic('tap'); onGoogle() }}
              style={styles.googleBtn}
            >
              <GoogleLogo />
              <AppText style={styles.googleText}>Entrar con Google</AppText>
            </Press>
          )}
          <Press
            accessibilityRole="button"
            accessibilityLabel="Entrar con tu correo"
            scaleTo={0.98}
            onPress={() => { haptic('tap'); onEmail() }}
            style={BUILT_AUTH.google ? styles.altBtn : styles.googleBtn}
          >
            <Icon name="mail" size={17} color={BUILT_AUTH.google ? colors.accent : '#000000'} />
            <AppText style={BUILT_AUTH.google ? styles.altText : styles.googleText}>Entrar con tu correo</AppText>
          </Press>
          <AppText style={styles.optNote}>Sincroniza tus listas en la nube de forma segura para no perder tus datos.</AppText>
        </View>
      )}

      {/* Opción 2: importar (la pantalla Importar llega más adelante) */}
      {BUILT.importar && (
        <View style={styles.option}>
          <Press accessibilityRole="button" accessibilityLabel="Importar mis listas existentes" scaleTo={0.98} onPress={() => { haptic('tap'); onImport() }} style={styles.altBtn}>
            <Icon name="sparkle" size={17} color={colors.accent} />
            <AppText style={styles.altInk}>Importar mis listas existentes</AppText>
          </Press>
          <AppText style={styles.optNote}>Trae tu historial de Letterboxd, IMDb, Goodreads o Netflix en segundos.</AppText>
        </View>
      )}

      {/* Opción 3: explorar sin cuenta */}
      <View style={styles.optionQuiet}>
        <Press accessibilityRole="button" accessibilityLabel="Explorar sin cuenta" scaleTo={0.98} onPress={() => { haptic('tap'); onExplore() }} style={styles.quietBtn}>
          <AppText style={styles.quietText}>Explorar sin cuenta</AppText>
          <Icon name="chevron" size={14} color={colors.mute} />
        </Press>
        <AppText style={[styles.optNote, { color: alpha(colors.mute, 0.8) }]}>Pruébala directamente en tu móvil sin iniciar sesión.</AppText>
      </View>
    </View>
  )
}

// ─── Paso 5: estanterías ─────────────────────────────────────────────────────────────────────────

export function StepShelves({ selected, onToggle, onFinish }: { selected: ShelfType[]; onToggle: (s: ShelfType) => void; onFinish: () => void }) {
  return (
    <View style={{ width: '100%', gap: 20 }}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <StepTitle>¿Qué te interesa guardar?</StepTitle>
        <AppText style={styles.sub}>Elige qué estanterías quieres tener activas en tu biblioteca.</AppText>
      </View>

      <View style={{ gap: 8 }}>
        {ACTIVE_SHELVES.map((s) => {
          const active = selected.includes(s)
          return (
            <Press
              key={s}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              accessibilityLabel={SHELF_LABEL[s].plural}
              scaleTo={0.99}
              onPress={() => { haptic('tap'); onToggle(s) }}
              style={[styles.shelfRow, active ? styles.shelfRowOn : styles.shelfRowOff]}
            >
              <View style={styles.shelfRowLeft}>
                <ShelfGlyph shelf={s} size={18} color={active ? colors.accent : colors.mute} />
                <AppText style={[styles.shelfRowText, { fontFamily: active ? 'Archivo-SemiBold' : 'Archivo-Regular', color: active ? colors.ink : colors.mute }]}>{SHELF_LABEL[s].plural}</AppText>
              </View>
              <View style={[styles.check, active ? styles.checkOn : styles.checkOff]}>
                <AppText fixed style={[styles.checkMark, { color: active ? colors.accentInk : 'transparent' }]}>✓</AppText>
              </View>
            </Press>
          )
        })}
      </View>

      <View style={{ paddingTop: 8 }}>
        <WideButton label="Entrar a mi biblioteca" onPress={() => { haptic('tap'); onFinish() }} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  coverClip: { flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  cover: { position: 'absolute', borderRadius: 16, shadowColor: '#000000', shadowOffset: { width: 0, height: 25 }, shadowOpacity: 0.5, shadowRadius: 25, elevation: 16, backgroundColor: colors.surface2 },
  fan: { height: 176, width: '100%', alignItems: 'center', justifyContent: 'center', paddingTop: 8 },
  kicker: { fontFamily: 'Archivo-SemiBold', fontSize: 11, lineHeight: 16.5, letterSpacing: 2.2, textTransform: 'uppercase', color: colors.accent },
  hero: { fontFamily: 'Archivo-Condensed-ExtraBold', fontSize: 42, lineHeight: 42, textTransform: 'uppercase', color: colors.ink, textAlign: 'center' },
  lead: { fontFamily: 'Archivo-Regular', fontSize: 14, lineHeight: 22.75, color: colors.mute, textAlign: 'center', maxWidth: 320, paddingTop: 4 },
  shelfGrid: { flexDirection: 'row', gap: 8, paddingTop: 4, width: '100%' },
  shelfCell: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  shelfCellText: { fontFamily: 'Archivo-Regular', fontSize: 10, lineHeight: 15, letterSpacing: -0.25, color: colors.mute, maxWidth: '100%' },
  sub: { fontFamily: 'Archivo-Regular', fontSize: 12, lineHeight: 16, color: colors.mute, textAlign: 'center', maxWidth: 320 },
  gRow: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  gBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 4 },
  gTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gArrow: { fontFamily: 'Archivo-SemiBold', fontSize: 12, lineHeight: 16 },
  gLabel: { fontFamily: 'Archivo-SemiBold', fontSize: 11, lineHeight: 13.75, textAlign: 'center' },
  duelBox: { height: 320, width: '100%', overflow: 'hidden', marginVertical: 4 },
  duelHint: { fontFamily: 'Archivo-Regular', fontSize: 12, lineHeight: 16, color: colors.mute, textAlign: 'center', paddingVertical: 4 },
  demo: { width: '100%', maxWidth: 270, alignSelf: 'center', borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12, shadowColor: '#000000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.1, shadowRadius: 12.5 },
  demoTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  demoPoster: { width: 48, height: 64, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  demoTitle: { fontFamily: 'Archivo-SemiBold', fontSize: 12, lineHeight: 16, color: colors.ink },
  demoSub: { fontFamily: 'Archivo-Regular', fontSize: 11, color: colors.mute },
  demoFaces: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  demoFacesText: { fontFamily: 'Archivo-Regular', fontSize: 11, color: colors.mute },
  demoQuote: { backgroundColor: colors.surface2, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.line, gap: 4 },
  demoQuoteTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  demoName: { fontFamily: 'Archivo-SemiBold', fontSize: 11, color: colors.ink },
  demoPos: { fontFamily: 'Archivo-SemiBold', fontSize: 11, color: colors.accent },
  demoText: { fontFamily: 'Archivo-Regular', fontSize: 11, lineHeight: 13.75, color: colors.mute },
  option: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 24, padding: 16, gap: 8, shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  optionQuiet: { backgroundColor: alpha(colors.surface, 0.5), borderWidth: 1, borderColor: alpha(colors.line, 0.6), borderRadius: 24, padding: 14, gap: 6 },
  googleBtn: { width: '100%', minHeight: 48, borderRadius: 16, backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  googleText: { fontFamily: 'Archivo-SemiBold', fontSize: 14, lineHeight: 20, color: '#000000' },
  altBtn: { width: '100%', minHeight: 48, borderRadius: 16, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  altText: { fontFamily: 'Archivo-SemiBold', fontSize: 14, lineHeight: 20, color: colors.ink },
  altInk: { fontFamily: 'Archivo-SemiBold', fontSize: 14, lineHeight: 20, color: colors.ink },
  optNote: { fontFamily: 'Archivo-Regular', fontSize: 11, lineHeight: 13.75, color: colors.mute, textAlign: 'center', paddingHorizontal: 4 },
  quietBtn: { width: '100%', minHeight: 44, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  quietText: { fontFamily: 'Archivo-SemiBold', fontSize: 14, lineHeight: 20, color: colors.mute },
  shelfRow: { width: '100%', minHeight: 52, borderRadius: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
  shelfRowOn: { backgroundColor: alpha(colors.accent, 0.1), borderColor: colors.accent },
  shelfRowOff: { backgroundColor: colors.surface, borderColor: colors.line },
  shelfRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shelfRowText: { fontSize: 14, lineHeight: 20 },
  check: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkOff: { borderColor: colors.line },
  checkMark: { fontSize: 12, lineHeight: 16 },
})
