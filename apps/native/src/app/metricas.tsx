import { useMemo, useState } from 'react'
import { ScrollView, Share, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ACTIVE_SHELVES, ENGINE_VERSION, SHELF_LABEL, calcAllMetrics, type Bucket, type ShelfType } from '@biblioteca/core'
import { AppText } from '../components/AppText'
import { Icon } from '../components/Icon'
import { Press } from '../components/Press'
import { DuelHeader } from '../components/duel/DuelHeader'
import { Box, Grid, KpiCard, SectionHead } from '../components/metrics/parts'
import { Chip, Confirm, Toast } from '../components/ui'
import { useEvents } from '../store'
import { alpha, colors } from '../theme'

/**
 * Métricas del motor (Metrics.tsx). Misma pantalla y mismos textos; el contenido se calcula con `calcAllMetrics` de core.
 * Diferencia: «Exportar JSON» ya no descarga con `document`: guarda el archivo en la caché y abre la hoja de compartir
 * (expo-sharing); si eso falla, comparte el texto con `Share`.
 */
const BUCKET_LABELS: Record<Bucket, string> = {
  seen_likely: 'Vistas probables',
  social: 'Social (amigos)',
  friend_gem: 'Joyas de amigos',
  explore: 'Exploración',
}
const BUCKETS: Bucket[] = ['seen_likely', 'social', 'friend_gem', 'explore']

