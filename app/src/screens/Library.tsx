import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getItem, items } from '../data/catalog'
import { useStore } from '../store/useStore'
import { SHELVES, SHELF_LABEL } from '../types'
import { PosterTile } from '../components/ItemRow'
import { Poster } from '../components/Poster'
import { Avatar, Sheet, Toast } from '../components/ui'
import { AddFlow } from '../components/AddFlow'
import { AnimatePresence } from 'framer-motion'
import type { ShelfType } from '../types'
import { Icon } from '../components/Icon'

const FUTURE_SHELVES: [string, number][] = [
  ['Documentales', 214], ['Anime', 187], ['Podcasts', 163], ['Videojuegos', 241],
  ['Cómics y manga', 152], ['Canciones', 276], ['Canales de YouTube', 121], ['Restaurantes', 233],
]

export function Library() {
  const nav = useNavigate()
  const profile = useStore((s) => s.profile)
  const entries = useStore((s) => s.entries)
  const rankings = useStore((s) => s.rankings)
  const lists = useStore((s) => s.lists)
  const votes = useStore((s) => s.categoryVotes)
  const toggleVote = useStore((s) => s.toggleVote)
  const loadSample = useStore((s) => s.loadSample)
  const [voting, setVoting] = useState(false)
  const [add, setAdd] = useState<{ shelf?: ShelfType } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const all = Object.values(entries)
  const seen = all.filter((e) => e.status === 'seen').length
  const pending = all.filter((e) => e.status === 'pending').length
  const voted = Object.values(votes).filter(Boolean).length

  return (
    <div className="h-full scroll-y pb-6">
      <header className="safe-top px-5 pb-5">
        <div className="flex items-center justify-between min-h-[48px]">
          <Link to="/perfil" className="flex items-center gap-2.5 min-h-[44px]" aria-label="Tu perfil">
            <Avatar name={profile.name} color={profile.avatarColor} size={36} />
            <span className="label-caps text-mute">Tu biblioteca</span>
          </Link>
          <button onClick={() => setAdd({})} aria-label="Añadir a mano" className="w-11 h-11 rounded-full bg-accent text-accent-ink flex items-center justify-center shadow-[0_8px_24px_-8px_rgb(245_181_68/0.7)] active:scale-90 transition-transform"><Icon name="plus" size={22} strokeWidth={2.5} /></button>
        </div>
        <h1 className="serif text-[34px] leading-[1.02] font-semibold mt-3">Hola, {profile.name.split(' ')[0]}.</h1>
        <p className="text-mute mt-1.5 text-[15px]">
          <b className="text-ink font-semibold">{seen}</b> vistas y leídas · <b className="text-ink font-semibold">{pending}</b> pendientes
        </p>
      </header>

      <div className="space-y-8">
        {SHELVES.map((t) => {
          const rk = rankings[t] ?? []
          const unranked = all.filter((e) => e.status === 'seen' && !e.ranked && getItem(e.itemId)?.type === t)
          const unrankedCount = unranked.length
          const pendingCount = all.filter((e) => e.status === 'pending' && getItem(e.itemId)?.type === t).length
          return (
            <section key={t} aria-label={SHELF_LABEL[t].plural}>
              <div className="flex items-center justify-between px-5 mb-2.5 min-h-[44px] gap-2">
                <Link to={`/estanteria/${t}`} className="flex-1 flex items-center justify-between min-h-[44px]">
                  <h2 className="serif text-[24px] font-semibold">{SHELF_LABEL[t].plural}</h2>
                  <span className="text-xs text-mute flex items-center gap-1">{rk.length + unrankedCount} <Icon name="chevron" size={14} /></span>
                </Link>
                {pendingCount > 0 && (
                  <Link to={`/estanteria/${t}?seg=pend`} className="shrink-0 min-h-[36px] px-3 rounded-full bg-surface text-[13px] text-ink/85 flex items-center gap-1.5" aria-label={`${pendingCount} pendientes en ${SHELF_LABEL[t].plural}`}>
                    <Icon name="bookmark" size={14} className="text-stamp-blue" /> {pendingCount}
                  </Link>
                )}
                <button onClick={() => setAdd({ shelf: t })} aria-label={`Añadir a ${SHELF_LABEL[t].plural}`} className="w-10 h-10 rounded-full bg-surface border border-line flex items-center justify-center text-accent shrink-0"><Icon name="plus" size={19} /></button>
              </div>
              {rk.length || unranked.length ? (
                <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-2 items-end">
                  {rk.map((id, i) => {
                    const it = getItem(id)
                    return it ? <PosterTile key={id} item={it} rank={i + 1} /> : null
                  })}
                  {unranked.slice(0, 10).map((e) => {
                    const it = getItem(e.itemId)
                    return it ? <PosterTile key={e.itemId} item={it} /> : null
                  })}
                </div>
              ) : (
                <Link to="/descubrir" className="mx-5 rounded-3xl bg-surface p-4 flex items-center gap-4 active:scale-[0.99] transition-transform">
                  <span className="flex -space-x-5 shrink-0" aria-hidden>
                    {items.filter((it) => it.type === t).slice(0, 3).map((it, i) => (
                      <Poster key={it.id} item={it} showTitle={false} className="w-11 aspect-[2/3] rounded-lg ring-2 ring-surface" style={{ transform: `rotate(${(i - 1) * 7}deg)` }} />
                    ))}
                  </span>
                  <span className="flex-1 text-sm text-mute leading-snug">Aún está vacía. <span className="text-ink font-medium">Haz swipe en Descubrir</span> y se llena sola.</span>
                  <Icon name="chevron" size={18} className="text-mute shrink-0" />
                </Link>
              )}
            </section>
          )
        })}

        <section aria-label="Mis listas">
          <div className="flex items-center justify-between px-5 mb-2.5 min-h-[44px]">
            <h2 className="serif text-[22px] font-semibold">Mis listas</h2>
            <button onClick={() => nav('/lista/nueva')} className="min-h-[40px] px-3 rounded-full bg-surface border border-line text-sm flex items-center gap-1"><Icon name="plus" size={16} /> Nueva lista</button>
          </div>
          {lists.length ? (
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-1">
              {lists.map((l) => (
                <Link key={l.id} to={`/lista/${l.id}`} className="shrink-0 w-[150px]">
                  <div className="grid grid-cols-2 gap-0.5 rounded-2xl overflow-hidden border border-line aspect-square bg-surface">
                    {[0, 1, 2, 3].map((i) => {
                      const it = l.items[i] ? getItem(l.items[i].itemId) : undefined
                      return it ? <Poster key={i} item={it} showTitle={false} className="w-full h-full" /> : <div key={i} className="bg-surface2" />
                    })}
                  </div>
                  <div className="mt-1.5 text-sm font-medium truncate">{l.title}</div>
                  <div className="text-xs text-mute">{l.items.length} obras</div>
                </Link>
              ))}
            </div>
          ) : (
            <button onClick={() => nav('/lista/nueva')} className="mx-5 w-[calc(100%-2.5rem)] text-left rounded-3xl bg-surface p-4 text-sm text-mute leading-snug active:scale-[0.99] transition-transform">Junta pelis, series y libros en una lista — «Para una ruptura», «Lo mejor de 2024» — y <span className="text-ink font-medium">compártela con un link</span>.</button>
          )}
        </section>

        <section className="px-5 space-y-3">
          <button onClick={() => setVoting(true)} className="w-full text-left rounded-3xl bg-surface p-4 flex items-center gap-3 active:scale-[0.99] transition-transform">
            <span className="w-11 h-11 rounded-2xl bg-accent/15 text-accent flex items-center justify-center"><Icon name="heart" size={22} /></span>
            <span className="flex-1">
              <span className="block font-semibold">Vota nuevas estanterías</span>
              <span className="block text-xs text-mute">{voted ? `Has votado ${voted}` : 'Tú decides qué categoría llega después'}</span>
            </span>
            <Icon name="chevron" size={18} className="text-mute" />
          </button>
          {all.length < 5 && items.length > 0 && (
            <button onClick={loadSample} className="w-full min-h-[48px] rounded-2xl border border-dashed border-accent/60 text-accent text-sm font-medium flex items-center justify-center gap-2">
              <Icon name="sparkle" size={17} /> Cargar datos de ejemplo
            </button>
          )}
        </section>
      </div>

      {add && <AddFlow shelf={add.shelf} onClose={(m) => { setAdd(null); if (m) setToast(m) }} />}
      <AnimatePresence>{toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}</AnimatePresence>
      {voting && (
        <Sheet label="Votar estanterías" onClose={() => setVoting(false)} height="70%">
          <h3 className="font-semibold text-lg">¿Qué estantería quieres después?</h3>
          <p className="text-xs text-mute mb-3">Los votos de la comunidad son de ejemplo en esta demo.</p>
          <ul className="space-y-2 overflow-y-auto" style={{ maxHeight: '52vh' }}>
            {FUTURE_SHELVES.map(([name, base]) => {
              const on = !!votes[name]
              return (
                <li key={name} className="flex items-center gap-3 bg-surface2 rounded-2xl px-4 min-h-[52px]">
                  <span className="flex-1 font-medium">{name}</span>
                  <span className="text-xs text-mute tabular-nums">{base + (on ? 1 : 0)}</span>
                  <button onClick={() => toggleVote(name)} aria-pressed={on} aria-label={`Votar ${name}`} className="w-11 h-11 flex items-center justify-center">
                    <Icon name="heart" size={24} fill={on ? '#ef4b6b' : 'none'} style={{ color: on ? '#ef4b6b' : '#7b7b84' }} />
                  </button>
                </li>
              )
            })}
          </ul>
        </Sheet>
      )}
    </div>
  )
}
