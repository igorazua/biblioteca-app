// app/src/screens/Profile.tsx
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { friends, getItem } from '../data/catalog'
import { APP_NAME, AVATAR_COLORS } from '../config'
import { useStore } from '../store/useStore'
import { useRanks } from '../store/useScores'
import { friendRanks } from '../lib/rank'
import { SHELVES, SHELF_LABEL } from '../types'
import { affinity } from '../lib/affinity'
import { profileUrl, type SharedProfile } from '../lib/share'
import { shareOrCopy } from '../lib/shareUi'
import { generateShareCard, shareOrDownloadCard } from '../lib/shareCard'
import { Poster, posterLayoutId } from '../components/Poster'
import { Avatar, Sheet, Toast } from '../components/ui'
import { Icon } from '../components/Icon'
import { useAuth, checkHandleAvailability } from '../store/useAuth'
import { useFriends } from '../store/useFriends'
import { supabase } from '../lib/supabase'
import { FindFriends } from '../components/FindFriends'

async function processAvatarImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context error'))
        return
      }
      const size = Math.min(img.naturalWidth, img.naturalHeight)
      const sx = (img.naturalWidth - size) / 2
      const sy = (img.naturalHeight - size) / 2
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 256, 256)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create blob'))
        },
        'image/webp',
        0.85
      )
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}

