import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { getItem } from '../data/catalog'
import { useStore, starsOfEntries } from '../store/useStore'
import { SHELVES, SHELF_LABEL, type ShelfType, type Item } from '../types'
import { useCompareOverview, type ShelfOverview } from '../lib/compareOverview'
import { planNextDuel, type PlannedDuel } from '../lib/ranking'
import { ScreenTitle } from '../components/ScreenTitle'
import { Button } from '../components/Button'
import { Poster } from '../components/Poster'
import { Icon } from '../components/Icon'

export type CompareHomeDesign = 1 | 2 | 3 | 4
export type CompareOrderMode = 'pending' | 'recent' | 'fixed'

const HOME_KEY = 'biblioteca-compare-home'
const ORDER_KEY = 'biblioteca-compare-order'
const INTRO_SEEN_KEY = 'biblioteca-compare-intro-seen'

export function CompareHome() {
  const nav = useNavigate()
  const overview = useCompareOverview()
  const entries = useStore((s) => s.entries)
  const rankings = useStore((s) => s.rankings)
  const duels = useStore((s) => s.duels)

  // Selector de diseño de portada (1, 2, 3 o 4; defecto 2)
  const [design, setDesign] = useState<CompareHomeDesign>(() => {
    try {
      const v = Number(localStorage.getItem(HOME_KEY))
      if (v === 1 || v === 2 || v === 3 || v === 4) return v
    } catch {
      /* ok */
    }
    return 2
  })

  const updateDesign = (d: CompareHomeDesign) => {
    setDesign(d)
    try {
      localStorage.setItem(HOME_KEY, String(d))
    } catch {
      /* ok */
    }
  }

  // Orden de estanterías ('pending' | 'recent' | 'fixed'; defecto 'pending')
  const [order, setOrder] = useState<CompareOrderMode>(() => {
    try {
      const v = localStorage.getItem(ORDER_KEY) as CompareOrderMode
      if (v === 'pending' || v === 'recent' || v === 'fixed') return v
    } catch {
      /* ok */
    }
    return 'pending'
  })

  const updateOrder = (o: CompareOrderMode) => {
    setOrder(o)
    try {
      localStorage.setItem(ORDER_KEY, o)
    } catch {
      /* ok */
    }
  }

  // Estanterías ordenadas según la pestaña activa
  const sortedShelves = useMemo<ShelfType[]>(() => {
    const list = [...SHELVES]
    if (order === 'pending') {
      return list.sort((a, b) => {
        const oA = overview.shelves[a]
        const oB = overview.shelves[b]
        if (oB.sinOrdenar !== oA.sinOrdenar) return oB.sinOrdenar - oA.sinOrdenar
        return oA.pulido - oB.pulido
      })
    }
    if (order === 'recent') {
      return list.sort((a, b) => {
        const oA = overview.shelves[a]
        const oB = overview.shelves[b]
        // de la que llevas más tiempo sin comparar a la última (ascendente)
        return oA.ultima - oB.ultima
      })
    }
    // 'fixed': Pelis, Series, Libros, Artistas, Juegos
    return list
  }, [overview, order])

  // Estantería recomendada (la primera del orden que esté disponible, o la primera de la lista)
  const defaultRecShelf = useMemo(() => {
    const available = sortedShelves.find((s) => overview.shelves[s]?.disponible)
    return available ?? sortedShelves[0]
  }, [sortedShelves, overview])

  const [selectedShelf, setSelectedShelf] = useState<ShelfType | null>(null)
  const currentShelf = selectedShelf && sortedShelves.includes(selectedShelf) ? selectedShelf : defaultRecShelf

  // Próximo duelo real para la estantería actual (Diseño 2, sin consumirlo)
  const nextDuel = useMemo<PlannedDuel | null>(() => {
    const s = currentShelf
    const rk = rankings[s] ?? []
    const unranked = Object.values(entries)
      .filter((e) => e.status === 'seen' && (!e.ranked || e.provisional) && (e.shelf ?? getItem(e.itemId)?.type) === s)
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .map((e) => ({ itemId: e.itemId, stars: e.stars }))

    const counts: Record<string, number> = {}
    for (const e of Object.values(entries)) {
      if (e.cmp) counts[e.itemId] = e.cmp
    }

    return planNextDuel({
      shelf: s,
      ranking: rk,
      unranked,
      duels: duels[s] ?? {},
      cmp: counts,
      sessionIndex: 0,
      starsOf: starsOfEntries(entries),
    })
  }, [currentShelf, rankings, entries, duels])

  const itemA = nextDuel ? getItem(nextDuel.a) ?? null : null
  const itemB = nextDuel ? getItem(nextDuel.b) ?? null : null

  // Pista de introducción vista por primera vez
  const [hasSeenIntro, setHasSeenIntro] = useState(() => {
    try {
      return Boolean(localStorage.getItem(INTRO_SEEN_KEY))
    } catch {
      return false
    }
  })

  const onStartSession = (shelf: ShelfType) => {
    if (!hasSeenIntro) {
      setHasSeenIntro(true)
      try {
        localStorage.setItem(INTRO_SEEN_KEY, '1')
      } catch {
        /* ok */
      }
    }
    nav(`/comparar/${shelf}`)
  }

  return (
    <div className="h-full flex flex-col relative bg-bg select-none">
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-20">
        {design === 1 && (
          <Design1Revista
            sortedShelves={sortedShelves}
            overview={overview.shelves}
            order={order}
            onOrderChange={updateOrder}
            onSelectShelf={(s) => nav(`/comparar/${s}`)}
            onGoDiscover={() => nav('/descubrir')}
          />
        )}

        {design === 2 && (
          <Design2ProximoDuelo
            shelf={currentShelf}
            sortedShelves={sortedShelves}
            overview={overview.shelves}
            nextDuel={nextDuel}
            itemA={itemA}
            itemB={itemB}
            hasSeenIntro={hasSeenIntro}
            onSelectOtherShelf={(s) => setSelectedShelf(s)}
            onStartSession={() => onStartSession(currentShelf)}
          />
        )}

        {design === 3 && (
          <Design3Lomos
            sortedShelves={sortedShelves}
            overview={overview.shelves}
            order={order}
            onOrderChange={updateOrder}
            onSelectShelf={(s) => nav(`/comparar/${s}`)}
            onGoDiscover={() => nav('/descubrir')}
          />
        )}

        {design === 4 && (
          <Design4Mapa
            sortedShelves={sortedShelves}
            overview={overview.shelves}
            total={overview.total}
            order={order}
            onOrderChange={updateOrder}
            onSelectShelf={(s) => nav(`/comparar/${s}`)}
            onGoDiscover={() => nav('/descubrir')}
          />
        )}
      </div>

      <CompareHomePicker design={design} onSelectDesign={updateDesign} />
    </div>
  )
}

