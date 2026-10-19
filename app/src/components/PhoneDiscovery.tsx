import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { getPhoneDiscoverable, setPhoneDiscoverable } from '../lib/contacts'

/**
 * Ajustes › Amigos: activar que te encuentren por tu teléfono (opcional, apagado por defecto). En el servidor solo
 * queda una huella del número que no permite recuperarlo; se puede quitar cuando quieras.
 */
export function PhoneDiscovery({ onToast }: { onToast: (msg: string) => void }) {
  const country = useStore((s) => s.profile.country) ?? 'ES'
  const [on, setOn] = useState<boolean | null>(null)
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getPhoneDiscoverable().then(setOn)
  }, [])

  const save = async (value: string | null) => {
    setSaving(true)
    const r = await setPhoneDiscoverable(value, country)
    setSaving(false)
    if (!r.ok) return onToast(r.error ?? 'No se pudo guardar')
    setOn(value !== null)
    setPhone('')
    onToast(value !== null ? 'Listo: tus amigos te encontrarán por tu teléfono' : 'Tu número ya no se usa para encontrarte')
  }

  return (
    <div className="rounded-3xl bg-surface border border-line p-4 space-y-3">
      <div>
        <div className="font-semibold text-[15px]">Que tus amigos te encuentren por tu teléfono</div>
        <p className="text-[13px] text-mute leading-relaxed mt-1">
          Si alguien que te tiene en su agenda busca amigos, le aparecerás para conectar. Tu número no se muestra a nadie y en el servidor solo queda una huella de la que no se puede sacar.
        </p>
      </div>
      {on ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-accent font-medium">Activado</span>
          <button onClick={() => save(null)} disabled={saving} className="min-h-[40px] px-3.5 rounded-xl bg-surface2 text-sm font-medium disabled:opacity-50">
            Desactivar
          </button>
        </div>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (phone.trim()) save(phone)
          }}
        >
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Tu móvil (p. ej. 600 11 22 33)"
            aria-label="Tu número de móvil"
            className="flex-1 min-w-0 min-h-[44px] bg-surface2 border border-line rounded-xl px-3 text-sm focus:outline-none focus:border-accent"
          />
          <button type="submit" disabled={saving || !phone.trim()} className="min-h-[44px] px-4 rounded-xl bg-accent text-accent-ink text-sm font-semibold disabled:opacity-50">
            {saving ? '…' : 'Activar'}
          </button>
        </form>
      )}
    </div>
  )
}
