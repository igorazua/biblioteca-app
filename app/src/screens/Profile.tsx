import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { friends, getItem, items } from '../data/catalog'
import { APP_NAME, AVATAR_COLORS, PLATFORMS } from '../config'
import { useStore } from '../store/useStore'
import { useRanks } from '../store/useScores'
import { friendRanks } from '../lib/rank'
import { SHELVES, SHELF_LABEL } from '../types'
import { affinity } from '../lib/affinity'
import { profileUrl, type SharedProfile } from '../lib/share'
import { shareOrCopy } from '../lib/shareUi'
import { Poster } from '../components/Poster'
import { Avatar, Chip, Confirm, Sheet, Toast } from '../components/ui'
import { Icon } from '../components/Icon'

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`w-14 h-8 rounded-full p-1 transition-colors shrink-0 ${on ? 'bg-accent' : 'bg-line'}`}>
      <span className={`block w-6 h-6 rounded-full bg-white transition-transform ${on ? 'translate-x-6' : ''}`} />
    </button>
  )
}

export function Profile() {
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)
  const entries = useStore((s) => s.entries)
  const rankings = useStore((s) => s.rankings)
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const resetAll = useStore((s) => s.resetAll)
  const loadSample = useStore((s) => s.loadSample)
  const ranks = useRanks()
  const [toast, setToast] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [picked, setPicked] = useState<{ name: string; tel: string }[]>([])
  // Contact Picker API: solo existe en Chrome Android; si no está, el botón no se muestra
  const canPick = typeof navigator !== 'undefined' && 'contacts' in navigator && typeof window !== 'undefined' && 'ContactsManager' in window
  const pickContacts = async () => {
    try {
      const nav = navigator as unknown as { contacts: { select: (p: string[], o: { multiple: boolean }) => Promise<{ name?: string[]; tel?: string[] }[]> } }
      const res = await nav.contacts.select(['name', 'tel'], { multiple: true })
      setPicked(res.map((c) => ({ name: c.name?.[0] ?? 'Sin nombre', tel: (c.tel?.[0] ?? '').replace(/\D/g, '') })))
    } catch { /* el usuario canceló */ }
  }

  const stats = useMemo(() => {
    const seen = Object.values(entries).filter((e) => e.status === 'seen')
    const perShelf = Object.fromEntries(SHELVES.map((t) => [t, seen.filter((e) => getItem(e.itemId)?.type === t).length])) as Record<string, number>
    const genres: Record<string, number> = {}
    for (const e of seen) for (const g of getItem(e.itemId)?.genres ?? []) genres[g] = (genres[g] ?? 0) + 1
    const topGenre = Object.entries(genres).sort((a, b) => b[1] - a[1])[0]?.[0]
    return { perShelf, topGenre }
  }, [entries])

  const aff = useMemo(
    () =>
      friends.map((f) => {
        // afinidad por percentiles: compara rankings de distinto tamaño (D25)
        const mine = Object.fromEntries(Object.entries(ranks).map(([id, r]) => [id, r.pct]))
        const theirs = Object.fromEntries(Object.entries(friendRanks(f, getItem)).map(([id, r]) => [id, r.pct]))
        return { f, a: affinity(mine, theirs) }
      }).sort((x, y) => (y.a ?? -1) - (x.a ?? -1)),
    [ranks],
  )

  const sharedProfile = (): SharedProfile => ({ k: 'p', n: profile.name, c: profile.avatarColor, top: Object.fromEntries(SHELVES.map((t) => [t, (rankings[t] ?? []).slice(0, 3)])) })
  const shareProfile = async () => {
    const url = profileUrl(location.origin, sharedProfile())
    setLink(url)
    const m = await shareOrCopy({ title: `${profile.name} en ${APP_NAME}`, text: `Mira lo que más me ha marcado: `, url })
    if (m) setToast(m)
  }
  const hasTop = SHELVES.some((t) => (rankings[t] ?? []).length > 0)

  return (
    <div className="h-full scroll-y pb-8">
      <header className="safe-top px-5 pb-4 flex items-center gap-4">
        <button onClick={() => setColorOpen(true)} aria-label="Cambiar el color del avatar" className="relative shrink-0 active:scale-95 transition-transform">
          <Avatar name={profile.name} color={profile.avatarColor} size={64} />
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface2 border border-line flex items-center justify-center text-mute"><Icon name="edit" size={12} /></span>
        </button>
        <div className="flex-1 min-w-0">
          <input value={profile.name} onChange={(e) => setProfile({ name: e.target.value.slice(0, 24) })} aria-label="Tu nombre" className="w-full bg-transparent text-2xl font-semibold focus:outline-none focus:border-b focus:border-accent" />
          <div className="flex items-center gap-2 mt-1 text-sm text-mute">
            Nacido en
            <input
              value={profile.birthYear ?? ''}
              onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setProfile({ birthYear: v ? parseInt(v, 10) : undefined }) }}
              inputMode="numeric" placeholder="----" aria-label="Año de nacimiento"
              className="w-16 bg-surface border border-line rounded-lg px-2 min-h-[32px] text-center text-ink focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      </header>

      <div className="px-5 space-y-7">
        <section aria-label="Plataformas">
          <h2 className="text-sm font-semibold text-mute uppercase tracking-wide mb-2">Mis plataformas</h2>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => <Chip key={p} active={profile.platforms.includes(p)} onClick={() => setProfile({ platforms: profile.platforms.includes(p) ? profile.platforms.filter((x) => x !== p) : [...profile.platforms, p] })}>{p}</Chip>)}
          </div>
        </section>

        <section aria-label="Lo que más me marcó">
          <h2 className="serif text-[22px] font-semibold mb-3">Lo que más me marcó</h2>
          {hasTop ? (
            <div className="space-y-5">
              {SHELVES.map((t) => ((rankings[t]?.length ?? 0) > 0) && (
                <div key={t}>
                  <div className="text-xs text-accent font-semibold uppercase tracking-wider mb-2">{SHELF_LABEL[t].plural}</div>
                  <div className="grid grid-cols-3 gap-3">
                    {(rankings[t] ?? []).slice(0, 3).map((id, i) => {
                      const it = getItem(id)
                      if (!it) return null
                      return (
                        <Link key={id} to={`/i/${encodeURIComponent(id)}`}>
                          <div className="relative">
                            <Poster item={it} className="w-full aspect-[2/3] rounded-2xl border border-line" />
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
          ) : <p className="text-sm text-mute rounded-3xl border border-dashed border-line p-4">Cuando ordenes tus obras, aquí aparecerá el top 3 de cada estantería.</p>}
        </section>

        <section aria-label="Estadísticas">
          <h2 className="serif text-[22px] font-semibold mb-3">Mis números</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {SHELVES.map((t) => <Stat key={t} label={`${SHELF_LABEL[t].plural} ${SHELF_LABEL[t].seen}`} value={String(stats.perShelf[t] ?? 0)} />)}
            <Stat label="Género más frecuente" value={stats.topGenre ?? '—'} small className="col-span-2" />
          </div>
        </section>

        <section aria-label="Amigos">
          <h2 className="serif text-[22px] font-semibold mb-3">Amigos</h2>
          <ul className="space-y-2.5">
            {aff.map(({ f, a }) => (
              <li key={f.id} className="flex items-center gap-3 bg-surface rounded-2xl border border-line p-3">
                <Avatar name={f.name} color={f.avatarColor} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{f.name}</div>
                  {a !== null ? (
                    <div className="h-1.5 rounded-full bg-line mt-1.5 overflow-hidden"><div className="h-full bg-accent rounded-full" style={{ width: `${a}%` }} /></div>
                  ) : <div className="text-xs text-mute">Aún no hay datos</div>}
                </div>
                {a !== null && <div className="text-lg font-bold tabular-nums text-accent">{a}%</div>}
              </li>
            ))}
          </ul>
          {canPick && (
            <div className="mt-3">
              <button onClick={pickContacts} className="min-h-[46px] px-4 rounded-2xl bg-surface border border-line text-sm font-medium flex items-center gap-2"><Icon name="user" size={17} /> Buscar en mis contactos</button>
              {picked.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {picked.map((c, i) => (
                    <li key={i} className="flex items-center gap-3 bg-surface rounded-2xl border border-line p-3">
                      <Avatar name={c.name} color="#5b5b63" size={36} />
                      <div className="flex-1 min-w-0"><div className="font-medium truncate">{c.name}</div><div className="text-xs text-mute">Aún no usan la app</div></div>
                      <a href={`https://wa.me/${c.tel}?text=${encodeURIComponent(`Mira ${APP_NAME}, la estoy probando: guarda y valora lo que te ha formado.`)}`} target="_blank" rel="noopener noreferrer" className="min-h-[40px] px-3 rounded-xl bg-[#1f3a2a] text-[#7de0a5] text-sm font-medium flex items-center">Invitar</a>
                    </li>
                  ))}
                  <li className="text-[11px] text-mute">Solo se muestran aquí; no se suben a ningún sitio.</li>
                </ul>
              )}
            </div>
          )}
          <p className="text-xs text-mute mt-2">Afinidad = coincidencia de notas en las obras que tenéis en común (mínimo 3). Amigos simulados.</p>
        </section>

        <section aria-label="Compartir">
          <button onClick={shareProfile} className="w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold flex items-center justify-center gap-2"><Icon name="share" size={18} /> Compartir mi perfil</button>
          {link && (
            <div className="mt-2 rounded-2xl bg-surface2 p-3 text-xs break-all select-text"><div className="text-mute mb-1">Link de tu perfil:</div><a href={link} className="text-accent underline">{link}</a></div>
          )}
        </section>

        <section aria-label="Ajustes">
          <h2 className="serif text-[22px] font-semibold mb-3">Ajustes</h2>
          <div className="rounded-3xl bg-surface border border-line divide-y divide-line">
            <div className="flex items-center gap-3 p-4"><span className="flex-1 text-[15px]">Valorar al guardar en Descubrir<span className="block text-xs text-mute">Abre la hoja de estrellas y comentario al marcar «vista»</span></span><Toggle on={settings.rateOnSwipe !== false} onChange={(v) => setSettings({ rateOnSwipe: v })} label="Valorar al guardar en Descubrir" /></div>
            <div className="flex items-center gap-3 p-4"><span className="flex-1 text-[15px]">Preguntar un comentario al comparar</span><Toggle on={settings.commentBoxInPairs} onChange={(v) => setSettings({ commentBoxInPairs: v })} label="Comentario al comparar" /></div>
            <button onClick={() => { loadSample(); setToast('Datos de ejemplo cargados') }} className="w-full text-left p-4 text-[15px] flex items-center gap-2"><Icon name="sparkle" size={18} className="text-accent" /> Cargar datos de ejemplo</button>
            <button onClick={() => setConfirm(true)} className="w-full text-left p-4 text-[15px] text-stamp-red flex items-center gap-2"><Icon name="trash" size={18} /> Reiniciar demo</button>
          </div>
        </section>

        <section aria-label="Acerca de" className="text-xs text-mute space-y-2 pb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Acerca de</h2>
          <p>{APP_NAME} es una demo navegable: todo se guarda en tu navegador, sin cuentas ni servidor. Los amigos son simulados.</p>
          <p>Este producto usa la API de TMDB pero no está respaldado ni certificado por TMDB.</p>
          <p>Portadas de libros: Open Library. Catálogo de demo: {items.length} obras.</p>
        </section>
      </div>

      {colorOpen && (
        <Sheet label="Color del avatar" onClose={() => setColorOpen(false)} height="30%">
          <h3 className="font-semibold text-lg mb-3">Color de tu avatar</h3>
          <div className="flex gap-3 flex-wrap" role="radiogroup" aria-label="Color del avatar">
            {AVATAR_COLORS.map((c) => (
              <button key={c} role="radio" aria-checked={c === profile.avatarColor} aria-label={`Color ${c}`} onClick={() => { setProfile({ avatarColor: c }); setColorOpen(false) }} className={`w-12 h-12 rounded-full border-2 ${c === profile.avatarColor ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />
            ))}
          </div>
        </Sheet>
      )}
      {confirm && <Confirm title="¿Reiniciar la demo?" text="Se borrarán tus valoraciones, listas y ajustes de este navegador. Vuelves al principio." confirmLabel="Reiniciar" onCancel={() => setConfirm(false)} onConfirm={() => { resetAll(); setConfirm(false) }} />}
      <AnimatePresence>{toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}

function Stat({ label, value, small, className = '' }: { label: string; value: string; small?: boolean; className?: string }) {
  return (
    <div className={`rounded-2xl bg-surface border border-line p-3.5 ${className}`}>
      <div className={`font-semibold ${small ? 'text-lg' : 'text-2xl'} serif`}>{value}</div>
      <div className="text-xs text-mute mt-0.5">{label}</div>
    </div>
  )
}
