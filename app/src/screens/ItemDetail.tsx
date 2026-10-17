import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { friendHits, getItem, itemFacts, typeName } from '../data/catalog'
import { useStore } from '../store/useStore'
import { useCatalog } from '../store/useCatalog'
import { useRanks } from '../store/useScores'
import { Poster } from '../components/Poster'
import { Avatar, Chip, RankBadge, Sheet, Toast } from '../components/ui'
import { RatingFlow } from '../components/RatingFlow'
import { AskFriend } from '../components/AskFriend'
import { Icon } from '../components/Icon'
import { SHELF_LABEL, type Friend, type Item, type Status } from '../types'
import { AnimatePresence } from 'framer-motion'

/** Puesto de una obra en el ranking de un amigo para esa categoría (§14.6, D25): «nº 2 de sus 48 pelis». */
function friendRank(friend: Friend, itemId: string, type: Item['type']): { pos: number; total: number } | null {
  const mine = friend.entries
    .filter((e) => e.status === 'seen' && e.score !== undefined && getItem(e.itemId)?.type === type)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const i = mine.findIndex((e) => e.itemId === itemId)
  return i < 0 ? null : { pos: i + 1, total: mine.length }
}

export function ItemDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const loc = useLocation()
  // sin historial (recarga o link directo) «volver» lleva a la biblioteca; antes no hacía nada y parecía bloqueado
  const goBack = () => (loc.key !== 'default' ? nav(-1) : nav('/', { replace: true }))
  const catalogVersion = useCatalog((s) => s.version)
  const item = getItem(id)
  const [loading, setLoading] = useState(!item)

  useEffect(() => {
    if (id && !getItem(id)) {
      setLoading(true)
      useCatalog.getState().ensureItems([id]).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [id, catalogVersion])

  const entry = useStore((s) => s.entries[id])
  const rankings = useStore((s) => s.rankings)
  const lists = useStore((s) => s.lists)
  const setStatus = useStore((s) => s.setStatus)
  const saveList = useStore((s) => s.saveList)
  const ranks = useRanks()
  const [rating, setRating] = useState(false)
  const [listSheet, setListSheet] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  if (!item) {
    if (loading) {
      return (
        <div className="h-full flex flex-col p-4 animate-pulse">
          <div className="safe-top flex items-center justify-between py-2 mb-4">
            <button onClick={goBack} className="w-10 h-10 rounded-full bg-surface2" />
          </div>
          <div className="flex gap-4 mb-6">
            <div className="w-28 h-40 rounded-2xl bg-surface2 shrink-0" />
            <div className="flex-1 space-y-3 py-2">
              <div className="h-6 bg-surface2 rounded w-3/4" />
              <div className="h-4 bg-surface2/60 rounded w-1/2" />
            </div>
          </div>
          <div className="h-24 bg-surface2/40 rounded-2xl mb-4" />
        </div>
      )
    }
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p>No encontramos esta obra.</p>
        <Link to="/" className="text-accent underline">Volver a la biblioteca</Link>
      </div>
    )
  }
  const label = SHELF_LABEL[item.type]
  const hits = friendHits(item.id)
  const seenBy = hits.filter((h) => h.entry.status === 'seen')
  const pendingBy = hits.filter((h) => h.entry.status === 'pending')
  const pos = (rankings[item.type] ?? []).indexOf(item.id)
  const myRank = ranks[item.id]
  const status = entry?.status

  const toggle = (s: Status) => {
    if (status === s) { setStatus(item.id, null); return }
    setStatus(item.id, s)
    if (s === 'seen') setRating(true)
  }
  const addToList = (listId: string) => {
    const l = lists.find((x) => x.id === listId)
    if (!l) return
    if (!l.items.some((i) => i.itemId === item.id)) saveList({ ...l, items: [...l.items, { itemId: item.id }] })
    setListSheet(false)
    setToast(`Añadida a «${l.title}»`)
  }
  const askText = (name: string, pos: number) => `Oye ${name}, he visto que tienes ${item.title} en el puesto ${pos} de tus ${label.plural.toLowerCase()}, ¿me ${label.pronoun} recomiendas?`

  return (
    <div className="h-full relative bg-bg">
      <button onClick={goBack} aria-label="Volver" className="absolute left-3 z-20 w-11 h-11 rounded-full bg-black/45 backdrop-blur-xl ring-1 ring-white/20 flex items-center justify-center active:scale-95 transition-transform" style={{ top: 'max(env(safe-area-inset-top), 12px)' }}>
        <Icon name="back" />
      </button>
      <div className="h-full scroll-y pb-10">
        <div className="relative h-[430px]">
          <Poster item={item} showTitle={false} className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-black/30" />
          <div className="absolute bottom-0 inset-x-0 px-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-white/70">{typeName(item.type)} · {item.year}</div>
            <h1 className="serif text-[32px] leading-[1.05] font-semibold mt-1">{item.title}</h1>
            <div className="text-sm text-white/75 mt-1">{item.creator}{itemFacts(item) ? ` · ${itemFacts(item)}` : ''}</div>
          </div>
        </div>

        <div className="px-5 mt-3 space-y-5">
          <div className="flex flex-wrap gap-1.5">
            {item.genres.map((g) => <span key={g} className="text-xs bg-surface2 rounded-full px-3 py-1.5">{g}</span>)}
            {item.platforms?.map((p) => <span key={p} className="text-xs border border-accent/50 text-accent rounded-full px-3 py-1.5">{p}</span>)}
          </div>
          <p className="text-[15px] leading-relaxed text-ink/90">{item.synopsis}</p>

          <section aria-label="Tu estado">
            <h2 className="text-sm font-semibold text-mute uppercase tracking-wide mb-2">Tu estado</h2>
            <div className="flex gap-2">
              <Chip active={status === 'seen'} onClick={() => toggle('seen')} className="flex-1">{label.actionPast}</Chip>
              <Chip active={status === 'pending'} onClick={() => toggle('pending')} className="flex-1">Pendiente</Chip>
              <Chip active={status === 'dismissed'} onClick={() => toggle('dismissed')} className="flex-1">No me interesa</Chip>
            </div>
            {entry?.origin && status === 'pending' && <div className="text-xs text-mute mt-2">Te {label.pronoun} pasó {entry.origin}</div>}
            {status === 'seen' && (
              <div className="mt-3 rounded-3xl bg-surface border border-line p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-mute">Tu puesto</span>
                  {entry?.ranked && myRank ? <RankBadge pos={myRank.pos} className="!text-sm !px-2.5 !py-1" /> : null}
                </div>
                {pos >= 0 && <div className="text-sm text-mute mt-1">nº <b className="text-ink">{pos + 1}</b> de tus {(rankings[item.type] ?? []).length} {label.plural.toLowerCase()}</div>}
                {entry?.comment && <p className="mt-2 text-[15px] serif italic text-ink/90">«{entry.comment}»</p>}
                <button onClick={() => setRating(true)} className="mt-3 min-h-[44px] px-4 rounded-xl bg-surface2 text-sm font-medium flex items-center gap-2"><Icon name="edit" size={16} /> {entry?.comment ? 'Editar comentario' : entry?.stars ? 'Añadir comentario' : 'Valorar'}</button>
              </div>
            )}
          </section>

          <section aria-label="Tus amigos">
            <h2 className="text-sm font-semibold text-mute uppercase tracking-wide mb-2">¿Quién {label.pronoun} {label.verbPast} antes que yo?</h2>
            {seenBy.length === 0 && <p className="text-sm text-mute">Ninguno de tus amigos {label.verbPerfSingular} todavía.</p>}
            <ul className="space-y-3">
              {seenBy.map(({ friend, entry: e }) => {
                const r = friendRank(friend, item.id, item.type)
                return (
                  <li key={friend.id} className="rounded-3xl bg-surface border border-line p-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={friend.name} color={friend.avatarColor} size={38} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{friend.name}</div>
                        {r && <div className="text-xs text-mute">nº {r.pos} de sus {r.total} {label.plural.toLowerCase()}</div>}
                      </div>
                      {r && <span className="shrink-0 rounded-full bg-accent text-accent-ink font-bold text-sm px-2.5 py-1 tabular-nums">nº {r.pos}</span>}
                    </div>
                    {e.comment && <p className="mt-2 text-[15px] text-ink/90 serif italic">«{e.comment}»</p>}
                    {r && <AskFriend friend={friend} message={askText(friend.name, r.pos)} onNotify={setToast} />}
                  </li>
                )
              })}
            </ul>
            {pendingBy.length > 0 && (
              <p className="text-sm text-mute mt-3 flex items-center gap-1.5"><Icon name="bookmark" size={15} /> {label.pendingPlural}: {pendingBy.map((h) => h.friend.name).join(', ')}</p>
            )}
          </section>

          <button onClick={() => setListSheet(true)} className="w-full min-h-[50px] rounded-2xl border border-line bg-surface font-medium flex items-center justify-center gap-2">
            <Icon name="plus" size={18} /> Añadir a una lista
          </button>
        </div>
      </div>

      {rating && <RatingFlow key={String(rating)} withStars={!entry?.stars && !entry?.ranked} itemId={item.id} onDone={(m) => { setRating(false); if (m) setToast(m) }} />}
      {listSheet && (
        <Sheet label="Añadir a una lista" onClose={() => setListSheet(false)} height="40%">
          <h3 className="font-semibold text-lg mb-2">Añadir a una lista</h3>
          <div className="space-y-2 overflow-y-auto">
            {lists.map((l) => (
              <button key={l.id} onClick={() => addToList(l.id)} className="w-full text-left min-h-[48px] px-4 rounded-2xl bg-surface2 flex items-center justify-between">
                <span className="truncate">{l.title}</span><span className="text-xs text-mute">{l.items.length}</span>
              </button>
            ))}
            <button onClick={() => nav(`/lista/nueva?add=${encodeURIComponent(item.id)}`)} className="w-full min-h-[48px] px-4 rounded-2xl border border-dashed border-accent/60 text-accent flex items-center gap-2 justify-center">
              <Icon name="plus" size={18} /> Nueva lista con esta obra
            </button>
          </div>
        </Sheet>
      )}
      <AnimatePresence>{toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}
