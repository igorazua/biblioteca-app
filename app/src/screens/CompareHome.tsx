import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getItem } from '../data/catalog'
import { useStore, starsOfEntries } from '../store/useStore'
import { ACTIVE_SHELVES, SHELVES, SHELF_LABEL, type ShelfType, type Item } from '../types'
import { useCompareOverview, type ShelfOverview } from '../lib/compareOverview'
import { planNextDuel, type PlannedDuel } from '../lib/ranking'
import { ScreenTitle } from '../components/ScreenTitle'
import { Button } from '../components/Button'
import { Poster } from '../components/Poster'

const MAX_POSTERS_ROW = 5

function formatShelfNames(shelves: ShelfType[]): string {
  const names = shelves.map((s) => SHELF_LABEL[s].plural)
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} y ${names[1]}`
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}

/** Color del % ordenado: verde desde el 80 %, luego amarillo, naranja y rojo. */
export function pctColor(p: number): string {
  if (p >= 80) return '#3ec878'
  if (p >= 55) return '#e8c547'
  if (p >= 30) return '#f2913a'
  return '#ef4b4b'
}

export function CompareHome() {
  const nav = useNavigate()
  const overview = useCompareOverview()
  const entries = useStore((s) => s.entries)
  const rankings = useStore((s) => s.rankings)
  const duels = useStore((s) => s.duels)

  // Comparaciones por obra para el planificador
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const e of Object.values(entries)) {
      if (e.cmp) c[e.itemId] = e.cmp
    }
    return c
  }, [entries])

  // Estanterías disponibles ordenadas estrictamente por más sin ordenar y, si empatan, menor % ordenado (T19 §4.2.2)
  const availableShelves = useMemo(() => {
    return ACTIVE_SHELVES.filter((s) => overview.shelves[s]?.disponible).sort((a, b) => {
      const oA = overview.shelves[a]
      const oB = overview.shelves[b]
      if (oB.sinOrdenar !== oA.sinOrdenar) return oB.sinOrdenar - oA.sinOrdenar
      if (oA.ordenado !== oB.ordenado) return oA.ordenado - oB.ordenado
      return oA.pulido - oB.pulido
    })
  }, [overview])

  // Estanterías no disponibles (< 2 vistas)
  const unavailableShelves = useMemo(() => {
    return ACTIVE_SHELVES.filter((s) => !overview.shelves[s]?.disponible)
  }, [overview])

  // Estantería recomendada (la primera de las disponibles)
  const recShelf = availableShelves[0] as ShelfType | undefined
  const recOverview: ShelfOverview | undefined = recShelf ? overview.shelves[recShelf] : undefined

  // ¿Queda algo sin ordenar en alguna estantería?
  const totalSinOrdenar = useMemo(() => {
    return availableShelves.reduce((acc, s) => acc + (overview.shelves[s]?.sinOrdenar ?? 0), 0)
  }, [availableShelves, overview])

  // ¿Todas las estanterías disponibles están al 100 %?
  const allAt100 = useMemo(() => {
    if (availableShelves.length === 0) return false
    return availableShelves.every((s) => (overview.shelves[s]?.ordenado ?? 0) === 100)
  }, [availableShelves, overview])

  // Próximo duelo para la estantería recomendada (sin consumirlo)
  const nextDuel = useMemo<PlannedDuel | null>(() => {
    if (!recShelf) return null
    const rk = rankings[recShelf] ?? []
    const unranked = Object.values(entries)
      .filter((e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === recShelf && (!rk.includes(e.itemId) || Boolean(e.provisional)))
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .map((e) => ({ itemId: e.itemId, stars: e.stars }))

    return planNextDuel({
      shelf: recShelf,
      ranking: rk,
      unranked,
      duels: duels[recShelf] ?? {},
      cmp: counts,
      sessionIndex: 0,
      activePlacement: null,
      refineState: null,
      starsOf: starsOfEntries(entries),
    })
  }, [recShelf, rankings, entries, duels, counts])

  const pairItems = useMemo<{ a: Item; b: Item } | null>(() => {
    if (!nextDuel) return null
    const itA = getItem(nextDuel.a)
    const itB = getItem(nextDuel.b)
    if (!itA || !itB) return null
    return { a: itA, b: itB }
  }, [nextDuel])

  // Título y subtítulo de la cabecera (T19 §4.2.2)
  let title = '¡Duelos!'
  let subtitle: string | undefined = undefined

  if (availableShelves.length === 0) {
    title = 'Todo por empezar'
    subtitle = 'Marca obras como vistas en Descubrir para ordenarlas'
  } else if (recOverview && recOverview.sinOrdenar > 0) {
    title = `${recOverview.sinOrdenar} ${SHELF_LABEL[recShelf!].plural.toLowerCase()} esperan su sitio`
  } else if (totalSinOrdenar === 0) {
    if (allAt100) {
      title = 'Todo en su sitio'
      subtitle = 'Marca más en Descubrir y seguimos'
    } else {
      // Estantería de menor ordenado
      const minShelf = [...availableShelves].sort((a, b) => (overview.shelves[a]?.ordenado ?? 0) - (overview.shelves[b]?.ordenado ?? 0))[0]
      title = `Seguimos puliendo tus ${SHELF_LABEL[minShelf].plural.toLowerCase()}`
    }
  }

  // Otras estanterías disponibles (todas menos la recomendada)
  const otherShelves = useMemo(() => {
    return availableShelves.slice(1)
  }, [availableShelves])

  const handleStartDuel = () => {
    if (!recShelf) return
    nav(`/comparar/${recShelf}`, { state: { duel: nextDuel } })
  }

  return (
    <div className="h-full flex flex-col bg-bg">
      <ScreenTitle
        label="DUELOS"
        title={title}
        subtitle={subtitle}
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6">
        {/* 2. El próximo duelo (24 px bajo el título) */}
        {pairItems && recShelf ? (
          <div className="mt-6 flex flex-col items-center">
            {/* Dos cartas 118 x 177 (2:3, rounded-[10px], sin borde), solapadas 14 px y centradas */}
            <div className="relative flex items-center justify-center py-2">
              <div
                className="w-[118px] h-[177px] rounded-[10px] overflow-hidden shadow-lg -rotate-[5deg] shrink-0"
                style={{ transformOrigin: 'center center' }}
              >
                <Poster item={pairItems.a} showTitle={false} className="w-full h-full object-cover" />
              </div>
              <div
                className="w-[118px] h-[177px] rounded-[10px] overflow-hidden shadow-lg rotate-[5deg] -ml-[14px] shrink-0"
                style={{ transformOrigin: 'center center' }}
              >
                <Poster item={pairItems.b} showTitle={false} className="w-full h-full object-cover" />
              </div>
              {/* Círculo central de 34 px con «o» serif de 14 px */}
              <div
                className="absolute w-[34px] h-[34px] rounded-full bg-bg border border-line flex items-center justify-center shadow-md z-10"
                style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <span className="serif text-[14px] text-mute">o</span>
              </div>
            </div>

            {/* A 14 px: Título A o Título B */}
            <div className="serif text-[15px] text-center truncate max-w-full px-2 mt-[14px]">
              <span className="italic">{pairItems.a.title}</span>{' '}
              <span className="text-mute not-italic">o</span>{' '}
              <span className="italic">{pairItems.b.title}</span>
            </div>

            {/* A 20 px: Botón principal al ancho del contenido */}
            <Button
              variant="primary"
              className="w-full mt-5"
              onClick={handleStartDuel}
            >
              Empezar · 7 duelos
            </Button>
          </div>
        ) : allAt100 ? (
          <div className="mt-6 flex flex-col items-center text-center py-6">
            <Button
              variant="primary"
              className="w-full mt-2"
              onClick={() => nav('/descubrir')}
            >
              Ir a Descubrir
            </Button>
          </div>
        ) : null}

        {/* 3. Otras estanterías (32 px bajo el botón) */}
        {otherShelves.length > 0 && (
          <div className="mt-8">
            <div className="text-label text-mute">OTRAS ESTANTERÍAS</div>
            <div className="h-px bg-line mt-2.5" />

            <div className="flex flex-col gap-5 mt-5">
              {otherShelves.map((s, idx) => {
                const o = overview.shelves[s]
                const rk = rankings[s] ?? []
                const unranked = Object.values(entries).filter(
                  (e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === s && (!rk.includes(e.itemId) || Boolean(e.provisional)),
                )

                // Cartas a mostrar: sin ordenar si hay, o las del próximo duelo a pulir
                let posterItems: Item[] = unranked
                  .map((e) => getItem(e.itemId))
                  .filter(Boolean) as Item[]

                if (posterItems.length === 0) {
                  const pDuel = planNextDuel({
                    shelf: s,
                    ranking: rk,
                    unranked: [],
                    duels: duels[s] ?? {},
                    cmp: counts,
                  })
                  if (pDuel) {
                    posterItems = [getItem(pDuel.a), getItem(pDuel.b)].filter(Boolean) as Item[]
                  }
                }

                const visiblePosters = posterItems.slice(0, MAX_POSTERS_ROW)
                const remaining = posterItems.length - MAX_POSTERS_ROW

                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => nav(`/comparar/${s}`)}
                    className="w-full text-left transition-opacity hover:opacity-90 active:scale-[0.99]"
                  >
                    {/* Fila del nombre (alto 24) */}
                    <div className="h-6 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="serif text-[18px] text-ink leading-none">{SHELF_LABEL[s].plural}</span>
                        <span className="text-meta font-semibold tabular-nums" style={{ color: pctColor(o.ordenado) }}>
                          {o.ordenado} %
                        </span>
                      </div>
                      <span className="text-meta text-mute">
                        {o.sinOrdenar > 0 ? `${o.sinOrdenar} ${o.sinOrdenar === 1 ? 'nueva' : 'nuevas'}` : 'todo en su sitio'}
                      </span>
                    </div>

                    {/* Barra fina de 2 px a 8 px, relleno ink o accent si es la que más falta */}
                    <div className="mt-2 h-0.5 w-full bg-surface2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, o.ordenado))}%`, background: pctColor(o.ordenado) }}
                      />
                    </div>

                    {/* Fila de pósteres a 10 px: 46 x 69, rounded-md, separados 6 px */}
                    {posterItems.length > 0 && (
                      <div className="mt-2.5 flex items-center gap-1.5 overflow-hidden">
                        {visiblePosters.map((it) => (
                          <div key={it.id} className="w-[46px] h-[69px] rounded-md overflow-hidden shrink-0 bg-surface2">
                            <Poster item={it} showTitle={false} className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {remaining > 0 && (
                          <div className="w-[46px] h-[69px] rounded-md bg-surface2 border border-line flex items-center justify-center text-meta text-mute shrink-0">
                            +{remaining}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Estanterías no disponibles (menos de 2 vistas) */}
        {unavailableShelves.length > 0 && (
          <div className="mt-8 text-meta text-mute text-center">
            {formatShelfNames(unavailableShelves)}:{' '}
            <Link to="/descubrir" className="underline hover:text-ink">
              marca alguna en Descubrir para empezar
            </Link>
          </div>
        )}

        {/* 4. Final: 24 px de aire sobre la barra inferior */}
        <div className="h-6" />
      </div>
    </div>
  )
}
