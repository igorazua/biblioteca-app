import { useState } from 'react'
import type { Friend } from '../types'
import { Icon } from './Icon'

/** «Pregúntale» (§12.7): WhatsApp con el texto prellenado, o Instagram (copia el mensaje y abre el chat). */
export function AskFriend({ friend, message, onNotify }: { friend: Friend; message: string; onNotify: (m: string) => void }) {
  const [menu, setMenu] = useState(false)
  const c = friend.contact ?? {}
  const wa = `https://wa.me/${c.whatsapp ?? ''}?text=${encodeURIComponent(message)}`
  const ig = c.instagram ? `https://ig.me/m/${c.instagram}` : ''

  const openIg = async () => {
    try { await navigator.clipboard.writeText(message); onNotify('Mensaje copiado, pégalo en el chat') } catch { onNotify('Copia el mensaje a mano y pégalo en el chat') }
    window.open(ig, '_blank', 'noopener,noreferrer')
    setMenu(false)
  }
  const btn = 'mt-2.5 min-h-[44px] px-4 rounded-xl text-sm font-medium inline-flex items-center gap-2'
  const waCls = `${btn} bg-[#1f3a2a] text-[#7de0a5]`
  const igCls = `${btn} bg-[#3a1f33] text-[#f08fd0]`

  if (c.whatsapp && c.instagram)
    return (
      <div>
        {!menu ? (
          <button onClick={() => setMenu(true)} className={`${btn} bg-surface2 text-ink`}><Icon name="share" size={17} /> Pregúntale</button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(false)} className={waCls}><Icon name="whatsapp" size={17} /> WhatsApp</a>
            <button onClick={openIg} className={igCls}>Instagram</button>
          </div>
        )}
      </div>
    )
  if (c.instagram) return <button onClick={openIg} className={igCls}>Pregúntale por Instagram</button>
  return <a href={wa} target="_blank" rel="noopener noreferrer" className={waCls}><Icon name="whatsapp" size={17} /> Pregúntale</a>
}
