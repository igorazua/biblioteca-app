import { useEffect } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { displayTitle } from '@biblioteca/core/src/lib/locale'
import { userLang } from '@biblioteca/core/src/lib/userLang'
import { AppText } from '../AppText'
import { Press } from '../Press'
import { alpha, colors, tx } from '../../theme'
import type { ImportFlow } from '../../lib/import/useImportFlow'

// ImportFlowView.tsx de la PWA: buscando → revisar dudosas → hecho. Medidas en MEDIDAS_NATIVA_2 («ImportFlowView»).

/** `w-10 h-10 border-[3px] border-accent border-t-transparent rounded-full animate-spin`: una vuelta por segundo, lineal. */
export function BigSpinner() {
  const turn = useSharedValue(0)
  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.linear }), -1, false)
    return () => cancelAnimation(turn)
  }, [turn])
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }))
  return <Animated.View style={[styles.spinner, spin]} />
}

export function ImportFlowView({ flow }: { flow: ImportFlow }) {
  const insets = useSafeAreaInsets()
  const { step, progress, sure, doubtful, notFound, summary } = flow
  const resolved = sure.length + doubtful.filter((d) => d.chosenItem).length

  if (step === 'matching') {
    return (
      <View style={[styles.center, { gap: 16 }]}>
        <BigSpinner />
        <AppText style={styles.h2}>Buscando tus obras…</AppText>
        {progress ? (
          <AppText style={styles.progress}>
            {progress.current} de {progress.total}
          </AppText>
        ) : null}
        <AppText style={styles.note}>Las casamos con el catálogo (Wikidata, TVmaze, Open Library y MusicBrainz).</AppText>
      </View>
    )
  }

  if (step === 'review') {
    return (
      <ScrollView
        contentContainerStyle={[styles.review, { paddingBottom: 20 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.resultCard}>
          <AppText style={tx('labelCaps', { color: colors.mute })}>Resultado</AppText>
          <AppText style={styles.resultTitle}>{sure.length} encontradas</AppText>
          <AppText style={styles.resultMeta}>
            {doubtful.length} dudosas · {notFound.length} sin encontrar
          </AppText>
        </View>

        {doubtful.length > 0 ? (
          <View style={{ gap: 12 }}>
            <AppText style={[tx('labelCaps', { color: colors.mute }), { paddingHorizontal: 4 }]}>Revisa las dudosas</AppText>
            <View style={{ gap: 12 }}>
              {doubtful.map((d, idx) => (
                <View key={idx} style={styles.doubtCard}>
                  <AppText style={styles.doubtTitle}>
                    {d.row.title}
                    {d.row.year ? <AppText style={styles.doubtYear}> ({d.row.year})</AppText> : null}
                  </AppText>
                  <View style={styles.chips}>
                    {d.candidates.slice(0, 3).map((c, cIdx) => {
                      const chosen = d.chosenItem?.title === c.title
                      return (
                        <Press
                          key={cIdx}
                          accessibilityRole="button"
                          accessibilityState={{ selected: chosen }}
                          onPress={() => void flow.resolveCandidate(idx, c)}
                          style={[styles.chip, chosen ? styles.chipOn : styles.chipOff]}
                        >
                          <AppText style={[styles.chipText, { color: chosen ? colors.accentInk : colors.ink }]}>
                            {displayTitle(c, userLang())} ({c.year ?? '?'}){chosen ? ' ✓' : ''}
                          </AppText>
                        </Press>
                      )
                    })}
                    <Press
                      accessibilityRole="button"
                      accessibilityState={{ selected: d.chosenItem === null }}
                      onPress={() => flow.skipCandidate(idx)}
                      style={[styles.chip, d.chosenItem === null ? styles.chipNone : styles.chipOff]}
                    >
                      <AppText style={[styles.chipText, { color: d.chosenItem === null ? colors.stampRed : colors.mute }]}>Ninguna</AppText>
                    </Press>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.confirmWrap}>
          <Press accessibilityRole="button" onPress={flow.confirm} scaleTo={0.98} style={styles.confirm}>
            <AppText style={styles.confirmText}>
              Añadir {resolved} {resolved === 1 ? 'obra' : 'obras'}
            </AppText>
          </Press>
        </View>
      </ScrollView>
    )
  }

  if (step === 'done') {
    return (
      <View style={[styles.center, { gap: 20 }]}>
        <View style={styles.tick}>
          <AppText fixed style={styles.tickText}>
            ✓
          </AppText>
        </View>
        <AppText style={styles.h1}>Hecho</AppText>
        {summary ? (
          <AppText style={styles.note2}>
            Hemos añadido {summary.created} {summary.created === 1 ? 'obra nueva' : 'obras nuevas'} a tus estanterías
            {summary.updated > 0 && ` y puesto estrellas a ${summary.updated}`}.
            {summary.skipped > 0 && ` Otras ${summary.skipped} ya estaban.`}
          </AppText>
        ) : null}
        <Press accessibilityRole="button" onPress={() => router.replace('/')} scaleTo={0.95} style={styles.finish}>
          <AppText style={styles.confirmText}>Ir a mis estanterías</AppText>
        </Press>
      </View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  // flex-1 flex flex-col items-center justify-center text-center p-8
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  spinner: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: colors.accent, borderTopColor: 'transparent' },
  // serif text-xl font-semibold
  h2: { fontFamily: 'Fraunces72-600', fontSize: 20, lineHeight: 28, color: colors.ink, textAlign: 'center' },
  // serif text-2xl font-semibold
  h1: { fontFamily: 'Fraunces72-600', fontSize: 24, lineHeight: 32, color: colors.ink, textAlign: 'center' },
  progress: { fontFamily: 'Inter-400', fontSize: 14, lineHeight: 20, color: colors.mute, textAlign: 'center' },
  // text-xs text-mute max-w-xs leading-relaxed
  note: { fontFamily: 'Inter-400', fontSize: 12, lineHeight: 19.5, color: colors.mute, textAlign: 'center', maxWidth: 320 },
  // text-sm text-mute max-w-xs leading-relaxed
  note2: { fontFamily: 'Inter-400', fontSize: 14, lineHeight: 22.75, color: colors.mute, textAlign: 'center', maxWidth: 320 },
  // flex-1 flex flex-col gap-6 p-5 max-w-md mx-auto w-full
  review: { flexGrow: 1, gap: 24, padding: 20, width: '100%', maxWidth: 448, alignSelf: 'center' },
  // rounded-3xl bg-surface border border-line p-5
  resultCard: { borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 20 },
  // serif text-3xl font-semibold mt-1
  resultTitle: { fontFamily: 'Fraunces72-600', fontSize: 30, lineHeight: 36, color: colors.ink, marginTop: 4 },
  resultMeta: { fontFamily: 'Inter-400', fontSize: 12, lineHeight: 16, color: colors.mute, marginTop: 8 },
  // bg-surface border border-line rounded-2xl p-4 space-y-3
  doubtCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16, gap: 12 },
  doubtTitle: { fontFamily: 'Inter-600', fontSize: 14, lineHeight: 20, color: colors.ink },
  doubtYear: { fontFamily: 'Inter-400', color: colors.mute },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // min-h-[40px] text-xs px-3 rounded-xl border text-left
  chip: { minHeight: 40, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipOff: { backgroundColor: colors.surface2, borderColor: colors.line },
  chipNone: { backgroundColor: alpha(colors.stampRed, 0.2), borderColor: colors.stampRed },
  chipText: { fontFamily: 'Inter-400', fontSize: 12, lineHeight: 16 },
  // mt-auto pt-2
  confirmWrap: { marginTop: 'auto', paddingTop: 8 },
  // w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold
  confirm: { width: '100%', minHeight: 52, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontFamily: 'Inter-600', fontSize: 16, lineHeight: 24, color: colors.accentInk },
  // w-14 h-14 rounded-full bg-accent/20 text-accent text-2xl font-bold
  tick: { width: 56, height: 56, borderRadius: 28, backgroundColor: alpha(colors.accent, 0.2), alignItems: 'center', justifyContent: 'center' },
  tickText: { fontFamily: 'Inter-700', fontSize: 24, lineHeight: 32, color: colors.accent },
  // mt-2 px-6 min-h-[48px] rounded-2xl bg-accent text-accent-ink font-semibold
  finish: { marginTop: 8, paddingHorizontal: 24, minHeight: 48, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
})
