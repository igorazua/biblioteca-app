import { useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../config'
import { useFriends } from '../store/useFriends'
import { useStore } from '../store/useStore'
import { canPickContacts, matchContacts, pickContacts, type ContactOnApp, type PickedContact } from '../lib/contacts'
import { waNumber } from '../lib/phone'
import { shareOrCopy } from '../lib/shareUi'
import { haptic } from '../lib/haptics'
import { Avatar, Sheet } from './ui'
import { Icon } from './Icon'

type Step = 'intro' | 'loading' | 'results'

const inviteText = (name: string | null, link: string) =>
  `${name ? `¡Hola, ${name.split(' ')[0]}! ` : ''}Te invito a ${APP_NAME}: guardo ahí las pelis, series y libros que me han marcado y podemos ver en qué coincidimos. ${link}`

/**
 * «Añadir amigos»: invitación individual (un enlace de un solo uso por persona) y, en Chrome para Android, sugerencias
 * a partir de la agenda: quién ya usa la app y a quién invitar, cada uno con su WhatsApp.
 */
export function FindFriends({ onClose, onToast }: { onClose: () => void; onToast: (msg: string) => void }) {
  const createInvite = useFriends((s) => s.createInvite)
  const country = useStore((s) => s.profile.country) ?? 'ES'
  const [step, setStep] = useState<Step>('intro')
  const [onApp, setOnApp] = useState<ContactOnApp[]>([])
  const [others, setOthers] = useState<PickedContact[]>([])
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const pickerAvailable = canPickContacts()

  const shareInvite = async () => {
    setBusy('share')
    const link = await createInvite()
    setBusy(null)
    if (!link) return onToast('No se pudo crear la invitación')
    const r = await shareOrCopy({ title: `Únete a ${APP_NAME}`, text: inviteText(null, link), url: link })
    if (r) onToast(r === 'Compartido' ? 'Invitación enviada' : r)
  }

  const whatsappInvite = async (c: PickedContact) => {
    // la pestaña se abre en el mismo toque (si se abre tras esperar a la red, el navegador la bloquea)
    const win = window.open('', '_blank')
    setBusy(c.phone)
    const link = await createInvite()
    setBusy(null)
    if (!link) {
      win?.close()
      return onToast('No se pudo crear la invitación')
    }
    const url = `https://wa.me/${waNumber(c.phone)}?text=${encodeURIComponent(inviteText(c.name, link))}`
    if (win) win.location.href = url
    else window.location.href = url
    haptic('success')
    setSent((s) => new Set(s).add(c.phone))
  }

  const fromContacts = async () => {
    try {
      const picked = await pickContacts(country)
      if (picked.length === 0) return
      setStep('loading')
      const res = await matchContacts(picked)
      setOnApp(res.onApp)
      setOthers(res.others)
      setStep('results')
    } catch (e) {
      setStep('intro')
      // cancelar el selector no es un error
      if ((e as DOMException)?.name !== 'AbortError' && (e as DOMException)?.name !== 'InvalidStateError') onToast((e as Error).message || 'No se pudieron leer los contactos')
    }
  }

  const row = (c: PickedContact, extra?: ContactOnApp) => {
    const done = sent.has(c.phone)
    return (
      <li key={c.phone} className="flex items-center gap-3 py-2.5">
        <Avatar name={extra?.displayName ?? c.name} url={extra?.avatarUrl ?? undefined} color="#5B9CF5" size={40} />
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-medium truncate">{c.name}</div>
          {extra && <div className="text-xs text-accent truncate">En {APP_NAME} como {extra.displayName}</div>}
        </div>
        <button
          onClick={() => whatsappInvite(c)}
          disabled={busy !== null}
          className={`min-h-[40px] px-3.5 rounded-xl text-[13px] font-semibold flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform disabled:opacity-60 ${done ? 'bg-surface2 text-mute' : extra ? 'bg-accent text-accent-ink' : 'bg-surface2 text-ink'}`}
        >
          {done ? <><Icon name="check" size={15} /> Enviada</> : busy === c.phone ? 'Abriendo…' : <><Icon name="whatsapp" size={15} /> {extra ? 'Conectar' : 'Invitar'}</>}
        </button>
      </li>
    )
  }

  return (
    <Sheet label="Añadir amigos" onClose={onClose} height={step === 'results' ? '82%' : '58%'}>
      <h2 className="serif text-[24px] font-semibold">Añadir amigos</h2>

      {step === 'intro' && (
        <div className="mt-3 flex flex-col gap-3 min-h-0">
          <p className="text-[14px] text-mute leading-relaxed">
            Cada invitación es para una persona: le llega un enlace personal y, al abrirlo, quedáis conectados y veis vuestra afinidad.
          </p>

          {pickerAvailable && (
            <div className="rounded-2xl bg-surface2/70 border border-line p-4">
              <div className="font-semibold text-[15px]">Buscar en tus contactos</div>
              <p className="text-[13px] text-mute leading-relaxed mt-1">
                Elige los contactos que quieras (puedes marcarlos todos). Sus números se comparan con los de quien ha decidido que le encuentren por teléfono y <b className="text-ink font-medium">no se guardan</b>.
              </p>
              <button onClick={fromContacts} className="mt-3 w-full min-h-[48px] rounded-xl bg-accent text-accent-ink font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                <Icon name="user" size={18} /> Elegir contactos
              </button>
            </div>
          )}

          <button onClick={shareInvite} disabled={busy !== null} className={`w-full min-h-[48px] rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform ${pickerAvailable ? 'bg-surface2 text-ink' : 'bg-accent text-accent-ink'}`}>
            <Icon name="share" size={18} /> {busy === 'share' ? 'Creando invitación…' : 'Invitar a alguien'}
          </button>

          {!pickerAvailable && (
            <p className="text-xs text-mute/80 leading-snug">Se abre el menú de compartir: elige a la persona en WhatsApp o donde prefieras.</p>
          )}
          <Link to="/ajustes" onClick={onClose} className="text-xs text-accent font-medium">Que tus amigos te encuentren por tu teléfono →</Link>
        </div>
      )}

      {step === 'loading' && (
        <ul className="mt-4 space-y-3" aria-label="Buscando amigos">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="skeleton w-10 h-10 rounded-full" />
              <span className="skeleton h-4 rounded flex-1" />
            </li>
          ))}
        </ul>
      )}

      {step === 'results' && (
        <div className="mt-2 flex-1 min-h-0 scroll-y -mx-1 px-1">
          {onApp.length > 0 && (
            <section>
              <h3 className="label-caps text-mute mt-2">Ya usan {APP_NAME} · {onApp.length}</h3>
              <ul className="divide-y divide-line">{onApp.map((c) => row(c, c))}</ul>
            </section>
          )}
          <section>
            <h3 className="label-caps text-mute mt-4">Invitar · {others.length}</h3>
            {others.length ? <ul className="divide-y divide-line">{others.map((c) => row(c))}</ul> : <p className="text-sm text-mute mt-2">Todos tus contactos elegidos ya están en {APP_NAME}.</p>}
          </section>
          <button onClick={() => setStep('intro')} className="mt-4 mb-2 text-sm text-accent font-medium">Elegir otros contactos</button>
        </div>
      )}
    </Sheet>
  )
}
