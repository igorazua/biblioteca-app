// app/src/screens/EditProfile.tsx
// «Editar perfil»: los datos de la persona (foto, nombre, @usuario, país, año, plataformas).
// Lo que es de la app (cuenta, avisos, ayuda) vive en Ajustes.
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AVATAR_COLORS } from '../config'
import { useStore } from '../store/useStore'
import { useAuth, checkHandleAvailability } from '../store/useAuth'
import { supabase } from '../lib/supabase'
import { COUNTRIES } from '../lib/countries'
import { Avatar, PlatformPicker, Toast } from '../components/ui'
import { Group } from '../components/Group'
import { Icon } from '../components/Icon'

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
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to create blob'))), 'image/webp', 0.85)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}

const fieldCls =
  'w-full bg-surface2 border border-line rounded-xl px-3.5 min-h-[44px] text-sm focus:outline-none focus:border-accent'

export function EditProfile() {
  const nav = useNavigate()
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)
  const { user, profile: authProfile } = useAuth()

  // Borrador: no se aplica nada hasta «Guardar» (salvo la foto, que se sube al elegirla).
  const [name, setName] = useState(profile.name === 'Tú' ? '' : profile.name)
  const [handle, setHandle] = useState(authProfile?.handle ?? '')
  const [country, setCountry] = useState(profile.country ?? 'ES')
  const [birthYear, setBirthYear] = useState(profile.birthYear ? String(profile.birthYear) : '')
  const [platforms, setPlatforms] = useState(profile.platforms)
  const [color, setColor] = useState(profile.avatarColor)
  const [handleError, setHandleError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const maxYear = new Date().getFullYear() - 6
  const yearNum = parseInt(birthYear, 10)
  const yearInvalid = birthYear !== '' && !(yearNum >= 1930 && yearNum <= maxYear)

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const blob = await processAvatarImage(file)
      if (user && supabase) {
        const filePath = `${user.id}/avatar.webp`
        const { error } = await supabase.storage.from('biblio-avatars').upload(filePath, blob, { contentType: 'image/webp', upsert: true })
        if (error) throw error
        const { data } = supabase.storage.from('biblio-avatars').getPublicUrl(filePath)
        const avatarUrl = `${data.publicUrl}?v=${Date.now()}`
        await supabase.from('biblio_profiles').update({ avatar_url: avatarUrl }).eq('id', user.id)
        useAuth.setState((s) => ({ profile: s.profile ? { ...s.profile, avatarUrl } : null }))
        setProfile({ avatarUrl })
      } else {
        const reader = new FileReader()
        reader.onload = () => setProfile({ avatarUrl: reader.result as string })
        reader.readAsDataURL(blob)
      }
      setToast('Foto actualizada')
    } catch {
      setToast('No se pudo subir la foto. Reintentar.')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const removeAvatar = async () => {
    setProfile({ avatarUrl: null })
    if (user && supabase) {
      await supabase.from('biblio_profiles').update({ avatar_url: null }).eq('id', user.id)
      useAuth.setState((s) => ({ profile: s.profile ? { ...s.profile, avatarUrl: null } : null }))
    }
  }

  const save = async () => {
    if (yearInvalid || saving) return
    setSaving(true)
    setHandleError(null)
    try {
      const cleanName = name.trim() || 'Tú'
      const cleanHandle = handle.trim().toLowerCase()
      if (user && supabase) {
        const update: Record<string, unknown> = { display_name: cleanName, country }
        if (cleanHandle && cleanHandle !== authProfile?.handle) {
          const res = await checkHandleAvailability(cleanHandle, user.id)
          if (!res.available) {
            setHandleError(res.error ?? 'Ese @usuario no está disponible')
            return
          }
          update.handle = cleanHandle
        }
        const { error } = await supabase.from('biblio_profiles').update(update).eq('id', user.id)
        if (error) throw error
        useAuth.setState((s) => ({
          profile: s.profile ? { ...s.profile, displayName: cleanName, handle: (update.handle as string) ?? s.profile.handle } : null,
        }))
      }
      setProfile({
        name: cleanName,
        country,
        birthYear: birthYear === '' ? undefined : yearNum,
        platforms,
        avatarColor: color,
      })
      nav(-1)
    } catch {
      setToast('No se pudo guardar. Revisa la conexión y reintenta.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full scroll-y pb-12">
      <header className="safe-top px-3 pb-3 flex items-center gap-1 min-h-[52px]">
        <button onClick={() => nav(-1)} className="min-h-[44px] px-2 text-sm font-semibold text-mute hover:text-ink">
          Cancelar
        </button>
        <h1 className="flex-1 text-center text-base font-bold">Editar perfil</h1>
        <button
          onClick={save}
          disabled={saving || yearInvalid}
          className="min-h-[44px] px-2 text-sm font-bold text-accent disabled:opacity-40"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </header>

      <div className="px-5 space-y-6">
        {/* Foto y color */}
        <div className="flex flex-col items-center gap-3 pt-1">
          <Avatar name={name || profile.name} color={color} url={profile.avatarUrl} size={96} />
          <input type="file" ref={avatarInputRef} onChange={handleAvatarFile} accept="image/*" className="hidden" />
          <div className="flex items-center gap-4 text-sm font-semibold">
            <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} className="text-accent flex items-center gap-1.5 min-h-[40px]">
              <Icon name="camera" size={15} />
              {uploadingAvatar ? 'Subiendo…' : profile.avatarUrl ? 'Cambiar foto' : 'Poner foto'}
            </button>
            {profile.avatarUrl && (
              <button onClick={removeAvatar} className="text-mute min-h-[40px]">
                Quitar
              </button>
            )}
          </div>
          {!profile.avatarUrl && (
            <div className="flex gap-2.5" role="radiogroup" aria-label="Color del avatar">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  role="radio"
                  aria-checked={c === color}
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${c === color ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          )}
        </div>

        <Group title="Sobre ti">
          <label className="block px-4 py-3">
            <span className="text-xs font-semibold text-mute">Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cómo te verán tus amigos" maxLength={40} className={`${fieldCls} mt-1.5`} />
          </label>
          {user && (
            <label className="block px-4 py-3">
              <span className="text-xs font-semibold text-mute">@usuario</span>
              <div className="relative mt-1.5">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute text-sm">@</span>
                <input
                  value={handle}
                  onChange={(e) => {
                    setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))
                    setHandleError(null)
                  }}
                  placeholder="tu_usuario"
                  maxLength={20}
                  className={`${fieldCls} pl-8`}
                />
              </div>
              {handleError ? (
                <span className="block text-[11px] text-stamp-red mt-1.5">{handleError}</span>
              ) : (
                <span className="block text-[11px] text-mute mt-1.5">Con él te encuentran tus amigos y se forma el enlace de tu perfil.</span>
              )}
            </label>
          )}
          <label className="block px-4 py-3">
            <span className="text-xs font-semibold text-mute">País</span>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className={`${fieldCls} mt-1.5 appearance-none`}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="block text-[11px] text-mute mt-1.5">Para enseñarte primero lo que se conoce en tu país, con sus títulos.</span>
          </label>
          <label className="block px-4 py-3">
            <span className="text-xs font-semibold text-mute">Año de nacimiento (opcional)</span>
            <input
              inputMode="numeric"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="1995"
              className={`${fieldCls} mt-1.5 ${yearInvalid ? 'border-stamp-red' : ''}`}
            />
            <span className={`block text-[11px] mt-1.5 ${yearInvalid ? 'text-stamp-red' : 'text-mute'}`}>
              {yearInvalid ? `Pon un año entre 1930 y ${maxYear}.` : 'No lo ve nadie. Si no lo pones, lo deducimos de lo que vas marcando.'}
            </span>
          </label>
        </Group>

        <Group title="Tus plataformas" footer="Decidir solo te propone lo que puedes ver; en Descubrir no se filtra nada.">
          <div className="p-4">
            <PlatformPicker value={platforms} onChange={setPlatforms} />
          </div>
        </Group>

        {!user && (
          <p className="text-xs text-mute text-center leading-relaxed px-4">
            Sin cuenta, tu perfil se guarda solo en este móvil. Entra desde Ajustes para elegir tu @usuario y conectar con amigos.
          </p>
        )}
      </div>

      <AnimatePresence>{toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}