/* ========================================================================== */
/* Pestañas de orden: Más por ordenar · Recientes · Fijo                      */
/* ========================================================================== */

interface OrderTabsProps {
  order: CompareOrderMode
  onChange: (o: CompareOrderMode) => void
}

function CompareOrderTabs({ order, onChange }: OrderTabsProps) {
  const tabs: { id: CompareOrderMode; label: string }[] = [
    { id: 'pending', label: 'Más por ordenar' },
    { id: 'recent', label: 'Recientes' },
    { id: 'fixed', label: 'Fijo' },
  ]

  return (
    <div className="flex gap-5 items-center">
      {tabs.map((t) => {
        const active = order === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`text-[13px] pb-1.5 transition-colors relative outline-none ${
              active ? 'text-ink font-semibold' : 'text-mute hover:text-ink font-medium'
            }`}
          >
            {t.label}
            {active && <span className="absolute bottom-0 inset-x-0 h-[1.5px] bg-accent rounded-full" />}
          </button>
        )
      })}
    </div>
  )
}

/* ========================================================================== */
/* Diseño 1 · «Índice de revista»                                             */
/* ========================================================================== */

function Design1Revista({
  sortedShelves,
  overview,
  order,
  onOrderChange,
  onSelectShelf,
  onGoDiscover,
}: {
  sortedShelves: ShelfType[]
  overview: Record<ShelfType, ShelfOverview>
  order: CompareOrderMode
  onOrderChange: (o: CompareOrderMode) => void
  onSelectShelf: (s: ShelfType) => void
  onGoDiscover: () => void
}) {
  return (
    <div className="pt-2">
      <ScreenTitle label="COMPARAR" />

      <div className="mt-1">
        <h1 className="text-display text-ink leading-tight">
          Ordena lo que
          <br />
          has visto
        </h1>
        <p className="text-body text-mute max-w-[270px] mt-2">
          Dos obras, eliges la que más te gustó y tu ranking se ordena solo. Siete duelos, un minuto.
        </p>
      </div>

      <div className="mt-6 border-b border-line pb-2.5">
        <CompareOrderTabs order={order} onChange={onOrderChange} />
      </div>

      <div className="divide-y divide-line">
        {sortedShelves.map((s, idx) => {
          const info = overview[s]
          if (!info) return null
          const isFirst = idx === 0
          const isAvailable = info.disponible
          const isComplete = info.completo

          let displayNum = String(info.sinOrdenar)
          let metaText = `sin ordenar · ${info.enRanking} en tu ranking`

          if (info.sinOrdenar === 0) {
            if (isComplete) {
              displayNum = '✓'
              metaText = `todo ordenado · ${info.enRanking} en tu ranking`
            } else {
              displayNum = `${info.pulido}%`
              metaText = `pulido · ${info.enRanking} en tu ranking`
            }
          }

          const onClick = () => {
            if (!isAvailable) {
              onGoDiscover()
            } else if (!isComplete) {
              onSelectShelf(s)
            }
          }

          return (
            <div
              key={s}
              onClick={onClick}
              role="button"
              tabIndex={0}
              className={`min-h-[64px] py-4 flex items-center justify-between gap-3 cursor-pointer select-none active:opacity-75 transition-opacity ${
                !isAvailable ? 'opacity-45' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-[52px] shrink-0 serif font-medium text-[38px] leading-none tabular-nums ${
                    isFirst && isAvailable ? 'text-accent' : 'text-ink'
                  }`}
                >
                  {displayNum}
                </span>

                <div className="min-w-0 flex flex-col">
                  <span className="serif font-medium text-[18px] text-ink leading-snug">
                    {SHELF_LABEL[s].plural}
                  </span>
                  <span className="text-meta text-mute leading-snug">
                    {!isAvailable ? 'Marca alguna en Descubrir' : metaText}
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex items-center">
                {!isAvailable ? (
                  <span className="text-meta text-mute text-right">Descubrir</span>
                ) : isComplete ? (
                  <span className="text-meta text-mute">todo ordenado</span>
                ) : (
                  <Icon name="chevron" size={18} className="text-mute" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ========================================================================== */
/* Diseño 2 · «El próximo duelo» (por defecto)                               */
/* ========================================================================== */

function Design2ProximoDuelo({
  shelf,
  sortedShelves,
  overview,
  nextDuel,
  itemA,
  itemB,
  hasSeenIntro,
  onSelectOtherShelf,
  onStartSession,
}: {
  shelf: ShelfType
  sortedShelves: ShelfType[]
  overview: Record<ShelfType, ShelfOverview>
  nextDuel: PlannedDuel | null
  itemA: Item | null
  itemB: Item | null
  hasSeenIntro: boolean
  onSelectOtherShelf: (s: ShelfType) => void
  onStartSession: () => void
}) {
  const shelfInfo = overview[shelf]
  const sinOrdenar = shelfInfo?.sinOrdenar ?? 0

  const otherShelves = sortedShelves.filter((s) => s !== shelf && overview[s]?.disponible)

  return (
    <div className="pt-2 flex flex-col">
      <ScreenTitle label={`COMPARAR · ${SHELF_LABEL[shelf].plural.toUpperCase()}`} />

      <div className="mt-1">
        <h1 className="text-display text-ink leading-tight">
          {sinOrdenar > 0
            ? `${sinOrdenar} ${SHELF_LABEL[shelf].plural.toLowerCase()} esperan su sitio`
            : `Seguimos puliendo tus ${SHELF_LABEL[shelf].plural.toLowerCase()}`}
        </h1>
      </div>

      {/* Duelo de muestra real */}
      <div className="mt-6 flex flex-col items-center">
        {nextDuel && itemA && itemB ? (
          <>
            <div className="relative flex items-center justify-center py-2">
              {/* Póster izquierdo girado -5° */}
              <div
                className="w-[118px] h-[177px] rounded-[12px] overflow-hidden border border-line shadow-md -rotate-[5deg] shrink-0 relative z-0 transition-transform"
                style={{ transformOrigin: 'center center' }}
              >
                <Poster item={itemA} className="w-full h-full object-cover" />
              </div>

              {/* Círculo central con 'o' */}
              <div className="w-[34px] h-[34px] rounded-full bg-bg border border-line flex items-center justify-center absolute z-10 shadow-sm pointer-events-none">
                <span className="serif italic text-[14px] text-mute font-medium leading-none">o</span>
              </div>

              {/* Póster derecho girado +5°, solapado 14px */}
              <div
                className="w-[118px] h-[177px] rounded-[12px] overflow-hidden border border-line shadow-md rotate-[5deg] shrink-0 relative z-0 -ml-[14px] transition-transform"
                style={{ transformOrigin: 'center center' }}
              >
                <Poster item={itemB} className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Títulos de las dos obras a 14px */}
            <div className="mt-[14px] text-center px-4 max-w-sm">
              <span className="serif italic text-[15px] text-ink font-medium">{itemA.title}</span>
              <span className="text-meta text-mute px-1.5 font-normal">o</span>
              <span className="serif italic text-[15px] text-ink font-medium">{itemB.title}</span>
            </div>
          </>
        ) : (
          <div className="w-full py-12 flex flex-col items-center text-center justify-center border border-line rounded-2xl bg-surface/50 px-4">
            <p className="text-title text-ink">
              {shelfInfo?.completo
                ? `Tu ranking de ${SHELF_LABEL[shelf].plural.toLowerCase()} está completo`
                : `Todo al día en ${SHELF_LABEL[shelf].plural.toLowerCase()}`}
            </p>
            <p className="text-meta text-mute mt-1">Elige otra estantería abajo o añade nuevas obras en Descubrir.</p>
          </div>
        )}

        {/* Botón principal a 20px */}
        <div className="w-full mt-5">
          <Button
            variant="primary"
            onClick={onStartSession}
            disabled={!nextDuel}
            className="w-full justify-center text-center"
          >
            Empezar · 7 duelos
          </Button>

          {!hasSeenIntro && (
            <p className="text-meta text-mute text-center mt-2.5">
              Elige la que más te gustó. Tu ranking se ordena solo.
            </p>
          )}
        </div>
      </div>

      {/* Otras estanterías a 24px */}
      {otherShelves.length > 0 && (
        <div className="mt-6 pt-2">
          <span className="text-label text-mute uppercase tracking-wider block">O ELIGE OTRA ESTANTERÍA</span>
          <div className="flex flex-wrap gap-2 mt-2.5">
            {otherShelves.map((s) => {
              const inf = overview[s]
              const label = SHELF_LABEL[s].plural
              const badge = inf?.completo ? '✓' : String(inf?.sinOrdenar ?? 0)

              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSelectOtherShelf(s)}
                  className="rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium text-ink bg-surface flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span>{label}</span>
                  <span className="text-mute font-normal">{badge}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ========================================================================== */
/* Diseño 3 · «Estanterías con lomos»                                         */
/* ========================================================================== */

function Design3Lomos({
  sortedShelves,
  overview,
  order,
  onOrderChange,
  onSelectShelf,
  onGoDiscover,
}: {
  sortedShelves: ShelfType[]
  overview: Record<ShelfType, ShelfOverview>
  order: CompareOrderMode
  onOrderChange: (o: CompareOrderMode) => void
  onSelectShelf: (s: ShelfType) => void
  onGoDiscover: () => void
}) {
  const entries = useStore((s) => s.entries)
  const rankings = useStore((s) => s.rankings)

  return (
    <div className="pt-2">
      <ScreenTitle label="COMPARAR" />

      <div className="mt-1">
        <h1 className="text-display text-ink leading-tight">¿Qué ordenamos hoy?</h1>
        <p className="text-meta text-mute mt-1">Elige una estantería. Siete duelos, un minuto.</p>
      </div>

      <div className="mt-5 border-b border-line pb-2.5">
        <CompareOrderTabs order={order} onChange={onOrderChange} />
      </div>

      <div className="mt-5 space-y-5">
        {sortedShelves.map((s) => {
          const info = overview[s]
          if (!info) return null
          const isAvailable = info.disponible
          const isComplete = info.completo

          // Obras para los lomos: primero sin ordenar, si no hay las primeras del ranking
          const shelfEntries = Object.values(entries).filter(
            (e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === s,
          )
          const unrankedList = shelfEntries.filter((e) => !e.ranked || e.provisional)
          const sourceList = unrankedList.length > 0 ? unrankedList : (rankings[s] ?? []).map((id) => entries[id]).filter(Boolean)
          const displayItems = sourceList.map((e) => getItem(e.itemId)).filter((it): it is Item => it !== null)

          // Cabecera derecha
          let rightText = `${info.sinOrdenar} sin ordenar`
          if (info.sinOrdenar === 0) {
            rightText = isComplete ? 'todo ordenado' : `${info.pulido} % pulido`
          }
          if (!isAvailable) {
            rightText = 'Marca alguna en Descubrir'
          }

          const onClick = () => {
            if (!isAvailable) onGoDiscover()
            else onSelectShelf(s)
          }

          const maxCards = 5
          const cardsToShow = displayItems.slice(0, maxCards)
          const extraCount = displayItems.length - maxCards

          return (
            <div
              key={s}
              onClick={onClick}
              role="button"
              tabIndex={0}
              className={`p-3.5 rounded-2xl bg-surface border border-line cursor-pointer select-none active:opacity-80 transition-opacity ${
                !isAvailable ? 'opacity-45' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="serif font-medium text-[18px] text-ink">{SHELF_LABEL[s].plural}</span>
                <span className="text-meta text-mute">{rightText}</span>
              </div>

              {cardsToShow.length > 0 && (
                <div className="mt-[9px] flex items-center gap-1.5 overflow-hidden">
                  {cardsToShow.map((it) => (
                    <div
                      key={it.id}
                      className="w-[46px] h-[69px] rounded-md overflow-hidden border border-line shrink-0 bg-surface2"
                    >
                      <Poster item={it} className="w-full h-full object-cover" />
                    </div>
                  ))}

                  {extraCount > 0 && (
                    <div className="w-[46px] h-[69px] rounded-md bg-surface2 border border-line shrink-0 flex items-center justify-center">
                      <span className="text-meta text-mute font-medium">+{extraCount}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ========================================================================== */
/* Diseño 4 · «Mapa de tu ranking»                                            */
/* ========================================================================== */

function Design4Mapa({
  sortedShelves,
  overview,
  total,
  order,
  onOrderChange,
  onSelectShelf,
  onGoDiscover,
}: {
  sortedShelves: ShelfType[]
  overview: Record<ShelfType, ShelfOverview>
  total: number
  order: CompareOrderMode
  onOrderChange: (o: CompareOrderMode) => void
  onSelectShelf: (s: ShelfType) => void
  onGoDiscover: () => void
}) {
  const availableShelves = sortedShelves.filter((s) => overview[s]?.disponible)

  // Encontrar la estantería con más camino por recorrer (menor pulido efectivo con obras sin ordenar)
  const accentShelf = useMemo(() => {
    let bestShelf: ShelfType | null = null
    let minScore = Infinity

    for (const s of availableShelves) {
      const info = overview[s]
      if (!info || info.completo) continue
      const totalCount = info.enRanking + info.sinOrdenar
      const eff = totalCount > 0 ? (info.pulido * info.enRanking) / totalCount : 0
      if (eff < minScore) {
        minScore = eff
        bestShelf = s
      }
    }
    return bestShelf ?? availableShelves[0] ?? 'movie'
  }, [availableShelves, overview])

  return (
    <div className="pt-2">
      <ScreenTitle label="COMPARAR" />

      <div className="mt-1">
        <h1 className="text-display text-ink leading-tight">Tu ranking, al {total} %</h1>
        <p className="text-meta text-mute mt-1">Cada duelo coloca una obra en su sitio.</p>
      </div>

      <div className="mt-5 border-b border-line pb-2.5">
        <CompareOrderTabs order={order} onChange={onOrderChange} />
      </div>

      <div className="mt-5 space-y-[18px]">
        {availableShelves.map((s) => {
          const info = overview[s]
          if (!info) return null
          const totalShelf = info.enRanking + info.sinOrdenar
          const orderedAndPolished = Math.round((info.pulido / 100) * info.enRanking)
          const fillPct = totalShelf > 0 ? Math.round((info.pulido * info.enRanking) / totalShelf) : 0
          const isAccent = s === accentShelf
          const is100 = fillPct >= 100 || info.completo

          return (
            <div
              key={s}
              onClick={() => onSelectShelf(s)}
              role="button"
              tabIndex={0}
              className="cursor-pointer select-none active:opacity-75 transition-opacity"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="serif font-medium text-[17px] text-ink flex items-center gap-1.5">
                  {SHELF_LABEL[s].plural}
                  {is100 && <span className="text-mute font-normal text-sm">✓</span>}
                </span>
                <span className="text-meta text-mute">
                  {orderedAndPolished} de {totalShelf}
                </span>
              </div>

              <div className="mt-2 h-1.5 w-full rounded-full bg-surface2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isAccent && !is100 ? 'bg-accent' : 'bg-ink'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(fillPct, 3))}%` }}
                />
              </div>
            </div>
          )
        })}

        {availableShelves.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-mute text-body">Aún no hay estanterías disponibles para comparar.</p>
            <Button variant="secondary" onClick={onGoDiscover} className="mt-3">
              Descubrir obras
            </Button>
          </div>
        )}
      </div>

      {availableShelves.length > 0 && (
        <div className="mt-[26px]">
          <Button
            variant="primary"
            onClick={() => onSelectShelf(accentShelf)}
            className="w-full justify-center text-center"
          >
            Completar {SHELF_LABEL[accentShelf].plural}
          </Button>
        </div>
      )}
    </div>
  )
}

/* ========================================================================== */
/* Selector de pruebas: Portada n/4 ›                                         */
/* ========================================================================== */

function CompareHomePicker({
  design,
  onSelectDesign,
}: {
  design: CompareHomeDesign
  onSelectDesign: (d: CompareHomeDesign) => void
}) {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const designs: { id: CompareHomeDesign; name: string }[] = [
    { id: 1, name: '1 · Índice de revista' },
    { id: 2, name: '2 · El próximo duelo' },
    { id: 3, name: '3 · Estanterías con lomos' },
    { id: 4, name: '4 · Mapa de tu ranking' },
  ]

  return (
    <>
      {open && <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />}
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Selector de portada de Comparar"
            initial={reduce ? false : { opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 460, damping: 32 }}
            style={{ transformOrigin: 'bottom right' }}
            className="fixed bottom-20 right-4 z-40 rounded-2xl bg-surface2 border border-line shadow-2xl p-3 flex flex-col gap-2 min-w-[190px]"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-mute px-1">
              Portada de Comparar
            </span>
            <div className="flex flex-col gap-1">
              {designs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    onSelectDesign(d.id)
                    setOpen(false)
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-[13px] text-left transition-colors flex items-center justify-between ${
                    d.id === design
                      ? 'bg-accent text-accent-ink font-semibold'
                      : 'text-ink/80 hover:bg-surface active:scale-98'
                  }`}
                >
                  <span>{d.name}</span>
                  {d.id === design && <span>✓</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        aria-label="Probar otros diseños de la portada de Comparar"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 z-30 min-h-[30px] px-2.5 rounded-full bg-surface2/90 border border-line text-[11px] font-semibold text-ink/80 flex items-center gap-1 active:scale-95 shadow-md"
      >
        Portada {design}/4
        <span aria-hidden className={`transition-transform text-mute ${open ? 'rotate-90' : '-rotate-90'}`}>
          ›
        </span>
      </button>
    </>
  )
}
