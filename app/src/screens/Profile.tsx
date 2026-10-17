import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { friends, getItem, items } from '../data/catalog'
import { APP_NAME, AVATAR_COLORS, PLATFORMS } from '../config'
import { ENGINE_VERSION } from '../lib/engine/params'
import { useStore } from '../store/useStore'
import { useRanks } from '../store/useScores'
import { friendRanks } from '../lib/rank'
import { SHELVES, SHELF_LABEL } from '../types'
import { affinity } from '../lib/affinity'
import { profileUrl, type SharedProfile } from '../lib/share'
import { shareOrCopy } from '../lib/shareUi'
import { generateShareCard, shareOrDownloadCard } from '../lib/shareCard'
import { Poster } from '../components/Poster'
import { Avatar, Chip, Confirm, PlatformPicker, Sheet, Toast } from '../components/ui'
import { Icon } from '../components/Icon'
import { useAuth, checkHandleAvailability } from '../store/useAuth'
import { useFriends } from '../store/useFriends'
import { pushLocalEntriesToCloud } from '../lib/sync'
import { supabase } from '../lib/supabase'

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
  const nav = useNavigate()
  const longPressTimer = useRef<number | null>(null)
  const onPointerDownVersion = () => {
    longPressTimer.current = window.setTimeout(() => {
      nav('/metricas')
    }, 800)
  }
  const onPointerUpVersion = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }
  const [toast, setToast] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [picked, setPicked] = useState<{ name: string; tel: string }[]>([])

  const { user, profile: authProfile, signInWithGoogle, signInWithOtp, signOut, deleteAccount } = useAuth()
  const { realFriends, createInvite } = useFriends()
  const [emailInput, setEmailInput] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [inviting, setInviting] = useState(false)

  const [handleInput, setHandleInput] = useState(authProfile?.handle || '')
  const [handleCheck, setHandleCheck] = useState<{ checked: boolean; available?: boolean; message?: string }>({ checked: false })
  const [savingHandle, setSavingHandle] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !supabase) return
    setUploadingAvatar(true)
    try {
      const blob = await processAvatarImage(file)
      const filePath = `${user.id}/avatar.webp`
      const { error: uploadError } = await supabase.storage
        .from('biblio-avatars')
        .upload(filePath, blob, {
          contentType: 'image/webp',
          upsert: true,
        })
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
    } catch (err: any) {
      console.error('Error subiendo avatar:', err)
      setToast('Error al subir la foto')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const [generatingCard, setGeneratingCard] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [feedbackContact, setFeedbackContact] = useState('')
  const [sendingFeedback, setSendingFeedback] = useState(false)

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
    } catch (e) {
      console.error('Error generando tarjeta:', e)
      setToast('Error al generar la tarjeta')
    } finally {
      setGeneratingCard(false)
    }
  }

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackMsg.trim() || !supabase) return
    setSendingFeedback(true)
    try {
      await supabase.from('biblio_feedback').insert({
        message: feedbackMsg.trim(),
        contact: feedbackContact.trim() || null,
        user_id: user?.id || null,
        metadata: {
          profileName: profile.name,
          version: ENGINE_VERSION,
        },
      })
      setFeedbackMsg('')
      setFeedbackContact('')
      setFeedbackOpen(false)
      setToast('¡Muchas gracias por tu feedback!')
    } catch (err) {
      console.error('Error enviando feedback:', err)
      setToast('Error enviando feedback')
    } finally {
      setSendingFeedback(false)
    }
  }

  const suggestedHandle = useMemo(() => {
    const base = authProfile?.displayName || profile.name
    return base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_.]/g, '')
      .slice(0, 15)
  }, [authProfile?.displayName, profile.name])

  const handleValidateHandle = async (val: string) => {
    const target = val.trim().toLowerCase()
    if (!target) {
      setHandleCheck({ checked: false })
      return
    }
    const res = await checkHandleAvailability(target, user?.id)
    if (res.available) {
      setHandleCheck({ checked: true, available: true, message: '¡Disponible!' })
    } else {
      setHandleCheck({ checked: true, available: false, message: res.error || 'No disponible' })
    }
  }

  const handleSaveHandle = async () => {
    const target = handleInput.trim().toLowerCase()
    if (!target) return
    setSavingHandle(true)
    const res = await checkHandleAvailability(target, user?.id)
    if (!res.available) {
      setHandleCheck({ checked: true, available: false, message: res.error || 'No disponible' })
      setSavingHandle(false)
      return
    }
    await useAuth.getState().updateProfile({ handle: target })
    setSavingHandle(false)
    setToast('¡@usuario actualizado con éxito!')
    setHandleCheck({ checked: true, available: true, message: 'Guardado ✓' })
  }

  // Contact Picker API: solo existe en Chrome Android; si no está, el botón no se muestra
  const canPick = typeof navigator !== 'undefined' && 'contacts' in navigator && typeof window !== 'undefined' && 'ContactsManager' in window
  const pickContacts = async () => {
    try {
      const nav = navigator as unknown as { contacts: { select: (p: string[], o: { multiple: boolean }) => Promise<{ name?: string[]; tel?: string[] }[]> } }
      const res = await nav.contacts.select(['name', 'tel'], { multiple: true })
      setPicked(res.map((c) => ({ name: c.name?.[0] ?? 'Sin nombre', tel: (c.tel?.[0] ?? '').replace(/\D/g, '') })))
    } catch { /* el usuario canceló */ }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput.trim()) return
    const { error } = await signInWithOtp(emailInput.trim())
    if (!error) {
      setEmailSent(true)
      setToast('¡Enlace enviado! Revisa tu email.')
    } else {
      setToast(error.message)
    }
  }

  const handleSyncNow = async () => {
    if (!user) return
    setSyncing(true)
    await pushLocalEntriesToCloud(user.id)
    setSyncing(false)
    setToast('¡Estanterías sincronizadas en la nube!')
  }

  const handleInviteFriend = async () => {
    if (!user) {
      setToast('Inicia sesión para invitar amigos reales')
      return
    }
    setInviting(true)
    const url = await createInvite()
    setInviting(false)
    if (url) {
      const msg = await shareOrCopy({
        title: `Únete a la biblioteca de ${profile.name}`,
        text: `¡Hola! Únete a mi biblioteca para ver lo que nos ha marcado y qué ver hoy: `,
        url,
      })
      if (msg) setToast(msg)
    }
  }

  const stats = useMemo(() => {
    const seen = Object.values(entries).filter((e) => e.status === 'seen')
    const perShelf = Object.fromEntries(SHELVES.map((t) => [t, seen.filter((e) => getItem(e.itemId)?.type === t).length])) as Record<string, number>
    const genres: Record<string, number> = {}
    for (const e of seen) for (const g of getItem(e.itemId)?.genres ?? []) genres[g] = (genres[g] ?? 0) + 1
    const topGenre = Object.entries(genres).sort((a, b) => b[1] - a[1])[0]?.[0]
    return { perShelf, topGenre }
  }, [entries])

  const activeFriends = realFriends.length > 0 ? realFriends : friends
  const aff = useMemo(
    () =>
      activeFriends.map((f) => {
        // afinidad por percentiles: compara rankings de distinto tamaño (D25)
        const mine = Object.fromEntries(Object.entries(ranks).map(([id, r]) => [id, r.pct]))
        const theirs = Object.fromEntries(Object.entries(friendRanks(f, getItem)).map(([id, r]) => [id, r.pct]))
        return { f, a: affinity(mine, theirs) }
      }).sort((x, y) => (y.a ?? -1) - (x.a ?? -1)),
    [ranks, activeFriends],
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
        <div className="relative shrink-0">
          <button
            onClick={() => {
              if (user) avatarInputRef.current?.click()
              else setColorOpen(true)
            }}
            disabled={uploadingAvatar}
            aria-label="Cambiar foto o color del avatar"
            className="relative block active:scale-95 transition-transform"
          >
            <Avatar name={profile.name} color={profile.avatarColor} url={profile.avatarUrl} size={64} />
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface2 border border-line flex items-center justify-center text-mute">
              {uploadingAvatar ? (
                <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icon name="camera" size={12} />
              )}
            </span>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarFile}
            className="hidden"
          />
        </div>
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
          <PlatformPicker
            value={profile.platforms}
            onChange={(platforms) => setProfile({ platforms })}
          />
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
              <div className="flex gap-2 pt-2">
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
                  {generatingCard ? 'Creando...' : 'Tarjeta para Story'}
                </button>
              </div>
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

        <section aria-label="Importar">
          <Link
            to="/importar"
            className="flex items-center gap-3.5 p-4 rounded-3xl bg-surface border border-accent/40 hover:border-accent active:bg-surface2 transition-colors"
          >
            <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
              <Icon name="sparkle" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base text-ink">Importar listas externas</div>
              <div className="text-xs text-mute">Letterboxd, IMDb, Goodreads o Netflix con tutoriales</div>
            </div>
            <span className="text-accent text-xl pr-1">›</span>
          </Link>
        </section>

        <section aria-label="Cuenta y Nube">
          <h2 className="serif text-[22px] font-semibold mb-3">Cuenta y Nube</h2>
          <div className="rounded-3xl bg-surface border border-line p-4 space-y-4">
            {user ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-sm truncate">{authProfile?.displayName || user.email}</div>
                    <div className="text-xs text-mute truncate">{authProfile?.handle ? `@${authProfile.handle} · ` : ''}{user.email}</div>
                  </div>
                  <span className="text-xs bg-stamp-green/20 text-stamp-green font-medium px-2.5 py-1 rounded-full shrink-0">Sincronizado</span>
                </div>

                <div className="p-3 bg-surface2/60 rounded-2xl border border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-mute">Tu @usuario</span>
                    {handleCheck.checked && (
                      <span className={`text-[11px] font-medium ${handleCheck.available ? 'text-stamp-green' : 'text-stamp-red'}`}>
                        {handleCheck.message}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mute text-xs">@</span>
                      <input
                        type="text"
                        value={handleInput}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '')
                          setHandleInput(val)
                          setHandleCheck({ checked: false })
                        }}
                        onBlur={() => handleValidateHandle(handleInput)}
                        placeholder={suggestedHandle}
                        maxLength={20}
                        className="w-full bg-surface border border-line rounded-xl pl-7 pr-3 min-h-[38px] text-xs focus:outline-none focus:border-accent"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveHandle}
                      disabled={savingHandle || !handleInput.trim() || handleInput === authProfile?.handle}
                      className="px-3 min-h-[38px] rounded-xl bg-accent text-accent-ink text-xs font-semibold disabled:opacity-40"
                    >
                      {savingHandle ? '...' : 'Guardar'}
                    </button>
                  </div>
                  {!handleInput && suggestedHandle && (
                    <button
                      type="button"
                      onClick={() => {
                        setHandleInput(suggestedHandle)
                        handleValidateHandle(suggestedHandle)
                      }}
                      className="text-[11px] text-accent/80 hover:underline"
                    >
                      Sugerencia: @{suggestedHandle}
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSyncNow}
                    disabled={syncing}
                    className="flex-1 min-h-[44px] rounded-xl bg-surface2 border border-line text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <Icon name="check" size={16} />
                    {syncing ? 'Subiendo...' : 'Sincronizar'}
                  </button>
                  <button
                    onClick={handleInviteFriend}
                    disabled={inviting}
                    className="flex-1 min-h-[44px] rounded-xl bg-accent text-accent-ink text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <Icon name="plus" size={16} />
                    {inviting ? 'Generando...' : 'Invitar amigo'}
                  </button>
                </div>

                <div className="pt-2 border-t border-line flex justify-between text-xs">
                  <button onClick={signOut} className="text-mute hover:text-ink">Cerrar sesión</button>
                  <button onClick={() => setDeleteConfirm(true)} className="text-stamp-red/80 hover:text-stamp-red">Borrar mi cuenta</button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="font-semibold text-sm">Modo invitado (demo local)</div>
                  <p className="text-xs text-mute mt-1">Tus datos viven en este móvil. Entra para sincronizarlos y conectar con tus amigos reales:</p>
                </div>

                <button
                  onClick={() => signInWithGoogle()}
                  className="w-full min-h-[44px] rounded-xl bg-white text-black text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                  Entrar con Google
                </button>

                {emailSent ? (
                  <div className="p-3 bg-surface2 rounded-xl text-xs text-accent">
                    Enlace enviado a {emailInput}. Ábrelo para iniciar sesión.
                  </div>
                ) : (
                  <form onSubmit={handleEmailLogin} className="flex gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Tu email..."
                      required
                      className="flex-1 min-h-[40px] bg-surface2 border border-line rounded-xl px-3 text-xs focus:outline-none focus:border-accent"
                    />
                    <button type="submit" className="min-h-[40px] px-3 bg-surface2 border border-line rounded-xl text-xs font-semibold hover:border-accent">
                      Enviar enlace
                    </button>
                  </form>
                )}
              </>
            )}
            <p className="text-[11px] text-mute pt-1 border-t border-line/60">
              Privacidad: Tus notas solo se comparten con los amigos a los que invites o tus listas compartidas.
            </p>
          </div>
        </section>

        <section aria-label="Ajustes">
          <h2 className="serif text-[22px] font-semibold mb-3">Ajustes</h2>
          <div className="rounded-3xl bg-surface border border-line divide-y divide-line">
            <div className="flex items-center gap-3 p-4"><span className="flex-1 text-[15px]">Valorar al guardar en Descubrir<span className="block text-xs text-mute">Abre la hoja de estrellas y comentario al marcar «vista»</span></span><Toggle on={settings.rateOnSwipe !== false} onChange={(v) => setSettings({ rateOnSwipe: v })} label="Valorar al guardar en Descubrir" /></div>
            <div className="flex items-center gap-3 p-4"><span className="flex-1 text-[15px]">Preguntar un comentario al comparar</span><Toggle on={settings.commentBoxInPairs} onChange={(v) => setSettings({ commentBoxInPairs: v })} label="Comentario al comparar" /></div>
            <button onClick={() => setFeedbackOpen(true)} className="w-full text-left p-4 text-[15px] flex items-center gap-2"><Icon name="message" size={18} className="text-accent" /> Enviar feedback o sugerencias</button>
            <button onClick={() => { loadSample(); setToast('Datos de ejemplo cargados') }} className="w-full text-left p-4 text-[15px] flex items-center gap-2"><Icon name="sparkle" size={18} className="text-accent" /> Cargar datos de ejemplo</button>
            <button onClick={() => setConfirm(true)} className="w-full text-left p-4 text-[15px] text-stamp-red flex items-center gap-2"><Icon name="trash" size={18} /> Reiniciar demo</button>
          </div>
        </section>

        <section aria-label="Fuentes" className="text-xs text-mute space-y-2 pb-6 border-t border-line/60 pt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Fuentes y atribución</h2>
          <p>{APP_NAME} es una app social para guardar y compartir lo que te ha formado. Los datos se sincronizan con Supabase.</p>
          <div className="flex items-center gap-3 py-1">
            <svg className="h-3 w-auto fill-[#01d277] shrink-0" viewBox="0 0 185 16" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.9 0H0v3.4h4.6v12.2h3.7V3.4h4.6V0zm16.5 0h-3.8l-4.1 7.4L17.4 0h-3.8v15.6h3.6V5.4l3.5 6.2h1.6l3.5-6.2v10.2h3.6V0zm10.7 0h-7.2v15.6h7.2c4.4 0 7.3-2.6 7.3-7.8S44.5 0 40.1 0zm0 12.2h-3.5V3.4h3.5c2.3 0 3.7 1.4 3.7 4.4s-1.4 4.4-3.7 4.4zm14.8-12.2h-7.2v15.6h7.6c3.9 0 6.4-1.9 6.4-5.2 0-2.3-1.4-3.9-3.4-4.5 1.7-.5 2.8-2 2.8-4 0-3.3-2.4-5.1-6.2-5.1zm-.2 3.1c1.7 0 2.7.9 2.7 2.3 0 1.5-1 2.4-2.7 2.4h-3.3V3.1h3.3zm.4 6.1c1.9 0 3 1 3 2.6 0 1.6-1.1 2.6-3 2.6H51V9.2h4.1z" />
            </svg>
            <span>Este producto usa la API de TMDB pero no está respaldado ni certificado por TMDB.</span>
          </div>
          <p>Datos y recursos abiertos de <strong>Open Library</strong> (libros), <strong>MusicBrainz</strong> (música) y <strong>Wikidata</strong> (metadatos comunes).</p>
          <p>Catálogo: {items.length} obras en la semilla.</p>
          <div className="pt-2">
            <span
              onPointerDown={onPointerDownVersion}
              onPointerUp={onPointerUpVersion}
              onPointerLeave={onPointerUpVersion}
              className="inline-block cursor-pointer select-none text-[11px] text-mute/70 hover:text-accent active:text-accent transition-colors"
              title="Mantén pulsado para abrir métricas"
            >
              Biblioteca {ENGINE_VERSION} · Mantén pulsado para ver métricas
            </span>
          </div>
        </section>
      </div>

      {colorOpen && (
        <Sheet label="Personalizar avatar" onClose={() => setColorOpen(false)} height="40%">
          <h3 className="font-semibold text-lg mb-2">Personalizar avatar</h3>
          {user && (
            <button
              onClick={() => {
                setColorOpen(false)
                avatarInputRef.current?.click()
              }}
              className="w-full min-h-[46px] rounded-2xl bg-surface2 border border-line text-sm font-semibold mb-4 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Icon name="camera" size={16} />
              Subir nueva foto de perfil
            </button>
          )}
          <div className="text-xs text-mute uppercase font-semibold mb-2">Color del avatar</div>
          <div className="flex gap-3 flex-wrap" role="radiogroup" aria-label="Color del avatar">
            {AVATAR_COLORS.map((c) => (
              <button key={c} role="radio" aria-checked={c === profile.avatarColor} aria-label={`Color ${c}`} onClick={() => { setProfile({ avatarColor: c }); setColorOpen(false) }} className={`w-12 h-12 rounded-full border-2 ${c === profile.avatarColor ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />
            ))}
          </div>
        </Sheet>
      )}
      {feedbackOpen && (
        <Sheet label="Enviar feedback" onClose={() => setFeedbackOpen(false)} height="60%">
          <h3 className="font-semibold text-lg mb-1">Enviar feedback</h3>
          <p className="text-xs text-mute mb-4">¿Has encontrado un error, echas algo en falta o tienes una sugerencia? Te leemos.</p>
          <form onSubmit={handleSubmitFeedback} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-mute mb-1">Tu mensaje *</label>
              <textarea
                value={feedbackMsg}
                onChange={(e) => setFeedbackMsg(e.target.value)}
                placeholder="Cuéntanos qué tal tu experiencia..."
                required
                rows={4}
                className="w-full bg-surface2 border border-line rounded-xl p-3 text-xs focus:outline-none focus:border-accent resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-mute mb-1">Contacto opcional (email o @telegram)</label>
              <input
                type="text"
                value={feedbackContact}
                onChange={(e) => setFeedbackContact(e.target.value)}
                placeholder="Para responderte si quieres..."
                className="w-full bg-surface2 border border-line rounded-xl px-3 min-h-[38px] text-xs focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFeedbackOpen(false)}
                className="flex-1 min-h-[44px] rounded-xl bg-surface border border-line text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={sendingFeedback || !feedbackMsg.trim()}
                className="flex-1 min-h-[44px] rounded-xl bg-accent text-accent-ink text-xs font-semibold disabled:opacity-40"
              >
                {sendingFeedback ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </form>
        </Sheet>
      )}
      {confirm && <Confirm title="¿Reiniciar la demo?" text="Se borrarán tus valoraciones, listas y ajustes de este navegador. Vuelves al principio." confirmLabel="Reiniciar" onCancel={() => setConfirm(false)} onConfirm={() => { resetAll(); setConfirm(false) }} />}
      {deleteConfirm && <Confirm title="¿Borrar tu cuenta?" text="Se borrarán tu perfil y tus notas sincronizadas en la nube de forma permanente." confirmLabel="Borrar cuenta" onCancel={() => setDeleteConfirm(false)} onConfirm={async () => { await deleteAccount(); setDeleteConfirm(false); setToast('Cuenta y datos borrados'); }} />}
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
