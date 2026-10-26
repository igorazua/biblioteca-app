import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { getItem, isKnownItem, itemFacts, typeName } from '../data/catalog'
import { useStore } from '../store/useStore'
import { useCatalog } from '../store/useCatalog'
import { ACTIVE_SHELVES, SHELVES, SHELF_LABEL } from '../types'
import { decodeList, decodeProfile } from '../lib/share'
import { Poster } from '../components/Poster'
import { posterBox, posterRadius } from '../lib/posterShape'
import { Avatar, Toast } from '../components/ui'
import { Icon } from '../components/Icon'
import { Button } from '../components/Button'
import { APP_NAME } from '../config'

/** Vistas públicas: sin marco ni barra de pestañas, como una web normal para quien no tiene la app. */
function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-bg text-ink">
      <div className="mx-auto max-w-[480px] min-h-screen px-5 pt-[max(env(safe-area-inset-top),20px)] pb-32 relative">
        <div className="flex items-center justify-between mb-6">
          <span className="text-label text-accent">{APP_NAME}</span>
          <Link to="/" className="text-meta text-mute hover:text-ink underline underline-offset-2">Abrir la app</Link>
        </div>
        {children}
      </div>
    </div>
  )
}

function Broken() {
  return (
    <PublicShell>
      <div className="py-24 text-center text-mute space-y-3">
        <div className="w-12 h-12 rounded-full bg-surface border border-line flex items-center justify-center mx-auto text-mute">
          <Icon name="link" size={24} />
        </div>
        <h1 className="text-title font-medium text-ink">Este link no funciona</h1>
        <p className="text-body text-mute max-w-xs mx-auto">Puede que esté cortado o incompleto. Pide que te lo vuelvan a enviar.</p>
      </div>
    </PublicShell>
  )
}

