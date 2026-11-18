import { Link, Navigate, useParams } from 'react-router-dom'
import { getItem, SHELF_LABEL, type Item, type ShelfType } from '@biblioteca/core'
import { posterShape } from '@biblioteca/core/src/lib/posterShape'
import { useMyShelves } from '../lib/myShelves'
import { useCompareOverview } from '../lib/useCompareOverview'
import { Poster } from '../components/Poster'
import { Icon } from '../components/Icon'
import { SHELF_TINT, isShelf, titleOf, useCatalogFor, useShelfData } from './data'
import { RankAccordion } from './RankAccordion'

/**
 * Estantería / ranking de una categoría. Arriba, tu ranking en un acordeón vertical (la n.º 1 ancha a la izquierda; al
 * pasar el ratón se expande otra). Debajo, el ranking entero en columnas de cartelera: puesto, carátula, título y año.
 */
export function ShelfRank() {
  const { type } = useParams()
  if (!isShelf(type)) return <Navigate to="/nuevo" replace />
  return <ShelfView key={type} shelf={type} />
}

function ShelfView({ shelf }: { shelf: ShelfType }) {
  useCatalogFor([shelf])
  const data = useShelfData(shelf)
  const order = useMyShelves()
  const overview = useCompareOverview()
  const label = SHELF_LABEL[shelf]
  const pct = overview.shelves[shelf]?.ordenado ?? 0

  const ranked = data.ranked
  const isRanked = ranked.length > 0
  // sin ranking todavía: las vistas sin ordenar, sin puestos (no hay n.º 1 que enseñar)
  const accIds = isRanked ? ranked : data.unranked
  const square = posterShape(shelf) === 'square'

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden no-scrollbar">
      <section className="relative h-screen min-h-[640px] flex flex-col px-10 pt-22 pb-8" aria-label={`Tu ranking de ${label.plural.toLowerCase()}`}>
        <div className="flex items-end justify-between gap-8">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-x-5 gap-y-1" role="tablist" aria-label="Estantería">
              {order.map((s) => (
                <Link key={s} to={`/nuevo/estanteria/${s}`} role="tab" aria-selected={s === shelf} className={`display text-[24px] leading-none transition-colors ${s === shelf ? 'text-ink' : 'text-ink/35 hover:text-ink/70'}`}>
                  {SHELF_LABEL[s].plural}
                </Link>
              ))}
            </div>
            <h1 className="display text-[clamp(64px,6.4vw,128px)] leading-[0.8] text-ink mt-4">{label.plural}</h1>
            <p className="text-[16px] text-ink/80 mt-3 tabular-nums">
              {data.seen} {label.seen} · <span style={{ color: SHELF_TINT[shelf] }}>{pct} % ordenado</span>
              {data.pending.length > 0 && ` · ${data.pending.length} pendientes`}
              {!isRanked && data.unranked.length > 0 && ' · aún sin ordenar: haz duelos para ver tu top de verdad'}
            </p>
          </div>
          <div className="flex gap-3 shrink-0 pb-1">
            {data.seen >= 2 && (
              <Link to={`/nuevo/duelos/${shelf}`} className="h-12 px-6 rounded-full bg-accent text-accent-ink font-semibold flex items-center gap-2 hover:brightness-110 transition-[filter]">
                Seguir ordenando <Icon name="chevron" size={15} strokeWidth={2.6} />
              </Link>
            )}
          </div>
        </div>

        <div className="relative flex-1 min-h-0 mt-6">
          {accIds.length > 0 ? (
            <RankAccordion ids={accIds} shelf={shelf} ranked={isRanked} label={`Tu ranking de ${label.plural.toLowerCase()}`} />
          ) : (
            <div className="h-full flex flex-col justify-center">
              <p className="text-[18px] text-ink">Esta estantería está vacía.</p>
              <Link to={`/nuevo/descubrir/${shelf}`} className="mt-5 self-start h-12 px-6 rounded-full bg-accent text-accent-ink font-semibold inline-flex items-center">Descubrir {label.plural.toLowerCase()}</Link>
            </div>
          )}
        </div>
      </section>

      {/* el ranking entero, en columnas de cartelera */}
      {ranked.length > 0 && (
        <section className="px-10 pt-10" aria-labelledby="h-all">
          <h2 id="h-all" className="display text-[clamp(48px,5vw,88px)] leading-[0.9] text-ink">Todo tu ranking</h2>
          <ol className="mt-10 columns-3 2xl:columns-4 gap-x-14">
            {ranked.map((id, i) => {
              const it = getItem(id)
              return it ? <BillRow key={id} item={it} pos={i + 1} /> : null
            })}
          </ol>
        </section>
      )}

      {data.unranked.length > 0 && (
        <section className="px-10 pt-20" aria-labelledby="h-new">
          <div className="flex items-end justify-between gap-6">
            <h2 id="h-new" className="display text-[clamp(40px,4vw,72px)] leading-[0.9] text-ink">Esperan su sitio · {data.unranked.length}</h2>
            {data.seen >= 2 && <Link to={`/nuevo/duelos/${shelf}`} className="h-12 px-6 rounded-full bg-surface2 text-ink font-semibold flex items-center hover:bg-line transition-colors shrink-0">Colocarlas con duelos</Link>}
          </div>
          <div className="mt-8 flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {data.unranked.map((id) => {
              const it = getItem(id)
              return it ? (
                <Link key={id} to={`/i/${id}`} className="shrink-0 w-[140px] group">
                  <div className={`relative w-full ${square ? 'aspect-square' : 'aspect-[2/3]'} overflow-hidden`}>
                    <Poster item={it} showTitle className="absolute inset-0 w-full h-full transition-transform duration-300 group-hover:scale-[1.04]" />
                  </div>
                  <div className="text-[14px] font-semibold text-ink mt-2 line-clamp-2">{titleOf(it)}</div>
                  <div className="text-[13px] text-mute">{it.year}</div>
                </Link>
              ) : null
            })}
          </div>
        </section>
      )}
      <div className="h-24" />
    </div>
  )
}

function BillRow({ item, pos }: { item: Item; pos: number }) {
  const square = posterShape(item.type) === 'square'
  return (
    <li className="break-inside-avoid">
      <Link
        to={`/i/${item.id}`}
        className="group flex items-center gap-4 py-2 pr-2 -ml-2 pl-2 rounded-lg hover:bg-surface transition-colors"
      >
        <span className={`display w-14 shrink-0 text-right text-[40px] leading-none tabular-nums ${pos === 1 ? 'text-accent' : 'text-ink/85'}`}>{pos}</span>
        <Poster item={item} showTitle={false} className={`w-11 ${square ? 'h-11' : 'h-[66px]'} shrink-0 object-cover`} />
        <span className="min-w-0">
          <span className="block text-[16px] font-semibold text-ink truncate group-hover:text-white">{titleOf(item)}</span>
          <span className="block text-[14px] text-mute">{item.year}{item.creator ? ` · ${item.creator}` : ''}</span>
        </span>
      </Link>
    </li>
  )
}
