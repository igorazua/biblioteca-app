import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEvents } from '../store/useEvents'
import { calcAllMetrics } from '../lib/engine/metrics'
import { ENGINE_VERSION, type Bucket } from '../lib/engine/params'
import { SHELVES, SHELF_LABEL, type ShelfType } from '../types'
import { Icon } from '../components/Icon'
import { Chip, Confirm, Toast } from '../components/ui'

const BUCKET_LABELS: Record<Bucket, string> = {
  seen_likely: 'Vistas probables',
  social: 'Social (amigos)',
  friend_gem: 'Joyas de amigos',
  explore: 'Exploración',
}

export function Metrics() {
  const nav = useNavigate()
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

  const kpis = useMemo(() => {
    return calcAllMetrics(events, {
      version: selectedVersion === 'all' ? undefined : selectedVersion,
      shelf: selectedShelf === 'all' ? undefined : selectedShelf,
    })
  }, [events, selectedVersion, selectedShelf])

  const exportEvents = () => {
    try {
      const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `biblioteca_events_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setToast('Eventos descargados')
    } catch {
      setToast('Error al exportar eventos')
    }
  }

  const handleClear = () => {
    clearEvents()
    setConfirmClear(false)
    setToast('Eventos borrados')
  }

  return (
    <div className="h-full flex flex-col bg-bg text-white overflow-y-auto">
      {/* Header */}
      <div className="safe-top px-4 pb-3 pt-2 shrink-0 border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav('/perfil')}
            className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-mute active:scale-95 transition-transform"
            aria-label="Volver a perfil"
          >
            <Icon name="chevron" size={20} className="rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-bold font-serif">Métricas del motor</h1>
            <div className="text-xs text-mute">{events.length} eventos registrados</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportEvents}
            disabled={events.length === 0}
            className="h-9 px-3 rounded-xl bg-accent text-accent-ink text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 active:scale-95 transition-transform"
          >
            <Icon name="sparkle" size={14} />
            Exportar JSON
          </button>
          <button
            onClick={() => setConfirmClear(true)}
            disabled={events.length === 0}
            className="h-9 w-9 rounded-xl bg-surface border border-line text-stamp-red flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
            aria-label="Borrar eventos"
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-4 py-3 border-b border-line/60 space-y-2 bg-surface/50">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs text-mute shrink-0">Estantería:</span>
          <Chip active={selectedShelf === 'all'} onClick={() => setSelectedShelf('all')}>
            Todas
          </Chip>
          {SHELVES.map((s) => (
            <Chip key={s} active={selectedShelf === s} onClick={() => setSelectedShelf(s)}>
              {SHELF_LABEL[s].plural}
            </Chip>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs text-mute shrink-0">Versión:</span>
          <Chip active={selectedVersion === 'all'} onClick={() => setSelectedVersion('all')}>
            Todas
          </Chip>
          {versions.map((v) => (
            <Chip key={v} active={selectedVersion === v} onClick={() => setSelectedVersion(v)}>
              {v}
            </Chip>
          ))}
        </div>
      </div>

      {/* Contenido KPIs */}
      <div className="p-4 space-y-6">
        {/* KPI 1: Descubrir */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="serif text-lg font-semibold text-accent">Descubrir (Mazo)</h2>
            <span className="text-xs text-mute">{kpis.deck.totalSwipes} swipes</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <KpiCard label="Acierto primeras 20" value={`${kpis.deck.first20Accuracy}%`} sub="Tarjetas marcadas vistas" />
            <KpiCard label="AUC de R" value={`${kpis.deck.aucR}`} sub="Discriminación de R vs 'la vi'" />
            <KpiCard label="Tasa de guardado" value={`${kpis.deck.discoveryRate}%`} sub="Añadidas a pendientes (arriba)" />
            <KpiCard label="Tasa de descarte" value={`${kpis.deck.dismissRate}%`} sub="Descartadas (izquierda)" />
            <KpiCard label="Ritmo medio" value={`${kpis.deck.avgMsPerCard > 0 ? (kpis.deck.avgMsPerCard / 1000).toFixed(1) : 0}s`} sub="Tiempo por tarjeta" />
          </div>

          {/* Por cupos */}
          <div className="rounded-2xl bg-surface border border-line p-3 space-y-2">
            <div className="text-xs font-semibold uppercase text-mute">Rendimiento por cupo</div>
            {(['seen_likely', 'social', 'friend_gem', 'explore'] as Bucket[]).map((b) => {
              const item = kpis.deck.byBucket[b]
              return (
                <div key={b} className="flex items-center justify-between text-xs py-1 border-b border-line/40 last:border-0">
                  <div>
                    <div className="font-medium">{BUCKET_LABELS[b]}</div>
                    <div className="text-mute text-[10px]">
                      {item.right} vistos · {item.up} pendientes · {item.left} fuera
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums text-accent">{item.successRate}% éxito</div>
                    <div className="text-mute text-[10px]">{item.shown} mostradas</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* KPI 2: Decidir */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="serif text-lg font-semibold text-accent">Decidir</h2>
            <span className="text-xs text-mute">{kpis.decide.totalSessions} sesiones</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <KpiCard label="Aceptación 1ª ronda" value={`${kpis.decide.firstRoundAcceptRate}%`} sub="Eligieron la primera propuesta" />
            <KpiCard label="Tasa de abandono" value={`${kpis.decide.abandonRate}%`} sub="Salieron sin elegir obra" />
            <KpiCard label="Duelos por sesión" value={`${kpis.decide.avgDuels}`} sub="Media hasta aceptar" />
            <KpiCard label="Latencia duelo" value={`${kpis.decide.medianDuelMs > 0 ? (kpis.decide.medianDuelMs / 1000).toFixed(1) + 's' : '—'}`} sub="Mediana de decisión" />
            <KpiCard label="InfoGain duelos" value={`${kpis.decide.avgInfoGain}`} sub="Poder discriminatorio" />
            <KpiCard label="«No conozco ninguna»" value={`${kpis.decide.slowDuelPct}%`} sub={`F1: ${kpis.decide.slowDuelsByPhase.F1?.pct ?? 0}% (obj < 5%)`} />
          </div>

          {/* Duelos no conocidos por fase (T19 §1.3) */}
          <div className="rounded-2xl bg-surface border border-line p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-mute">«No conozco ninguna» por fase (T19 §1.3)</span>
              <span className="text-[10px] text-accent">Obj F1 &lt; 5%</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="rounded-xl bg-surface2/60 p-2 border border-line/40">
                <div className="text-[11px] text-mute">F1 · Conocidas</div>
                <div className="text-lg font-bold font-serif tabular-nums text-white mt-0.5">
                  {kpis.decide.slowDuelsByPhase.F1?.pct ?? 0}%
                </div>
                <div className="text-[9px] text-mute">{kpis.decide.slowDuelsByPhase.F1?.slow ?? 0}/{kpis.decide.slowDuelsByPhase.F1?.total ?? 0} duelos</div>
              </div>
              <div className="rounded-xl bg-surface2/60 p-2 border border-line/40">
                <div className="text-[11px] text-mute">F2 · Afinar</div>
                <div className="text-lg font-bold font-serif tabular-nums text-white mt-0.5">
                  {kpis.decide.slowDuelsByPhase.F2?.pct ?? 0}%
                </div>
                <div className="text-[9px] text-mute">{kpis.decide.slowDuelsByPhase.F2?.slow ?? 0}/{kpis.decide.slowDuelsByPhase.F2?.total ?? 0} duelos</div>
              </div>
              <div className="rounded-xl bg-surface2/60 p-2 border border-line/40">
                <div className="text-[11px] text-mute">F3 · Parecidas</div>
                <div className="text-lg font-bold font-serif tabular-nums text-white mt-0.5">
                  {kpis.decide.slowDuelsByPhase.F3?.pct ?? 0}%
                </div>
                <div className="text-[9px] text-mute">{kpis.decide.slowDuelsByPhase.F3?.slow ?? 0}/{kpis.decide.slowDuelsByPhase.F3?.total ?? 0} duelos</div>
              </div>
            </div>
          </div>

          {/* Métrica estrella: acierto real a 14 días */}
          <div className="rounded-2xl bg-surface border border-line p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-accent">Métrica Estrella</span>
              <span className="text-[11px] text-mute">{kpis.decide.acceptedItemsCount} aceptadas</span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <div className="text-2xl font-serif font-bold text-white tabular-nums">
                  {kpis.decide.realSuccessRate14d}%
                </div>
                <div className="text-xs text-mute">Acabaron vistas en 14 días</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-serif font-bold text-accent tabular-nums">
                  {kpis.decide.realAvgPercentile > 0 ? `Top ${(100 - kpis.decide.realAvgPercentile * 100).toFixed(0)}%` : '—'}
                </div>
                <div className="text-xs text-mute">Puesto medio en tu ranking</div>
              </div>
            </div>
          </div>
        </section>

        {/* KPI 3: Limpieza */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="serif text-lg font-semibold text-accent">Limpieza de pendientes</h2>
            <span className="text-xs text-mute">{kpis.cleanup.totalSwipes} revisadas</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <KpiCard label="Vistas" value={`${kpis.cleanup.rightRate}%`} sub="Pasan a vistas" />
            <KpiCard label="Se quedan" value={`${kpis.cleanup.upRate}%`} sub="Rescatadas" />
            <KpiCard label="Fuera" value={`${kpis.cleanup.leftRate}%`} sub="Descartadas" />
          </div>
        </section>
      </div>

      {confirmClear && (
        <Confirm
          title="¿Borrar todos los eventos?"
          text="Se restablecerán a cero los eventos locales de métricas. Las valoraciones y biblioteca no se verán afectadas."
          confirmLabel="Borrar eventos"
          onCancel={() => setConfirmClear(false)}
          onConfirm={handleClear}
        />
      )}

      {toast && <Toast message={toast} ms={1500} onDone={() => setToast(null)} />}
    </div>
  )
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-surface border border-line p-3">
      <div className="text-xs text-mute">{label}</div>
      <div className="serif text-xl font-bold text-white tabular-nums mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-mute/80 mt-0.5 truncate">{sub}</div>}
    </div>
  )
}