export function PublicList() {
  const { payload = '' } = useParams()
  const { pathname } = useLocation()
  const nav = useNavigate()
  const onboarded = useStore((s) => s.onboarded)
  const entries = useStore((s) => s.entries)
  const setPendingSave = useStore((s) => s.setPendingSave)
  const saveItemsAsPending = useStore((s) => s.saveItemsAsPending)
  const applyPendingSave = useStore((s) => s.applyPendingSave)
  const pendingSave = useStore((s) => s.pendingSave)
  const catalogVersion = useCatalog((s) => s.version)
  const [toast, setToast] = useState<string | null>(null)
  const data = useMemo(() => decodeList(payload, isKnownItem), [payload, catalogVersion])

  useEffect(() => {
    if (data?.items) {
      const ids = data.items.map(([id]) => id)
      useCatalog.getState().ensureItems(ids)
    }
  }, [data])

  // volvemos del onboarding con un guardado en espera → se aplica ahora
  useEffect(() => {
    if (onboarded && pendingSave) {
      const n = applyPendingSave()
      if (n) setToast(`${n} guardada${n > 1 ? 's' : ''} como pendiente${n > 1 ? 's' : ''}`)
    }
  }, [onboarded, pendingSave, applyPendingSave])

  if (!data) return <Broken />
  const { list, items } = data
  const ids = items.map(([id]) => id)

  const save = (these: string[]) => {
    if (!onboarded) {
      setPendingSave({ ids: these, origin: list.a })
      nav(`/onboarding?next=${encodeURIComponent(pathname)}`)
      return
    }
    const n = saveItemsAsPending(these, list.a)
    setToast(n ? `${n} guardada${n > 1 ? 's' : ''} como pendiente${n > 1 ? 's' : ''}` : 'Ya la tenías en tu biblioteca')
  }

  return (
    <PublicShell>
      <div className="flex items-center gap-3">
        <Avatar name={list.a} color={list.c} size={40} />
        <p className="text-meta text-mute"><b className="text-ink font-semibold">{list.a}</b> te ha preparado esta lista</p>
      </div>
      <h1 className="text-display font-medium text-ink mt-3">{list.t}</h1>
      {list.d && <p className="text-body text-mute mt-2">{list.d}</p>}
      <div className="text-meta text-mute mt-3">{ids.length} obra{ids.length !== 1 ? 's' : ''}{data.missing ? ` · ${data.missing} ya no está${data.missing > 1 ? 'n' : ''} en el catálogo` : ''}</div>

      <ul className="mt-6 space-y-3">
        {items.map(([id, note]) => {
          const it = getItem(id)
          if (!it) return null
          const mine = entries[id]
          return (
            <li key={id} className="flex gap-3.5 bg-surface rounded-2xl border border-line p-3.5">
              <Poster item={it} style={{ borderRadius: posterRadius(it.type, 10), ...posterBox(it).style }} className={`w-[84px] ${posterBox(it).className} rounded-[10px] shrink-0 self-center object-cover`} />
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="text-label text-mute">{typeName(it.type)} · {it.year}</div>
                <div className="serif text-item font-medium text-ink leading-tight mt-0.5">{it.title}</div>
                <div className="text-meta text-mute mt-0.5">{it.creator}{itemFacts(it) ? ` · ${itemFacts(it)}` : ''}</div>
                {note && <p className="serif italic text-body text-accent mt-1.5">«{note}»</p>}
                <p className="text-meta text-mute mt-1.5 line-clamp-2">{it.synopsis}</p>
                {it.type === 'song' && (
                  <a
                    href={`https://open.spotify.com/search/${encodeURIComponent(`${it.title} ${it.creator}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-meta text-accent hover:underline flex items-center gap-1.5 self-start"
                  >
                    <Icon name="disc" size={13} />
                    Abrir en Spotify
                  </a>
                )}
                <button onClick={() => save([id])} disabled={!!mine && mine.status !== 'dismissed'}
                  className="mt-auto pt-2 self-start min-h-[36px] px-3 rounded-xl bg-surface2 border border-line text-meta font-medium flex items-center gap-1.5 disabled:text-stamp-green">
                  <Icon name={mine && mine.status !== 'dismissed' ? 'check' : 'bookmark'} size={14} />
                  {mine && mine.status !== 'dismissed' ? 'Ya en tu biblioteca' : 'Guardar en mi biblioteca'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-bg via-bg/95 to-transparent">
        <div className="mx-auto max-w-[480px]">
          <Button variant="primary" onClick={() => save(ids)} className="w-full">Guardar toda la lista</Button>
        </div>
      </div>
      <AnimatePresence>{toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}</AnimatePresence>
    </PublicShell>
  )
}

export function PublicProfile() {
  const { payload = '' } = useParams()
  const catalogVersion = useCatalog((s) => s.version)
  const data = useMemo(() => decodeProfile(payload, isKnownItem), [payload, catalogVersion])

  useEffect(() => {
    if (data?.top) {
      const allIds = Object.values(data.top).flat()
      if (allIds.length > 0) {
        useCatalog.getState().ensureItems(allIds)
      }
    }
  }, [data])

  if (!data) return <Broken />
  return (
    <PublicShell>
      <div className="flex items-center gap-4">
        <Avatar name={data.n} color={data.c} size={56} />
        <div>
          <h1 className="text-display font-medium text-ink">{data.n}</h1>
          <p className="text-meta text-mute">Lo que más le ha marcado</p>
        </div>
      </div>
      {ACTIVE_SHELVES.map((t) => {
        const ids = data.top[t] ?? []
        if (!ids.length) return null
        return (
          <section key={t} className="mt-7">
            <h2 className="text-title font-medium text-ink mb-3">{SHELF_LABEL[t].plural}</h2>
            <ol className="grid grid-cols-3 gap-3">
              {ids.map((id, i) => {
                const it = getItem(id)
                if (!it) return null
                return (
                  <li key={id}>
                    <div className="relative">
                      <Poster item={it} style={{ borderRadius: posterRadius(it.type, 10), ...posterBox(it).style }} className={`w-full ${posterBox(it).className} rounded-[10px] border border-line`} />
                      <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-accent text-accent-ink text-[11px] font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
                    </div>
                    <div className="serif text-item font-medium text-ink leading-tight mt-1.5 line-clamp-2">{it.title}</div>
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-bg via-bg/95 to-transparent">
        <div className="mx-auto max-w-[480px]">
          <Link to="/" className="w-full min-h-[48px] rounded-2xl bg-accent text-accent-ink font-medium text-base flex items-center justify-center">Crear mi biblioteca</Link>
        </div>
      </div>
    </PublicShell>
  )
}
