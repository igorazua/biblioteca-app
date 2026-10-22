import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getItem } from '../data/catalog'
import { useStore } from '../store/useStore'
import { SHELVES, SHELF_LABEL, type ShelfType } from '../types'
import { ItemRow } from '../components/ItemRow'
import { Chip, Toast } from '../components/ui'
import { AddFlow } from '../components/AddFlow'
import { CleanupFlow } from '../components/CleanupFlow'
import { Icon } from '../components/Icon'
import { ScreenTitle } from '../components/ScreenTitle'
import { Button } from '../components/Button'
import { AnimatePresence } from 'framer-motion'
import { WIZARD_PATH } from '../config'

type Seg = 'ord' | 'pend'

export function Shelf() {
  const { type } = useParams()
  const nav = useNavigate()
  const entries = useStore((s) => s.entries)
  const ranking = useStore((s) => (type && (SHELVES as readonly string[]).includes(type) ? (s.rankings[type as ShelfType] ?? []) : []))
  const [params] = useSearchParams()
  const [seg, setSeg] = useState<Seg>(params.get('seg') === 'pend' ? 'pend' : 'ord')
  const [adding, setAdding] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [sel, setSel] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const profileName = useStore((s) => s.profile.name)
  const t = type as ShelfType
  const all = useMemo(() => Object.values(entries).filter((e) => getItem(e.itemId)?.type === t), [entries, t])
  if (!type || !(SHELVES as readonly string[]).includes(t)) return <Navigate to="/" replace />
  const label = SHELF_LABEL[t]
  // lo aún no comparado va al final del ranking, sin etiqueta (§14.4)
  const unranked = all.filter((e) => e.status === 'seen' && !e.ranked).map((e) => e.itemId)
  const mine = [...ranking, ...unranked]
  const pend = all.filter((e) => e.status === 'pending')
  const visibleIds = seg === 'ord' ? mine : pend.map((e) => e.itemId)
  const toggle = (id: string) => setSel((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  const createList = () => nav(`/lista/nueva?title=${encodeURIComponent(`Mis ${label.plural.toLowerCase()} favoritas de ${profileName}`)}&ids=${sel.join(',')}`)

  return (
    <div className="h-full flex flex-col bg-bg">
      <ScreenTitle
        label={`ESTANTERÍA · ${label.plural.toUpperCase()}`}
        title={label.plural}
        subtitle={`${visibleIds.length} obras`}
        onBack={() => (selecting ? setSelecting(false) : nav('/'))}
        action={
          selecting ? null : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setSelecting(true); setSel([]) }}
                aria-label="Compartir"
                className="w-9 h-9 rounded-full flex items-center justify-center text-mute hover:text-ink active:scale-95 transition-transform"
              >
                <Icon name="share" size={18} />
              </button>
              <button
                onClick={() => setAdding(true)}
                aria-label={`Añadir a ${label.plural}`}
                className="w-9 h-9 rounded-full bg-accent text-accent-ink flex items-center justify-center active:scale-95 transition-transform"
              >
                <Icon name="plus" size={18} strokeWidth={2.5} />
              </button>
            </div>
          )
        }
      />
      <div className="px-5 pb-3 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
        <Chip active={seg === 'ord'} onClick={() => setSeg('ord')}>Mis {label.plural.toLowerCase()} · {mine.length}</Chip>
        <Chip active={seg === 'pend'} onClick={() => setSeg('pend')}>Pendientes · {pend.length}</Chip>
      </div>
      {selecting && (
        <div className="px-5 pb-2 flex items-center gap-2 shrink-0">
          <button onClick={() => setSel(sel.length === visibleIds.length ? [] : visibleIds)} className="min-h-[36px] px-3.5 rounded-full bg-surface border border-line text-xs font-medium">{sel.length === visibleIds.length && visibleIds.length > 0 ? 'Quitar todas' : 'Seleccionar todas'}</button>
          <span className="text-meta text-mute">{sel.length} seleccionada{sel.length === 1 ? '' : 's'}</span>
        </div>
      )}
      <div className="flex-1 min-h-0 scroll-y px-5 pb-6">
        {seg === 'ord' && (
          mine.length ? (
            <div className="rounded-2xl bg-surface border border-line divide-y divide-line overflow-hidden">
              {ranking.map((id, i) => {
                const it = getItem(id)
                return it ? <ItemRow key={id} item={it} rank={i + 1} highlight={i === 0 && !selecting} selecting={selecting} selected={sel.includes(id)} onToggle={() => toggle(id)} /> : null
              })}
              {unranked.map((id) => {
                const it = getItem(id)
                return it ? <ItemRow key={id} item={it} selecting={selecting} selected={sel.includes(id)} onToggle={() => toggle(id)} /> : null
              })}
            </div>
          ) : (
            <Empty
              text="Todavía no hay nada aquí."
              action={
                <div className="flex flex-col gap-2.5 w-full max-w-xs">
                  <Button variant="primary" onClick={() => nav('/descubrir')}>Ir a Descubrir</Button>
                  <Button variant="secondary" onClick={() => nav('/importar')}>Importar tus obras</Button>
                </div>
              }
            />
          )
        )}
        {seg === 'pend' && (
          pend.length ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                {pend.length >= 3 && (
                  <Button
                    variant="secondary"
                    onClick={() => setCleaning(true)}
                    className="flex-1"
                    icon={<Icon name="sparkle" size={16} />}
                  >
                    Limpieza ({pend.length})
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => nav(`${WIZARD_PATH}?t=${t}`)}
                  className="flex-1"
                >
                  {t === 'book' ? '¿Qué leo?' : t === 'boardgame' ? '¿A qué jugamos?' : t === 'artist' ? '¿Qué escucho?' : '¿Qué vemos?'}
                </Button>
              </div>
              <div className="rounded-2xl bg-surface border border-line divide-y divide-line overflow-hidden">
                {pend.map((e) => {
                  const it = getItem(e.itemId)
                  return it ? <ItemRow key={e.itemId} item={it} note={e.origin ? `De ${e.origin}` : undefined} selecting={selecting} selected={sel.includes(e.itemId)} onToggle={() => toggle(e.itemId)} /> : null
                })}
              </div>
            </div>
          ) : (
            <Empty
              text="No tienes pendientes. Desliza hacia arriba en Descubrir para guardar."
              action={
                <Button variant="secondary" onClick={() => nav('/importar')}>Importar tus listas</Button>
              }
            />
          )
        )}
      </div>
      {selecting && (
        <div className="shrink-0 p-4 border-t border-line bg-surface flex gap-3">
          <Button variant="secondary" onClick={() => setSelecting(false)}>Cancelar</Button>
          <Button variant="primary" disabled={!sel.length} onClick={createList} className="flex-1">
            Crear lista con {sel.length}
          </Button>
        </div>
      )}
      {adding && <AddFlow shelf={t} onClose={(m) => { setAdding(false); if (m) setToast(m) }} />}
      {cleaning && <CleanupFlow shelf={t} onClose={() => setCleaning(false)} />}
      <AnimatePresence>{toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}

function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="py-14 text-center text-mute flex flex-col items-center gap-4">
      <p className="max-w-[240px] text-body">{text}</p>
      {action}
    </div>
  )
}
