import { useEffect, useState } from 'react'
import { getItem } from '../data/catalog'
import { useStore, starsOfEntries } from '../store/useStore'
import { answerPlacement, finishPlacement, placementOpponent, startPlacement, type Placement } from '../lib/ranking'
import { SHELF_LABEL } from '../types'
import { Portal } from './ui'
import { Poster } from './Poster'
import { SwipePair, type Side } from './SwipePair'

const sideOf = (id: string): Side => {
  const it = getItem(id)!
  return { key: id, title: it.title, subtitle: `${it.year} · ${it.creator}`, bg: <Poster item={it} showTitle={false} className="absolute inset-0 w-full h-full" /> }
}

/**
 * Colocación por duelos (§13.1): solo al añadir una obra vista a mano. 2-4 duelos (búsqueda binaria dentro de su
 * franja de estrellas, o en toda la estantería si no tiene estrellas). Sin comentario: ya se pidió en la hoja.
 * Si no hay con quién comparar, termina al instante. Al acabar llama a `onDone('Guardada ✓')`.
 */
export function PlaceFlow({ itemId, onDone }: { itemId: string; onDone: (msg?: string) => void }) {
  const item = getItem(itemId)!
  const [p, setP] = useState<Placement | null>(null)

  useEffect(() => {
    const st = useStore.getState()
    const ranking = st.rankings[item.type] ?? []
    const base = ranking.filter((x) => x !== itemId)
    const stars = st.entries[itemId]?.stars
    if (base.length < 2) { onDone('Guardada ✓'); return }
    const start = startPlacement(ranking, starsOfEntries(st.entries), itemId, stars ?? undefined)
    if (start.done) { st.applyRanking(item.type, finishPlacement(start), itemId); onDone('Guardada ✓'); return }
    setP(start)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  if (!p) return null
  const opp = placementOpponent(p)
  if (!opp) return null
  // alternar el lado de la obra nueva para que no siempre esté arriba
  const newOnTop = p.comparisons % 2 === 0

  const onChoose = (w: 'a' | 'b') => {
    const won = (w === 'a') === newOnTop
    const next = answerPlacement(p, won)
    if (next.done) {
      useStore.getState().applyRanking(item.type, finishPlacement(next), itemId)
      onDone('Guardada ✓')
    } else setP(next)
  }

  return (
    <Portal>
      <div className="absolute inset-0 z-40 bg-bg flex flex-col" role="dialog" aria-label="Colocar en tu ranking">
        <div className="safe-top px-5 pb-3 shrink-0 text-center">
          {/* la pregunta la pone el propio duelo («¿Cuál te gustó más?»): aquí solo el contexto */}
          <div className="text-[11px] text-accent font-semibold uppercase tracking-[0.18em]">Colocando en tus {SHELF_LABEL[item.type].plural.toLowerCase()} · {p.comparisons + 1}</div>
        </div>
        <div className="flex-1 min-h-0 px-4 pb-6 flex flex-col">
          <SwipePair
            left={sideOf(newOnTop ? itemId : opp)}
            right={sideOf(newOnTop ? opp : itemId)}
            onChoose={onChoose}
            kind="rank"
          />
        </div>
      </div>
    </Portal>
  )
}
