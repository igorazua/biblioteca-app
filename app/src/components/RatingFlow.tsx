import { useRef, useState } from 'react'
import { getItem } from '../data/catalog'
import { useStore } from '../store/useStore'
import { Poster } from './Poster'
import { Sheet, StarRating } from './ui'
import { SHELF_LABEL, type Stars } from '../types'
import { haptic } from '../lib/haptics'

/**
 * Hoja de valoración tras marcar una obra como vista. Cerrarla de cualquier forma guarda lo que haya.
 * Las estrellas solo existen aquí, la primera vez (`withStars`); después solo se ve la nota 0-10.
 * Sin comparaciones: con estrellas queda colocada de forma provisional y Comparar afina el orden (§12.3).
 * Al añadir a mano, AddFlow encadena después los duelos de colocación (PlaceFlow, §13.1).
 */
export function RatingFlow({ itemId, onDone, withStars }: { itemId: string; onDone: (msg?: string) => void; withStars?: boolean }) {
  const item = getItem(itemId)!
  const entry = useStore((s) => s.entries[itemId])
  const rate = useStore((s) => s.rate)
  const placeProvisional = useStore((s) => s.placeProvisional)
  const setSettings = useStore((s) => s.setSettings)
  const [never, setNever] = useState(false)
  const stars0 = withStars ?? !entry?.stars
  const [stars, setStars] = useState<number>(entry?.stars ?? 0)
  const [comment, setComment] = useState(entry?.comment ?? '')
  const saved = useRef(false)
  const label = SHELF_LABEL[item.type]

  const finish = () => {
    if (saved.current) return
    saved.current = true
    if (never) setSettings({ rateOnSwipe: false })
    if (stars0) {
      rate(itemId, { stars: (stars || null) as Stars | null, comment })
      if (stars && !entry?.ranked) placeProvisional(itemId)
    } else rate(itemId, { comment })
    if (stars || comment) haptic('success')
    onDone('Guardada ✓')
  }

  return (
    <Sheet label="Valorar" onClose={finish} height={stars0 ? '46%' : '36%'}>
      <div className="flex gap-3 items-center">
        <Poster item={item} className="w-14 h-20 rounded-xl shrink-0" />
        <div className="min-w-0">
          <div className="text-xs text-mute uppercase tracking-wide">{label.actionPast}</div>
          <div className="serif text-xl font-semibold leading-tight line-clamp-2">{item.title}</div>
        </div>
      </div>
      {stars0 && (
        <div className="flex justify-center mt-3">
          <StarRating value={stars} onChange={setStars} />
        </div>
      )}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="¿Qué significó para ti? (opcional)"
        className="mt-2 w-full bg-surface2 border border-line rounded-2xl px-4 py-3 text-[15px] resize-none placeholder:text-mute/70 focus:outline-none focus:border-accent"
      />
      {stars0 && (
        <label className="flex items-center gap-3 mt-2 min-h-[40px] text-sm text-mute">
          <input type="checkbox" checked={never} onChange={(e) => setNever(e.target.checked)} className="w-5 h-5 accent-[#F5B544]" />
          No preguntar más al guardar (se reactiva en Perfil)
        </label>
      )}
      <button onClick={finish} className="mt-3 min-h-[50px] rounded-2xl bg-accent text-accent-ink font-semibold text-base active:scale-[0.98] transition-transform">
        Guardar
      </button>
      <div className="text-center text-[11px] text-mute mt-2">Desliza hacia abajo para cerrar: se guarda lo que haya</div>
    </Sheet>
  )
}

/** Hoja de comentario de Comparar: como la de valoración pero sin estrellas, con «No preguntar más». */
export function CommentSheet({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const item = getItem(itemId)!
  const addComment = useStore((s) => s.addComment)
  const setSettings = useStore((s) => s.setSettings)
  const [comment, setComment] = useState(useStore.getState().entries[itemId]?.comment ?? '')
  const [never, setNever] = useState(false)
  const done = useRef(false)
  const finish = () => {
    if (done.current) return
    done.current = true
    if (comment.trim()) addComment(itemId, comment)
    if (never) setSettings({ commentBoxInPairs: false })
    onClose()
  }
  return (
    <Sheet label="Comentario" onClose={finish} height="34%">
      <h3 className="serif text-xl font-semibold leading-tight">¿Algo que decir de <i>{item.title}</i>?</h3>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Tu comentario (opcional)"
        className="mt-3 w-full bg-surface2 border border-line rounded-2xl px-4 py-3 text-[15px] resize-none placeholder:text-mute/70 focus:outline-none focus:border-accent"
      />
      <label className="flex items-center gap-3 mt-3 min-h-[44px] text-sm text-mute">
        <input type="checkbox" checked={never} onChange={(e) => setNever(e.target.checked)} className="w-5 h-5 accent-[#F5B544]" />
        No preguntar más
      </label>
      <button onClick={finish} className="mt-1 min-h-[50px] rounded-2xl bg-accent text-accent-ink font-semibold">Guardar</button>
    </Sheet>
  )
}