export default function Metricas() {
  const insets = useSafeAreaInsets()
  const events = useEvents((s) => s.events)
  const clearEvents = useEvents((s) => s.clearEvents)

  const [selectedShelf, setSelectedShelf] = useState<ShelfType | 'all'>('all')
  const [selectedVersion, setSelectedVersion] = useState<string | 'all'>('all')
  const [confirmClear, setConfirmClear] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const versions = useMemo(() => {
    const set = new Set<string>()
    for (const e of events) if (e.v) set.add(e.v)
    if (!set.has(ENGINE_VERSION)) set.add(ENGINE_VERSION)
    return Array.from(set)
  }, [events])

  const kpis = useMemo(
    () =>
      calcAllMetrics(events, {
        version: selectedVersion === 'all' ? undefined : selectedVersion,
        shelf: selectedShelf === 'all' ? undefined : selectedShelf,
      }),
    [events, selectedVersion, selectedShelf],
  )

  const back = () => (router.canGoBack() ? router.back() : router.replace('/perfil'))

  const exportEvents = async () => {
    const json = JSON.stringify(events, null, 2)
    const name = `biblioteca_events_${new Date().toISOString().slice(0, 10)}.json`
    try {
      if (await Sharing.isAvailableAsync()) {
        const file = new File(Paths.cache, name)
        file.create({ overwrite: true })
        file.write(json)
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: name })
      } else {
        await Share.share({ title: name, message: json })
      }
      setToast('Eventos descargados')
    } catch {
      try {
        await Share.share({ title: name, message: json })
        setToast('Eventos descargados')
      } catch {
        setToast('Error al exportar eventos')
      }
    }
  }

  const handleClear = () => {
    clearEvents()
    setConfirmClear(false)
    setToast('Eventos borrados')
  }

  const d = kpis.deck
  const c = kpis.decide
  const phases = c.slowDuelsByPhase
  const none = events.length === 0

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }} showsVerticalScrollIndicator={false}>
        {/* Cabecera */}
        <View style={styles.headWrap}>
          <DuelHeader
            title="Métricas del motor"
            subtitle={`${events.length} eventos registrados`}
            onBack={back}
            action={
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Press
                  accessibilityRole="button"
                  accessibilityLabel="Exportar JSON"
                  disabled={none}
                  onPress={() => void exportEvents()}
                  style={[styles.exportBtn, none ? { opacity: 0.3 } : null]}
                >
                  <Icon name="sparkle" size={14} color={colors.accentInk} />
                  <AppText style={styles.exportText}>Exportar JSON</AppText>
                </Press>
                <Press
                  accessibilityRole="button"
                  accessibilityLabel="Borrar eventos"
                  disabled={none}
                  onPress={() => setConfirmClear(true)}
                  style={[styles.trashBtn, none ? { opacity: 0.3 } : null]}
                >
                  <Icon name="trash" size={15} color={colors.stampRed} />
                </Press>
              </View>
            }
          />
        </View>

        {/* Filtros */}
        <View style={styles.filters}>
          <FilterRow label="Estantería:">
            <Chip active={selectedShelf === 'all'} onPress={() => setSelectedShelf('all')}>
              Todas
            </Chip>
            {ACTIVE_SHELVES.map((s) => (
              <Chip key={s} active={selectedShelf === s} onPress={() => setSelectedShelf(s)}>
                {SHELF_LABEL[s].plural}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Versión:">
            <Chip active={selectedVersion === 'all'} onPress={() => setSelectedVersion('all')}>
              Todas
            </Chip>
            {versions.map((v) => (
              <Chip key={v} active={selectedVersion === v} onPress={() => setSelectedVersion(v)}>
                {v}
              </Chip>
            ))}
          </FilterRow>
        </View>

        <View style={{ padding: 16, gap: 24 }}>
          {/* KPI 1: Descubrir */}
          <View style={{ gap: 12 }}>
            <SectionHead title="Descubrir (Mazo)" right={`${d.totalSwipes} swipes`} />
            <Grid cols={2}>
              <KpiCard label="Acierto primeras 20" value={`${d.first20Accuracy}%`} sub="Tarjetas marcadas vistas" />
              <KpiCard label="AUC de R" value={`${d.aucR}`} sub="Discriminación de R vs 'la vi'" />
              <KpiCard label="Tasa de guardado" value={`${d.discoveryRate}%`} sub="Añadidas a pendientes (arriba)" />
              <KpiCard label="Tasa de descarte" value={`${d.dismissRate}%`} sub="Descartadas (izquierda)" />
              <KpiCard label="Ritmo medio" value={`${d.avgMsPerCard > 0 ? (d.avgMsPerCard / 1000).toFixed(1) : 0}s`} sub="Tiempo por tarjeta" />
            </Grid>

            <Box>
              <AppText style={styles.boxTitle}>RENDIMIENTO POR CUPO</AppText>
              {BUCKETS.map((b, i) => {
                const item = d.byBucket[b]
                return (
                  <View key={b} style={[styles.bucketRow, i < BUCKETS.length - 1 ? styles.bucketBorder : null]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText style={styles.bucketName}>{BUCKET_LABELS[b]}</AppText>
                      <AppText style={styles.bucketSub}>
                        {item.right} vistos · {item.up} pendientes · {item.left} fuera
                      </AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText style={styles.bucketRate}>{item.successRate}% éxito</AppText>
                      <AppText style={styles.bucketSub}>{item.shown} mostradas</AppText>
                    </View>
                  </View>
                )
              })}
            </Box>
          </View>

          {/* KPI 2: Decidir */}
          <View style={{ gap: 12 }}>
            <SectionHead title="Decidir" right={`${c.totalSessions} sesiones`} />
            <Grid cols={2}>
              <KpiCard label="Aceptación 1ª ronda" value={`${c.firstRoundAcceptRate}%`} sub="Eligieron la primera propuesta" />
              <KpiCard label="Tasa de abandono" value={`${c.abandonRate}%`} sub="Salieron sin elegir obra" />
              <KpiCard label="Duelos por sesión" value={`${c.avgDuels}`} sub="Media hasta aceptar" />
              <KpiCard label="Latencia duelo" value={c.medianDuelMs > 0 ? `${(c.medianDuelMs / 1000).toFixed(1)}s` : '—'} sub="Mediana de decisión" />
              <KpiCard label="InfoGain duelos" value={`${c.avgInfoGain}`} sub="Poder discriminatorio" />
              <KpiCard label="«No conozco ninguna»" value={`${c.slowDuelPct}%`} sub={`F1: ${phases.F1?.pct ?? 0}% (obj < 5%)`} />
            </Grid>

            {/* «No conozco ninguna» por fase (T19 §1.3) */}
            <Box>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <AppText style={[styles.boxTitle, { flex: 1 }]}>«NO CONOZCO NINGUNA» POR FASE (T19 §1.3)</AppText>
                <AppText style={styles.objective}>Obj F1 &lt; 5%</AppText>
              </View>
              <View style={{ paddingTop: 4 }}>
                <Grid cols={3}>
                  {([['F1', 'F1 · Conocidas'], ['F2', 'F2 · Afinar'], ['F3', 'F3 · Parecidas']] as const).map(([k, label]) => (
                    <View key={k} style={styles.phaseCell}>
                      <AppText style={styles.phaseLabel}>{label}</AppText>
                      <AppText style={styles.phasePct}>{phases[k]?.pct ?? 0}%</AppText>
                      <AppText style={styles.phaseCount}>
                        {phases[k]?.slow ?? 0}/{phases[k]?.total ?? 0} duelos
                      </AppText>
                    </View>
                  ))}
                </Grid>
              </View>
            </Box>

            {/* Métrica estrella: acierto real a 14 días */}
            <Box pad={14} gap={6}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText style={styles.starTitle}>MÉTRICA ESTRELLA</AppText>
                <AppText style={styles.starCount}>{c.acceptedItemsCount} aceptadas</AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 4 }}>
                <View>
                  <AppText style={styles.starBig}>{c.realSuccessRate14d}%</AppText>
                  <AppText style={styles.starSub}>Acabaron vistas en 14 días</AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText style={styles.starAccent}>{c.realAvgPercentile > 0 ? `Top ${(100 - c.realAvgPercentile * 100).toFixed(0)}%` : '—'}</AppText>
                  <AppText style={styles.starSub}>Puesto medio en tu ranking</AppText>
                </View>
              </View>
            </Box>
          </View>

          {/* KPI 3: Limpieza */}
          <View style={{ gap: 12 }}>
            <SectionHead title="Limpieza de pendientes" right={`${kpis.cleanup.totalSwipes} revisadas`} />
            <Grid cols={3}>
              <KpiCard label="Vistas" value={`${kpis.cleanup.rightRate}%`} sub="Pasan a vistas" />
              <KpiCard label="Se quedan" value={`${kpis.cleanup.upRate}%`} sub="Rescatadas" />
              <KpiCard label="Fuera" value={`${kpis.cleanup.leftRate}%`} sub="Descartadas" />
            </Grid>
          </View>
        </View>
      </ScrollView>

      {confirmClear && (
        <Confirm
          title="¿Borrar todos los eventos?"
          text="Se restablecerán a cero los eventos locales de métricas. Las valoraciones y biblioteca no se verán afectadas."
          confirmLabel="Borrar eventos"
          onCancel={() => setConfirmClear(false)}
          onConfirm={handleClear}
        />
      )}
      {toast ? <Toast key={toast} message={toast} ms={1500} onDone={() => setToast(null)} /> : null}
    </View>
  )
}

