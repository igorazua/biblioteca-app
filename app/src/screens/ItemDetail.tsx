import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { canonicalId } from '../data/aliases'
import { friendHits, getItem, itemFacts, typeName } from '../data/catalog'
import { useStore } from '../store/useStore'
import { useCatalog } from '../store/useCatalog'
import { useRanks } from '../store/useScores'
import { Poster, posterLayoutId } from '../components/Poster'
import { boardgameDetailAspect, posterShape } from '../lib/posterShape'
import { Avatar, FriendBubbles, RankBadge, Sheet, Tag, Toast } from '../components/ui'
import { friendRanks } from '../lib/rank'
import { LISTS_ENABLED } from '../config'
import { RatingFlow } from '../components/RatingFlow'
import { AskFriend } from '../components/AskFriend'
import { Icon } from '../components/Icon'
import { SHELF_LABEL, type Friend, type Status } from '../types'
import { AnimatePresence, motion } from 'framer-motion'
import { haptic } from '../lib/haptics'

/** Puesto de una obra en el ranking de un amigo (§14.6, D25): «nº 2 de sus 48 pelis». El mismo cálculo que las burbujas. */
const friendRank = (friend: Friend, itemId: string) => friendRanks(friend, getItem)[itemId] ?? null

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

  // link antiguo a una gemela fusionada: la ficha y la entrada viven en el id que se conservó
  if (canonicalId(id) !== id) return <Navigate to={`/i/${encodeURIComponent(canonicalId(id))}`} replace />
  if (!item) {
    if (loading) {
      return (
        <div className="h-full flex flex-col p-4">
          <div className="safe-top flex items-center justify-between py-2 mb-4">
            <button onClick={goBack} className="w-10 h-10 rounded-full bg-surface2" />
          </div>
          <div className="flex gap-4 mb-6">
            <div className="skeleton w-28 h-40 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-3 py-2">
              <div className="skeleton h-6 rounded w-3/4" />
              <div className="skeleton h-4 rounded w-1/2" />
            </div>
          </div>
          <div className="skeleton h-24 rounded-2xl mb-4" />
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
    haptic('tap')
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

  const bgAspect = item.type === 'boardgame' ? boardgameDetailAspect(item.posterRatio) : null

  return (
    <div className="h-full relative bg-bg">
      <button onClick={goBack} aria-label="Volver" className="absolute left-4 z-20 w-10 h-10 rounded-full bg-bg/85 border border-line flex items-center justify-center text-ink active:scale-95 transition-transform" style={{ top: 'max(env(safe-area-inset-top), 16px)' }}>
        <Icon name="back" size={20} />
      </button>
      <div className="h-full scroll-y pb-10">
        <div
          className={`relative ${
            posterShape(item.type) === 'square'
              ? 'w-full aspect-square'
              : bgAspect != null
                ? 'w-full'
                : 'h-[430px]'
          }`}
          style={bgAspect != null ? { aspectRatio: bgAspect } : undefined}
        >
          <Poster item={item} showTitle={false} layoutId={posterLayoutId(item.id)} style={{ borderRadius: 0 }} className="absolute inset-0 w-full h-full" />
          {/* el degradado y el título entran cuando el póster ya casi ha llegado */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: 0.12 }} className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-black/30" />
          {/* las caras de los amigos con su puesto, como en las tarjetas (Igor, 27/10) */}
          {hits.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: 0.16 }} className="absolute right-4 z-10" style={{ top: 'max(env(safe-area-inset-top), 16px)' }}>
              <FriendBubbles itemId={item.id} shelf={item.type} />
            </motion.div>
          )}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.16 }} className="absolute bottom-0 inset-x-0 px-5">
            <div className="text-label text-ink/80">{typeName(item.type)} · {item.year}</div>
            <h1 className="text-display text-ink mt-1">{item.title}</h1>
            <div className="text-meta text-ink/80 mt-1">
              {item.artistId ? (
                <Link to={`/i/${encodeURIComponent(item.artistId)}`} className="underline underline-offset-2">
                  {item.creator}
                </Link>
              ) : (
                item.creator
              )}
              {itemFacts(item) ? ` · ${itemFacts(item)}` : ''}
            </div>
          </motion.div>
        </div>

        <div className="px-5 mt-4 space-y-5">
          <div className="flex flex-wrap gap-1.5">
            {item.genres.map((g) => <Tag key={g}>{g}</Tag>)}
            {item.platforms?.map((p) => <Tag key={p} variant="accent">{p}</Tag>)}
            {item.type === 'song' && (
              <a
                href={`https://open.spotify.com/search/${encodeURIComponent(`${item.title} ${item.creator}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface border border-line text-meta text-accent hover:underline font-medium"
              >
                <Icon name="disc" size={14} />
                Spotify
              </a>
            )}
          </div>
          <p className="text-body leading-relaxed text-ink/90">{item.synopsis}</p>

          <section aria-label="Tu estado">
            <h2 className="text-label text-mute uppercase mb-2.5">Tu estado</h2>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => toggle('dismissed')}
                className={`min-h-[52px] px-2 py-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                  status === 'dismissed'
                    ? 'bg-rose-500/15 border-rose-500/60 text-rose-400 font-medium'
                    : 'bg-surface border-line text-mute hover:text-ink font-medium'
                }`}
              >
                <Icon
                  name="x"
                  size={16}
                  className={status === 'dismissed' ? 'text-rose-400' : 'text-mute'}
                  strokeWidth={status === 'dismissed' ? 2.5 : 2}
                />
                <span className="text-meta tracking-tight">No me interesa</span>
              </button>

              <button
                type="button"
                onClick={() => toggle('pending')}
                className={`min-h-[52px] px-2 py-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                  status === 'pending'
                    ? 'bg-sky-500/15 border-sky-500/60 text-sky-400 font-medium'
                    : 'bg-surface border-line text-mute hover:text-ink font-medium'
                }`}
              >
                <Icon
                  name="bookmark"
                  size={16}
                  className={status === 'pending' ? 'text-sky-400' : 'text-mute'}
                  strokeWidth={status === 'pending' ? 2.5 : 2}
                  fill={status === 'pending' ? 'currentColor' : 'none'}
                />
                <span className="text-meta tracking-tight">Guardar</span>
              </button>

              <button
                type="button"
                onClick={() => toggle('seen')}
                className={`min-h-[52px] px-2 py-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                  status === 'seen'
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-400 font-medium'
                    : 'bg-surface border-line text-mute hover:text-ink font-medium'
                }`}
              >
                <Icon
                  name="check"
                  size={16}
                  className={status === 'seen' ? 'text-emerald-400' : 'text-mute'}
                  strokeWidth={status === 'seen' ? 2.5 : 2}
                />
                <span className="text-meta tracking-tight truncate max-w-full">{label.actionPast}</span>
              </button>
            </div>
            {entry?.origin && status === 'pending' && <div className="text-meta text-mute mt-2">Te {label.pronoun} pasó {entry.origin}</div>}
            {status === 'seen' && (
              <div className="mt-3 rounded-2xl bg-surface border border-line p-4">
                <div className="flex items-center justify-between">
                  <span className="text-meta text-mute">Tu puesto</span>
                  {entry?.ranked && myRank ? <RankBadge pos={myRank.pos} className="!text-xs !px-2.5 !py-1" /> : null}
                </div>
                {pos >= 0 && <div className="text-meta text-mute mt-1">nº <b className="text-ink">{pos + 1}</b> de tus {(rankings[item.type] ?? []).length} {label.plural.toLowerCase()}</div>}
                {entry?.comment && <p className="mt-2 text-body serif italic text-ink/90">«{entry.comment}»</p>}
                <button onClick={() => setRating(true)} className="mt-3 min-h-[44px] px-4 rounded-xl bg-surface2 border border-line text-meta text-ink font-medium flex items-center gap-2"><Icon name="edit" size={16} /> {entry?.comment ? 'Editar comentario' : entry?.stars ? 'Añadir comentario' : 'Valorar'}</button>
              </div>
            )}
          </section>

          <section aria-label="Tus amigos">
            <h2 className="text-label text-mute uppercase mb-2">¿Quién {label.pronoun} {label.verbPast} antes que yo?</h2>
            {seenBy.length === 0 && <p className="text-meta text-mute">Ninguno de tus amigos {label.verbPerfSingular} todavía.</p>}
            <ul className="space-y-3">
              {seenBy.map(({ friend, entry: e }) => {
                const r = friendRank(friend, item.id)
                return (
                  <li key={friend.id} className="rounded-2xl bg-surface border border-line p-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={friend.name} color={friend.avatarColor} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-body text-ink">{friend.name}</div>
                        {r && <div className="text-meta text-mute">nº {r.pos} de sus {r.total} {label.plural.toLowerCase()}</div>}
                      </div>
                      {r && <span className="shrink-0 rounded-full bg-accent text-accent-ink font-bold text-xs px-2.5 py-1 tabular-nums">nº {r.pos}</span>}
                    </div>
                    {e.comment && <p className="mt-2 text-body text-ink/90 serif italic">«{e.comment}»</p>}
                    {r && <AskFriend friend={friend} message={askText(friend.name, r.pos)} onNotify={setToast} />}
                  </li>
                )
              })}
            </ul>
            {pendingBy.length > 0 && (
              <p className="text-meta text-mute mt-3 flex items-center gap-1.5"><Icon name="bookmark" size={15} /> {label.pendingPlural}: {pendingBy.map((h) => h.friend.name).join(', ')}</p>
            )}
          </section>

          {LISTS_ENABLED && (
            <button onClick={() => setListSheet(true)} className="w-full min-h-[48px] rounded-2xl border border-line bg-surface text-ink font-medium flex items-center justify-center gap-2 hover:bg-surface2 active:scale-98 transition-all">
              <Icon name="plus" size={18} /> Añadir a una lista
            </button>
          )}
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