export function Profile() {
  const nav = useNavigate()
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)
  const entries = useStore((s) => s.entries)
  const rankings = useStore((s) => s.rankings)
  const ranks = useRanks()

  const { user, profile: authProfile } = useAuth()
  const { realFriends } = useFriends()

  const [toast, setToast] = useState<string | null>(null)
  const [colorOpen, setColorOpen] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [findFriends, setFindFriends] = useState(false)
  const [generatingCard, setGeneratingCard] = useState(false)

  // Subir avatar
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const blob = await processAvatarImage(file)
      if (user && supabase) {
        const filePath = `${user.id}/avatar.webp`
        const { error: uploadError } = await supabase.storage
          .from('biblio-avatars')
          .upload(filePath, blob, { contentType: 'image/webp', upsert: true })
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('biblio-avatars')
          .getPublicUrl(filePath)
        const avatarUrl = `${publicUrl}?v=${Date.now()}`

        await supabase
          .from('biblio_profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', user.id)

        useAuth.setState((s) => ({
          profile: s.profile ? { ...s.profile, avatarUrl } : null,
        }))
        setProfile({ avatarUrl })
        setToast('Foto de perfil actualizada')
      } else {
        const reader = new FileReader()
        reader.onload = () => {
          const avatarUrl = reader.result as string
          setProfile({ avatarUrl })
          setToast('Foto de perfil actualizada')
        }
        reader.readAsDataURL(blob)
      }
    } catch {
      setToast('Error al subir la foto')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  // Handle @usuario
  const [handleInput, setHandleInput] = useState(authProfile?.handle || '')
  const [handleCheck, setHandleCheck] = useState<{ checked: boolean; available?: boolean; message?: string }>({ checked: false })
  const [savingHandle, setSavingHandle] = useState(false)

  const handleSaveHandle = async () => {
    if (!user || !handleInput.trim() || savingHandle) return
    setSavingHandle(true)
    try {
      const h = handleInput.trim().toLowerCase()
      const res = await checkHandleAvailability(h, user.id)
      setHandleCheck({ checked: true, ...res })
      if (res.available && supabase) {
        await supabase
          .from('biblio_profiles')
          .update({ handle: h })
          .eq('id', user.id)
        useAuth.setState((s) => ({
          profile: s.profile ? { ...s.profile, handle: h } : null,
        }))
        setToast(`@${h} guardado como tu usuario`)
      }
    } catch {
      setToast('Error al guardar el @usuario')
    } finally {
      setSavingHandle(false)
    }
  }

  // Estadísticas
  const stats = useMemo(() => {
    const list = Object.values(entries)
    const perShelf: Record<string, number> = {}
    for (const t of SHELVES) {
      perShelf[t] = list.filter((e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === t).length
    }
    const genreCounts: Record<string, number> = {}
    for (const e of list) {
      if (e.status !== 'seen') continue
      const it = getItem(e.itemId)
      for (const g of it?.genres ?? []) genreCounts[g] = (genreCounts[g] ?? 0) + 1
    }
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    return { perShelf, topGenre }
  }, [entries])

  // Afinidad con amigos
  const activeFriends = realFriends.length > 0 ? realFriends : (user ? [] : friends)
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

  const shareProfile = async () => {
    const url = profileUrl(location.origin, sharedProfile())
    setLink(url)
    const r = await shareOrCopy({ title: `Perfil de ${profile.name} en ${APP_NAME}`, text: `Lo que más me ha formado según ${APP_NAME}`, url })
    if (r === 'copied') setToast('Enlace de tu perfil copiado')
  }

  const handleShareStoryCard = async () => {
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
        setToast('Ordena alguna obra antes de generar tu tarjeta')
        return
      }
      const url = profileUrl(location.origin, sharedProfile())
      const blob = await generateShareCard({
        title: 'Lo que más me marcó',
        author: profile.name,
        items: topItems,
        shareUrl: url,
      })
      await shareOrDownloadCard(blob, `biblioteca-${profile.name.toLowerCase().replace(/\s+/g, '-')}.png`)
    } catch {
      setToast('Error al generar la tarjeta')
    } finally {
      setGeneratingCard(false)
    }
  }

  const hasTop = SHELVES.some((t) => (rankings[t] ?? []).length > 0)

  return (
    <div className="h-full scroll-y pb-8">
      {/* Cabecera con botón visible de Ajustes */}
      <header className="safe-top px-5 pb-3 flex items-center justify-between min-h-[52px]">
        <span className="label-caps text-mute">Tu perfil público</span>
        <Link
          to="/ajustes"
          className="min-h-[38px] px-3.5 rounded-full bg-surface border border-line flex items-center gap-1.5 text-xs font-semibold text-ink/80 hover:text-ink active:scale-95 transition-all shadow-sm"
        >
          <Icon name="gear" size={16} />
          <span>Ajustes</span>
        </Link>
      </header>

      <div className="px-5 space-y-6">
        {/* Cabecera del usuario: Foto, Nombre y Handle */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar name={profile.name} color={profile.avatarColor} url={profile.avatarUrl} size={68} />
            <input
              type="file"
              ref={avatarInputRef}
              onChange={handleAvatarFile}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label="Cambiar foto de perfil"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-surface border border-line flex items-center justify-center text-ink shadow active:scale-90 transition-transform"
            >
              {uploadingAvatar ? (
                <span className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icon name="camera" size={13} />
              )}
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <input
                value={profile.name}
                onChange={(e) => setProfile({ name: e.target.value })}
                placeholder="Tu nombre"
                className="serif text-[24px] font-bold bg-transparent border-b border-transparent focus:border-accent focus:outline-none w-full"
              />
            </div>
            {user && (
              <div className="text-xs text-mute mt-0.5">
                {authProfile?.handle ? `@${authProfile.handle}` : 'Sin @usuario configurado'}
              </div>
            )}
            <button
              onClick={() => setColorOpen(true)}
              className="text-xs text-accent mt-1 hover:underline inline-block"
            >
              Cambiar color del avatar
            </button>
          </div>
        </div>

        {/* Configurar handle si está logueado y no tiene */}
        {user && !authProfile?.handle && (
          <div className="p-3.5 rounded-2xl bg-surface border border-line space-y-2">
            <span className="text-xs font-semibold text-mute">Elige tu @usuario para compartir:</span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mute text-xs">@</span>
                <input
                  type="text"
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="tu_usuario"
                  maxLength={20}
                  className="w-full bg-surface2 border border-line rounded-xl pl-7 pr-3 min-h-[38px] text-xs focus:outline-none focus:border-accent"
                />
              </div>
              <button
                onClick={handleSaveHandle}
                disabled={savingHandle || !handleInput.trim()}
                className="px-3 rounded-xl bg-accent text-accent-ink text-xs font-semibold active:scale-95 transition-transform disabled:opacity-50"
              >
                {savingHandle ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
            {handleCheck.checked && !handleCheck.available && (
              <p className="text-[11px] text-stamp-red">{handleCheck.message}</p>
            )}
          </div>
        )}

        {/* «Lo que más me marcó» (Top 3 por estantería) */}
        <section aria-label="Lo que más me marcó">
          <h2 className="serif text-[22px] font-semibold mb-3">Lo que más me marcó</h2>
          {hasTop ? (
            <div className="space-y-4">
              {SHELVES.filter((t) => (rankings[t] ?? []).length > 0).map((t) => (
                <div key={t} className="rounded-3xl bg-surface border border-line p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="label-caps text-mute">{SHELF_LABEL[t].plural}</span>
                    <Link to={`/estanteria/${t}`} className="text-xs text-accent font-semibold flex items-center gap-1">
                      Ver ranking <Icon name="chevron" size={14} />
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(rankings[t] ?? []).slice(0, 3).map((id, i) => {
                      const it = getItem(id)
                      if (!it) return null
                      return (
                        <Link key={id} to={`/i/${encodeURIComponent(id)}`}>
                          <div className="relative">
                            <Poster item={it} layoutId={posterLayoutId(it.id)} style={{ borderRadius: 16 }} className="w-full aspect-[2/3] border border-line" />
                            <span className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-accent text-accent-ink text-xs font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                          </div>
                          <div className="serif text-sm font-semibold leading-tight mt-1.5 line-clamp-2">{it.title}</div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={shareProfile}
                  className="flex-1 min-h-[44px] rounded-2xl bg-surface border border-line text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Icon name="share" size={16} />
                  Compartir enlace
                </button>
                <button
                  onClick={handleShareStoryCard}
                  disabled={generatingCard}
                  className="flex-1 min-h-[44px] rounded-2xl bg-accent text-accent-ink text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Icon name="cards" size={16} />
                  {generatingCard ? 'Creando…' : 'Tarjeta para Story'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-mute rounded-3xl border border-dashed border-line p-4">
              Cuando ordenes tus obras con Comparar, aquí aparecerá el top 3 de cada estantería.
            </p>
          )}
        </section>

        {/* Mis números */}
        <section aria-label="Estadísticas">
          <h2 className="serif text-[22px] font-semibold mb-3">Mis números</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {SHELVES.map((t) => (
              <Stat key={t} label={`${SHELF_LABEL[t].plural} ${SHELF_LABEL[t].seen}`} value={String(stats.perShelf[t] ?? 0)} />
            ))}
            <Stat label="Género más frecuente" value={stats.topGenre ?? '—'} small className="col-span-2" />
          </div>
        </section>

        {/* Amigos y afinidad */}
        <section aria-label="Amigos">
          <div className="flex items-center justify-between mb-3">
            <h2 className="serif text-[22px] font-semibold">Amigos</h2>
            {user && (
              <button
                onClick={() => setFindFriends(true)}
                className="min-h-[36px] px-3.5 rounded-full bg-accent text-accent-ink text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform"
              >
                <Icon name="plus" size={14} />
                Añadir amigos
              </button>
            )}
          </div>

          {aff.length > 0 ? (
            <ul className="space-y-2.5">
              {aff.map(({ f, a }) => (
                <li key={f.id} className="flex items-center gap-3 bg-surface rounded-2xl border border-line p-3">
                  <Avatar name={f.name} color={f.avatarColor} url={f.avatarUrl} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{f.name} {!user && <span className="text-[10px] text-mute font-normal">(ejemplo)</span>}</div>
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
                Invita a tus amigos uno a uno o búscalos en tus contactos. Al conectar veréis vuestra afinidad y qué os recomendáis.
              </p>
            </div>
          )}
        </section>

        {/* Acceso a Importar y Ajustes */}
        <section className="space-y-2.5 pt-2">
          <Link
            to="/importar"
            className="flex items-center justify-between p-4 rounded-3xl bg-surface border border-line hover:border-accent active:bg-surface2 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
                <Icon name="sparkle" size={18} />
              </span>
              <div>
                <div className="font-semibold text-sm">Importar mis listas</div>
                <div className="text-xs text-mute">Letterboxd, IMDb, Goodreads o Netflix</div>
              </div>
            </div>
            <Icon name="chevron" size={16} className="text-mute" />
          </Link>

          <Link
            to="/ajustes"
            className="flex items-center justify-between p-4 rounded-3xl bg-surface border border-line hover:border-accent active:bg-surface2 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-surface2 text-mute flex items-center justify-center">
                <Icon name="gear" size={18} />
              </span>
              <div>
                <div className="font-semibold text-sm">Ajustes y cuenta</div>
                <div className="text-xs text-mute">Preferencias, plataformas, nube y avisos</div>
              </div>
            </div>
            <Icon name="chevron" size={16} className="text-mute" />
          </Link>
        </section>

        {link && (
          <div className="rounded-2xl bg-surface2 p-3 text-xs break-all select-text">
            <div className="text-mute mb-1">Enlace de tu perfil:</div>
            <a href={link} className="text-accent underline">{link}</a>
          </div>
        )}
      </div>

      {colorOpen && (
        <Sheet label="Color del avatar" onClose={() => setColorOpen(false)} height="auto">
          <h3 className="serif text-lg font-bold mb-3">Elige tu color</h3>
          <div className="flex gap-3 flex-wrap justify-center py-2">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                aria-label={`Color ${c}`}
                onClick={() => {
                  setProfile({ avatarColor: c })
                  setColorOpen(false)
                }}
                className={`w-12 h-12 rounded-full border-2 transition-transform ${
                  c === profile.avatarColor ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </Sheet>
      )}

      {findFriends && <FindFriends onClose={() => setFindFriends(false)} onToast={setToast} />}
      <AnimatePresence>
        {toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}

function Stat({ label, value, small, className = '' }: { label: string; value: string; small?: boolean; className?: string }) {
  return (
    <div className={`bg-surface rounded-2xl border border-line p-3 ${className}`}>
      <div className={`font-bold tabular-nums leading-none ${small ? 'text-lg' : 'text-2xl'}`}>{value}</div>
      <div className="text-xs text-mute mt-1 truncate">{label}</div>
    </div>
  )
}