/** Fila de filtros: etiqueta fija y pastillas con desplazamiento horizontal (`overflow-x-auto no-scrollbar`). */
function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <AppText style={styles.filterLabel}>{label}</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
        {children}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  headWrap: { borderBottomWidth: 1, borderBottomColor: colors.line },
  exportBtn: { height: 36, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 6 },
  exportText: { fontFamily: 'Inter-600', fontSize: 12, lineHeight: 16, color: colors.accentInk },
  trashBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  filters: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: alpha(colors.line, 0.6), backgroundColor: alpha(colors.surface, 0.5) },
  filterLabel: { fontFamily: 'Inter-400', fontSize: 12, lineHeight: 16, color: colors.mute },
  boxTitle: { fontFamily: 'Inter-600', fontSize: 12, lineHeight: 16, color: colors.mute },
  objective: { fontFamily: 'Inter-400', fontSize: 10, lineHeight: 15, color: colors.accent },
  bucketRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, gap: 8 },
  bucketBorder: { borderBottomWidth: 1, borderBottomColor: alpha(colors.line, 0.4) },
  bucketName: { fontFamily: 'Inter-500', fontSize: 12, lineHeight: 16, color: colors.ink },
  bucketSub: { fontFamily: 'Inter-400', fontSize: 10, lineHeight: 15, color: colors.mute },
  bucketRate: { fontFamily: 'Inter-600', fontSize: 12, lineHeight: 16, color: colors.accent, fontVariant: ['tabular-nums'] },
  phaseCell: { borderRadius: 12, backgroundColor: alpha(colors.surface2, 0.6), borderWidth: 1, borderColor: alpha(colors.line, 0.4), padding: 8, alignItems: 'center' },
  phaseLabel: { fontFamily: 'Inter-400', fontSize: 11, lineHeight: 16.5, color: colors.mute },
  phasePct: { fontFamily: 'Fraunces72-700', fontSize: 18, lineHeight: 28, color: '#ffffff', fontVariant: ['tabular-nums'], marginTop: 2 },
  phaseCount: { fontFamily: 'Inter-400', fontSize: 9, lineHeight: 13.5, color: colors.mute },
  starTitle: { fontFamily: 'Inter-600', fontSize: 12, lineHeight: 16, letterSpacing: 0.3, color: colors.accent },
  starCount: { fontFamily: 'Inter-400', fontSize: 11, lineHeight: 16.5, color: colors.mute },
  starBig: { fontFamily: 'Fraunces72-700', fontSize: 24, lineHeight: 32, color: '#ffffff', fontVariant: ['tabular-nums'] },
  starAccent: { fontFamily: 'Fraunces72-700', fontSize: 20, lineHeight: 28, color: colors.accent, fontVariant: ['tabular-nums'] },
  starSub: { fontFamily: 'Inter-400', fontSize: 12, lineHeight: 16, color: colors.mute },
})
