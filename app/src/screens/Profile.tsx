// app/src/screens/Profile.tsx
// Perfil: lo que ven los demás de ti. Aquí no se edita nada: «Editar perfil» abre tus datos y el engranaje, los Ajustes.
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { friends, getItem } from '../data/catalog'
import { APP_NAME } from '../config'
import { useStore } from '../store/useStore'
import { useRanks } from '../store/useScores'
import { friendRanks } from '../lib/rank'
import { ACTIVE_SHELVES, SHELVES, SHELF_LABEL } from '../types'
import { affinity } from '../lib/affinity'
import { profileUrl, type SharedProfile } from '../lib/share'
import { shareOrCopy } from '../lib/shareUi'
import { generateShareCard, shareOrDownloadCard } from '../lib/shareCard'
import { countryName } from '../lib/countries'
import { Poster, posterLayoutId } from '../components/Poster'
import { posterAspectClass, posterRadius } from '../lib/posterShape'
import { Avatar, Sheet, Toast } from '../components/ui'
import { Icon } from '../components/Icon'
import { ScreenTitle } from '../components/ScreenTitle'
import { Button } from '../components/Button'
import { useAuth } from '../store/useAuth'
import { useFriends } from '../store/useFriends'
import { FindFriends } from '../components/FindFriends'

export function Profile() {
  const nav = useNavigate()
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
    for (const t of ACTIVE_SHELVES) {
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
    for (const t of ACTIVE_SHELVES) {
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
      for (const t of ACTIVE_SHELVES) {
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

  const hasTop = ACTIVE_SHELVES.some((t) => (rankings[t] ?? []).length > 0)
  const place = countryName(profile.country)
  const unnamed = !profile.name || profile.name === 'Tú'

  return (
    <div className="h-full scroll-y pb-8 bg-bg">
      <ScreenTitle
        label="PERFIL"
        title={unnamed ? 'Tu perfil' : profile.name}
        subtitle={[authProfile?.handle ? `@${authProfile.handle}` : null, place ?? null].filter(Boolean).join(' · ')}
        action={
          <Link to="/ajustes" className="min-h-[36px] pl-2.5 pr-3.5 rounded-full bg-surface border border-line text-ink text-[13px] font-medium flex items-center gap-1.5 active:scale-95 transition-transform">
            <Icon name="gear" size={17} /> Ajustes
          </Link>
        }
      />

      <div className="px-5 space-y-7">
        {/* Cabecera: foto y contadores */}
        <div>
          <div className="flex items-center gap-4">
            <Avatar name={profile.name} color={profile.avatarColor} url={profile.avatarUrl} size={72} />
            <div className="flex-1 grid grid-cols-3 text-center">
              <Counter value={stats.seen} label="vistas" />
              <Counter value={stats.pending} label="pendientes" />
              <Counter value={realFriends.length} label="amigos" />
            </div>
          </div>
          <div className="flex gap-2.5 mt-4">
            <Button
              variant="secondary"
              onClick={() => nav('/perfil/editar')}
              className="flex-1"
            >
              Editar perfil
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShareOpen(true)}
              className="flex-1"
              icon={<Icon name="share" size={16} />}
            >
              Compartir
            </Button>
          </div>
          {(unnamed || (user && !authProfile?.handle)) && (
            <Link to="/perfil/editar" className="mt-3 flex items-center gap-3 p-3 rounded-2xl bg-surface border border-line text-meta text-mute hover:text-ink">
              <Icon name="edit" size={16} className="text-accent shrink-0" />
              <span className="flex-1">{unnamed ? 'Pon tu nombre para que tus amigos te reconozcan' : 'Elige tu @usuario para que te encuentren'}</span>
              <Icon name="chevron" size={16} className="text-mute" />
            </Link>
          )}
        </div>

        {/* «Lo que más me marcó» (top 3 por estantería) */}
        <section aria-label="Lo que más me marcó">
          <h2 className="text-title font-medium text-ink mb-3">Lo que más me marcó</h2>
          {hasTop ? (
            <div className="space-y-4">
              {ACTIVE_SHELVES.filter((t) => (rankings[t] ?? []).length > 0).map((t) => (
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
                            <Poster item={it} layoutId={posterLayoutId(it.id)} style={{ borderRadius: posterRadius(it.type, 10) }} className={`w-full ${posterAspectClass(it.type)} rounded-[10px]`} />
                            <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-accent text-accent-ink text-[11px] font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
                          </div>
                          <div className="serif text-item text-ink leading-tight mt-1.5 line-clamp-2">{it.title}</div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Link to="/comparar" className="block text-body text-mute rounded-2xl border border-dashed border-line p-4">
              Cuando ordenes tus obras en <span className="text-accent font-medium">¡Duelos!</span>, aquí saldrá tu top 3 de cada estantería.
            </Link>
          )}
        </section>

        {/* Mis números */}
        <section aria-label="Estadísticas">
          <h2 className="text-title font-medium text-ink mb-3">Mis números</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {ACTIVE_SHELVES.map((t) => (
              <Link key={t} to={`/estanteria/${t}`} className="bg-surface rounded-2xl border border-line p-3 active:bg-surface2">
                <div className="text-2xl font-semibold tabular-nums leading-none text-ink">{stats.perShelf[t] ?? 0}</div>
                <div className="text-meta text-mute mt-1.5 truncate">{`${SHELF_LABEL[t].plural} ${SHELF_LABEL[t].seen}`}</div>
              </Link>
            ))}
            <div className="bg-surface rounded-2xl border border-line p-3">
              <div className="text-lg font-semibold leading-none truncate text-ink">{stats.topGenre ?? '—'}</div>
              <div className="text-meta text-mute mt-1.5">Tu género más frecuente</div>
            </div>
          </div>
        </section>

        {/* Amigos y afinidad */}
        <section aria-label="Amigos">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-title font-medium text-ink">Amigos</h2>
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
