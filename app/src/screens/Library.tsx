import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { getItem, items } from '../data/catalog'
import { useStore } from '../store/useStore'
import { useAuth } from '../store/useAuth'
import { useFriends } from '../store/useFriends'
import { track } from '../store/useEvents'
import { evaluateNudges } from '../lib/nudges'
import { SHELVES, SHELF_LABEL, type ShelfType } from '../types'
import { PosterTile } from '../components/ItemRow'
import { Poster } from '../components/Poster'
import { Avatar, Sheet, Toast } from '../components/ui'
import { AddFlow } from '../components/AddFlow'
import { NudgeCard } from '../components/NudgeCard'
import { Icon } from '../components/Icon'
import { ScreenTitle } from '../components/ScreenTitle'

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
  const dismissHistory = useStore((s) => s.nudgeDismiss)
  const dismissNudge = useStore((s) => s.dismissNudge)
  const user = useAuth((s) => s.user)
  const realFriends = useFriends((s) => s.realFriends)

  const [voting, setVoting] = useState(false)
  const [add, setAdd] = useState<{ shelf?: ShelfType } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [sessionDismissed, setSessionDismissed] = useState(false)

  const all = Object.values(entries)
  const seen = all.filter((e) => e.status === 'seen').length
  const pending = all.filter((e) => e.status === 'pending').length
  const voted = Object.values(votes).filter(Boolean).length

  // Recordatorios inteligentes (§5)
  const nudge = useMemo(() => {
    if (sessionDismissed) return null
    return evaluateNudges({
      hasAccount: Boolean(user),
      entries,
      rankings,
      hasImported: Boolean(localStorage.getItem('biblio_has_imported')),
      friendsCount: realFriends.length,
      hasUsedDecide: Boolean(localStorage.getItem('biblio_used_decide')),
      isStandalonePwa: typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || false),
      isMobile: typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
      daysOfUsage: 2,
      dismissHistory,
      sessionNudgeShown: sessionDismissed,
    })
  }, [user, entries, rankings, realFriends.length, dismissHistory, sessionDismissed])

  useEffect(() => {
    if (nudge) {
      track('nudge_shown', { itemId: nudge.id, data: { location: 'library' } })
    }
  }, [nudge?.id])

  const handleNudgeAction = () => {
    if (!nudge) return
    track('nudge_tap', { itemId: nudge.id, data: { location: 'library' } })
    if (nudge.actionType === 'login') {
      nav('/perfil')
    } else if (nudge.actionType === 'navigate' && nudge.targetRoute) {
      nav(nudge.targetRoute)
    } else if (nudge.actionType === 'invite') {
      nav('/perfil')
    } else if (nudge.actionType === 'install') {
      alert('Para instalar en iPhone: pulsa Compartir > "Añadir a pantalla de inicio". En Android: menú de opciones > "Instalar aplicación".')
    }
  }

  const handleNudgeDismiss = () => {
    if (!nudge) return
    track('nudge_dismiss', { itemId: nudge.id, data: { location: 'library' } })
    dismissNudge(nudge.id)
    setSessionDismissed(true)
  }

  return (
    <div className="h-full scroll-y pb-6 bg-bg">
      <ScreenTitle
        label="TU BIBLIOTECA"
        title={`Hola, ${profile.name.split(' ')[0]}.`}
        subtitle={`${seen} en tu biblioteca · ${pending} pendientes`}
        action={
          <div className="flex items-center gap-2">
            <Link to="/perfil" className="active:opacity-80 transition-opacity" aria-label="Tu perfil">
              <Avatar name={profile.name} color={profile.avatarColor} url={profile.avatarUrl} size={32} />
            </Link>
            <button
              onClick={() => setAdd({})}
              aria-label="Añadir a mano"
              className="w-9 h-9 rounded-full bg-accent text-accent-ink flex items-center justify-center active:scale-95 transition-transform"
            >
              <Icon name="plus" size={18} strokeWidth={2.5} />
            </button>
          </div>
        }
      />

      {/* Recordatorio inteligente contextual (§5) */}
      <AnimatePresence>
        {nudge && (
          <NudgeCard
            key={nudge.id}
            nudge={nudge}
            onAction={handleNudgeAction}
            onDismiss={handleNudgeDismiss}
          />
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {SHELVES.map((t) => {
          const rk = rankings[t] ?? []
          const unranked = all.filter((e) => e.status === 'seen' && !e.ranked && getItem(e.itemId)?.type === t)
          const unrankedCount = unranked.length
          const pendingCount = all.filter((e) => e.status === 'pending' && getItem(e.itemId)?.type === t).length
          return (
            <section key={t} aria-label={SHELF_LABEL[t].plural} className="mx-4 rounded-3xl bg-surface border border-line pt-1 pb-4">
              {/* toda la cabecera abre la estantería */}
              <Link to={`/estanteria/${t}`} className="flex items-center gap-2 px-4 min-h-[52px] active:opacity-70 transition-opacity">
                <h2 className="text-title font-medium text-ink">{SHELF_LABEL[t].plural}</h2>
                <span className="text-meta text-mute tabular-nums">
                  {rk.length + unrankedCount}
                  {pendingCount > 0 && ` · ${pendingCount} pendientes`}
                </span>
                <span className="ml-auto text-meta text-accent font-medium flex items-center gap-0.5 shrink-0">
                  Ver todo <Icon name="chevron" size={14} />
                </span>
              </Link>
              {rk.length || unranked.length ? (
                <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 items-end">
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
                <div className="mx-4 space-y-2">
                  <Link to={`/descubrir`} className="rounded-2xl bg-surface2 p-4 flex items-center gap-4 active:scale-[0.99] transition-transform">
                    <span className="flex -space-x-5 shrink-0" aria-hidden>
                      {items.filter((it) => it.type === t).slice(0, 3).map((it, i) => (
                        <Poster key={it.id} item={it} showTitle={false} className="w-11 aspect-[2/3] rounded-[8px] border border-line" style={{ transform: `rotate(${(i - 1) * 7}deg)` }} />
                      ))}
                    </span>
                    <span className="flex-1 text-sm text-mute leading-snug">Aún está vacía. <span className="text-ink font-medium">Haz swipe en Descubrir</span> y se llena sola.</span>
                    <Icon name="chevron" size={18} className="text-mute shrink-0" />
                  </Link>
                  {(t === 'movie' || t === 'series' || t === 'book') && (
                    <Link to="/importar" className="px-4 py-2.5 rounded-2xl bg-surface2 border border-line flex items-center justify-between text-xs text-mute hover:text-ink active:scale-[0.99] transition-transform">
                      <span>Trae tus {SHELF_LABEL[t].plural.toLowerCase()} de Letterboxd o IMDb</span>
                      <span className="text-accent font-semibold flex items-center gap-1">Importar <Icon name="chevron" size={13} /></span>
                    </Link>
                  )}
                </div>
              )}
            </section>
          )
        })}

        <section aria-label="Mis listas" className="pt-4">
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
