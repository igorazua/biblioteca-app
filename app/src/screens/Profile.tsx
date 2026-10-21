// app/src/screens/Profile.tsx
// Perfil: lo que ven los demás de ti. Aquí no se edita nada: «Editar perfil» abre tus datos y el engranaje, los Ajustes.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { friends, getItem } from '../data/catalog'
import { APP_NAME } from '../config'
import { useStore } from '../store/useStore'
import { useRanks } from '../store/useScores'
import { friendRanks } from '../lib/rank'
import { SHELVES, SHELF_LABEL } from '../types'
import { affinity } from '../lib/affinity'
import { profileUrl, type SharedProfile } from '../lib/share'
import { shareOrCopy } from '../lib/shareUi'
import { generateShareCard, shareOrDownloadCard } from '../lib/shareCard'
import { countryName } from '../lib/countries'
import { Poster, posterLayoutId } from '../components/Poster'
import { Avatar, Sheet, Toast } from '../components/ui'
import { Icon } from '../components/Icon'
import { useAuth } from '../store/useAuth'
import { useFriends } from '../store/useFriends'
import { FindFriends } from '../components/FindFriends'

export function Profile() {
  const profile = useStore((s) => s.profile)
  const entries = useStore((s) => s.entries)
  const rankings = useStore((s) => s.rankings)
  const ranks = useRanks()

  const { user, profile: authProfile } = useAuth()
  const { realFriends } = useFriends()

  const [toast, setToast] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [findFriends, setFindFriends] = useState(false)
  const [generatingCard, setGeneratingCard] = useState(false)

  // Estadísticas
  const stats = useMemo(() => {
    const list = Object.values(entries)
    const perShelf: Record<string, number> = {}
    for (const t of SHELVES) {
      perShelf[t] = list.filter((e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === t).length
    }
    const seen = list.filter((e) => e.status === 'seen').length
    const pending = list.filter((e) => e.status === 'pending').length
    const genreCounts: Record<string, number> = {}
    for (const e of list) {
      if (e.status !== 'seen') continue
      const it = getItem(e.itemId)
      for (const g of it?.genres ?? []) genreCounts[g] = (genreCounts[g] ?? 0) + 1
    }
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    return { perShelf, seen, pending, topGenre }
  }, [entries])

  // Afinidad con amigos
  const activeFriends = realFriends.length > 0 ? realFriends : user ? [] : friends
  const aff = useMemo(() => {
    const mine = Object.fromEntries(Object.entries(ranks).map(([id, r]) => [id, r.pct]))
    return activeFriends
      .map((f) => {
        const theirs = Object.fromEntries(Object.entries(friendRanks(f, getItem)).map(([id, r]) => [id, r.pct]))
        return { f, a: affinity(mine, theirs) }
      })
      .sort((x, y) => (y.a ?? -1) - (x.a ?? -1))
  }, [ranks, activeFriends])

  const sharedProfile = (): SharedProfile => {
    const top: SharedProfile['top'] = {}
    for (const t of SHELVES) {
      const top3 = (rankings[t] ?? []).slice(0, 3)
      if (top3.length) top[t] = top3
    }
    return { k: 'p', n: profile.name, c: profile.avatarColor, top }
  }

  const shareLink = async () => {
    setShareOpen(false)
    const url = profileUrl(location.origin, sharedProfile())
    const r = await shareOrCopy({ title: `Perfil de ${profile.name} en ${APP_NAME}`, text: `Lo que más me ha formado según ${APP_NAME}`, url })
    if (r === 'copied') setToast('Enlace de tu perfil copiado')
  }

  const shareStoryCard = async () => {
    setGeneratingCard(true)
    try {
      const topIds: string[] = []
      for (const t of SHELVES) {
        for (const id of rankings[t] ?? []) {
          if (!topIds.includes(id)) topIds.push(id)
          if (topIds.length >= 5) break
        }
        if (topIds.length >= 5) break
      }
      const topItems = topIds.map(getItem).filter(Boolean) as any[]
      if (topItems.length === 0) {
        setToast('Ordena alguna obra antes de crear tu tarjeta')
        return
      }
      const url = profileUrl(location.origin, sharedProfile())
      const blob = await generateShareCard({ title: 'Lo que más me marcó', author: profile.name, items: topItems, shareUrl: url })
      await shareOrDownloadCard(blob, `biblioteca-${profile.name.toLowerCase().replace(/\s+/g, '-')}.png`)
      setShareOpen(false)
    } catch {
      setToast('No se pudo crear la tarjeta')
    } finally {
      setGeneratingCard(false)
    }
  }

  const hasTop = SHELVES.some((t) => (rankings[t] ?? []).length > 0)
  const place = countryName(profile.country)
  const unnamed = !profile.name || profile.name === 'Tú'

  return (
    <div className="h-full scroll-y pb-8">
      <header className="safe-top px-5 pb-2 flex items-center justify-between min-h-[52px]">
        <h1 className="text-xl font-semibold">Perfil</h1>
        <Link to="/ajustes" aria-label="Ajustes" className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-ink/80 active:bg-surface2">
          <Icon name="gear" size={22} />
        </Link>
      </header>

      <div className="px-5 space-y-7">
        {/* Cabecera: foto, nombre, @usuario, país y contadores */}
        <div>
          <div className="flex items-center gap-4">
            <Avatar name={profile.name} color={profile.avatarColor} url={profile.avatarUrl} size={80} />
            <div className="flex-1 grid grid-cols-3 text-center">
              <Counter value={stats.seen} label="vistas" />
              <Counter value={stats.pending} label="pendientes" />
              <Counter value={realFriends.length} label="amigos" />
            </div>
          </div>
          <div className="mt-3">
            <div className="serif text-[22px] font-bold leading-tight">{unnamed ? 'Sin nombre' : profile.name}</div>
            <div className="text-xs text-mute mt-0.5">
              {[authProfile?.handle ? `@${authProfile.handle}` : null, place ?? null].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Link
              to="/perfil/editar"
              className="flex-1 min-h-[40px] rounded-xl bg-surface2 border border-line text-sm font-semibold flex items-center justify-center active:scale-[0.98] transition-transform"
            >
              Editar perfil
            </Link>
            <button
              onClick={() => setShareOpen(true)}
              className="flex-1 min-h-[40px] rounded-xl bg-surface2 border border-line text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
            >
              <Icon name="share" size={15} />
              Compartir
            </button>
          </div>
          {(unnamed || (user && !authProfile?.handle)) && (
            <Link to="/perfil/editar" className="mt-3 flex items-center gap-3 p-3 rounded-2xl bg-accent/10 border border-accent/30 text-sm">
              <Icon name="edit" size={16} className="text-accent shrink-0" />
              <span className="flex-1">{unnamed ? 'Pon tu nombre para que tus amigos te reconozcan' : 'Elige tu @usuario para que te encuentren'}</span>
              <Icon name="chevron" size={16} className="text-mute" />
            </Link>
          )}
        </div>

        {/* «Lo que más me marcó» (top 3 por estantería) */}
        <section aria-label="Lo que más me marcó">
          <h2 className="serif text-[20px] font-semibold mb-3">Lo que más me marcó</h2>
          {hasTop ? (
            <div className="space-y-4">
              {SHELVES.filter((t) => (rankings[t] ?? []).length > 0).map((t) => (
                <div key={t}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="label-caps text-mute">{SHELF_LABEL[t].plural}</span>
                    <Link to={`/estanteria/${t}`} className="text-xs text-accent font-semibold flex items-center gap-1">
                      Ranking completo <Icon name="chevron" size={14} />
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(rankings[t] ?? []).slice(0, 3).map((id, i) => {
                      const it = getItem(id)
                      if (!it) return null
                      return (
                        <Link key={id} to={`/i/${encodeURIComponent(id)}`}>
                          <div className="relative">
                            <Poster item={it} layoutId={posterLayoutId(it.id)} style={{ borderRadius: 14 }} className="w-full aspect-[2/3] border border-line" />
                            <span className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-accent text-accent-ink text-xs font-bold flex items-center justify-center">{i + 1}</span>
                          </div>
                          <div className="serif text-sm font-semibold leading-tight mt-1.5 line-clamp-2">{it.title}</div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Link to="/comparar" className="block text-sm text-mute rounded-3xl border border-dashed border-line p-4">
              Cuando ordenes tus obras en <span className="text-accent font-semibold">Comparar</span>, aquí saldrá tu top 3 de cada estantería.
            </Link>
          )}
        </section>

        {/* Mis números */}
        <section aria-label="Estadísticas">
          <h2 className="serif text-[20px] font-semibold mb-3">Mis números</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {SHELVES.map((t) => (
              <Link key={t} to={`/estanteria/${t}`} className="bg-surface rounded-2xl border border-line p-3 active:bg-surface2">
                <div className="text-2xl font-bold tabular-nums leading-none">{stats.perShelf[t] ?? 0}</div>
                <div className="text-xs text-mute mt-1 truncate">{`${SHELF_LABEL[t].plural} ${SHELF_LABEL[t].seen}`}</div>
              </Link>
            ))}
            <div className="bg-surface rounded-2xl border border-line p-3">
              <div className="text-lg font-bold leading-none truncate">{stats.topGenre ?? '—'}</div>
              <div className="text-xs text-mute mt-1">Tu género más frecuente</div>
            </div>
          </div>
        </section>

        {/* Amigos y afinidad */}
        <section aria-label="Amigos">
          <div className="flex items-center justify-between mb-3">
            <h2 className="serif text-[20px] font-semibold">Amigos</h2>
            {user && (
              <button
                onClick={() => setFindFriends(true)}
                className="min-h-[36px] px-3.5 rounded-full bg-accent text-accent-ink text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform"
              >
                <Icon name="plus" size={14} />
                Añadir
              </button>
            )}
          </div>

          {aff.length > 0 ? (
            <ul className="space-y-2.5">
              {aff.map(({ f, a }) => (
                <li key={f.id} className="flex items-center gap-3 bg-surface rounded-2xl border border-line p-3">
                  <Avatar name={f.name} color={f.avatarColor} url={f.avatarUrl} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">
                      {f.name} {!user && <span className="text-[10px] text-mute font-normal">(ejemplo)</span>}
                    </div>
                    {a !== null ? (
                      <div className="h-1.5 rounded-full bg-line mt-1.5 overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${a}%` }} />
                      </div>
                    ) : (
                      <div className="text-xs text-mute">Aún sin obras en común</div>
                    )}
                  </div>
                  {a !== null && <div className="text-base font-bold tabular-nums text-accent">{a}%</div>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="bg-surface rounded-3xl border border-line p-5 text-center space-y-2.5">
              <div className="w-10 h-10 rounded-2xl bg-surface2 mx-auto flex items-center justify-center text-accent">
                <Icon name="user" size={20} />
              </div>
              <div className="font-semibold text-sm">Sin amigos conectados</div>
              <p className="text-xs text-mute max-w-xs mx-auto leading-relaxed">
                {user
                  ? 'Invita a tus amigos uno a uno o búscalos en tus contactos. Veréis vuestra afinidad y qué os recomendáis.'
                  : 'Entra con tu cuenta desde Ajustes para conectar con tus amigos.'}
              </p>
            </div>
          )}
        </section>
      </div>

      {shareOpen && (
        <Sheet label="Compartir perfil" onClose={() => setShareOpen(false)} height="auto">
          <h3 className="serif text-lg font-bold mb-3">Compartir tu perfil</h3>
          <div className="space-y-2.5 pb-2">
            <button onClick={shareLink} className="w-full min-h-[52px] rounded-2xl bg-surface2 border border-line px-4 flex items-center gap-3 text-sm font-semibold active:scale-[0.98] transition-transform">
              <Icon name="link" size={18} />
              Enviar enlace
            </button>
            <button
              onClick={shareStoryCard}
              disabled={generatingCard}
              className="w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink px-4 flex items-center gap-3 text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              <Icon name="cards" size={18} />
              {generatingCard ? 'Creando la tarjeta…' : 'Tarjeta para Story'}
            </button>
          </div>
        </Sheet>
      )}

      {findFriends && <FindFriends onClose={() => setFindFriends(false)} onToast={setToast} />}
      <AnimatePresence>{toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}

function Counter({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-lg font-bold tabular-nums leading-none">{value}</div>
      <div className="text-[11px] text-mute mt-1">{label}</div>
    </div>
  )
}
