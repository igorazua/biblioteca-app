import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { getItem, items, typeName } from '../data/catalog'
import { useStore } from '../store/useStore'
import { ACTIVE_SHELVES, SHELVES, SHELF_LABEL, type ListItem, type ShelfType } from '../types'
import { Poster } from '../components/Poster'
import { posterBox, posterRadius } from '../lib/posterShape'
import { Chip, Confirm, ScreenHeader, Toast } from '../components/ui'
import { Icon } from '../components/Icon'
import { listUrl, type SharedList } from '../lib/share'
import { shareOrCopy } from '../lib/shareUi'

type Scope = 'mine' | 'seen' | 'pending' | 'all'

export function ListEditor() {
  const { id = 'nueva' } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const lists = useStore((s) => s.lists)
  const entries = useStore((s) => s.entries)
  const profile = useStore((s) => s.profile)
  const saveList = useStore((s) => s.saveList)
  const deleteList = useStore((s) => s.deleteList)
  const existing = lists.find((l) => l.id === id)

  const [listId, setListId] = useState<string | undefined>(existing?.id)
  const [title, setTitle] = useState(existing?.title ?? params.get('title') ?? '')
  const [desc, setDesc] = useState(existing?.description ?? '')
  const [sel, setSel] = useState<ListItem[]>(() => {
    if (existing) return existing.items
    const ids = (params.get('ids') ?? params.get('add') ?? '').split(',').filter((x) => x && getItem(x))
    return ids.map((itemId) => ({ itemId }))
  })
  const [q, setQ] = useState('')
  const [shelf, setShelf] = useState<ShelfType | 'all'>('all')
  const [scope, setScope] = useState<Scope>('mine')
  const [toast, setToast] = useState<string | null>(null)
  const [askDelete, setAskDelete] = useState(false)
  const [shown, setShown] = useState<string | null>(null)

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return items
      .filter((i) => !sel.some((s) => s.itemId === i.id))
      .filter((i) => shelf === 'all' || i.type === shelf)
      .filter((i) => {
        const st = entries[i.id]?.status
        return scope === 'all' || (scope === 'mine' ? st === 'seen' || st === 'pending' : st === scope)
      })
      .filter((i) => !needle || i.title.toLowerCase().includes(needle) || (i.originalTitle ?? '').toLowerCase().includes(needle) || i.creator.toLowerCase().includes(needle))
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 40)
  }, [q, shelf, scope, entries, sel])

  const build = (): SharedList => ({
    t: title.trim() || 'Mi lista',
    ...(desc.trim() ? { d: desc.trim() } : {}),
    a: profile.name,
    c: profile.avatarColor,
    i: sel.map((s) => (s.note?.trim() ? [s.itemId, s.note.trim()] : [s.itemId]) as [string, string?]),
  })
  const persist = () => {
    const nid = saveList({ id: listId, title: title.trim() || 'Mi lista', description: desc.trim() || undefined, items: sel.map((s) => ({ itemId: s.itemId, ...(s.note?.trim() ? { note: s.note.trim() } : {}) })) })
    setListId(nid)
    return nid
  }
  const save = () => { persist(); setToast('Lista guardada') }
  const share = async () => {
    if (!sel.length) { setToast('Añade alguna obra primero'); return }
    persist()
    const url = listUrl(location.origin, build())
    setShown(url)
    const m = await shareOrCopy({ title: build().t, text: `${profile.name} te ha preparado una lista: ${build().t}`, url })
    if (m) setToast(m)
  }

  return (
    <div className="h-full flex flex-col bg-bg relative">
      <ScreenHeader title={existing ? 'Editar lista' : 'Nueva lista'} onBack={() => nav(-1)} />
      <div className="flex-1 min-h-0 scroll-y px-4 pb-4 space-y-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la lista" maxLength={60} aria-label="Título"
          className="w-full bg-surface border border-line rounded-2xl px-4 min-h-[52px] text-lg serif font-semibold focus:outline-none focus:border-accent" />
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción (opcional)" maxLength={140} aria-label="Descripción"
          className="w-full bg-surface border border-line rounded-2xl px-4 min-h-[46px] text-[15px] focus:outline-none focus:border-accent" />

        <section aria-label="Obras de la lista">
          <h2 className="text-sm font-semibold text-mute uppercase tracking-wide mb-2">En la lista · {sel.length}</h2>
          {sel.length === 0 && <p className="text-sm text-mute rounded-2xl border border-dashed border-line p-4">Busca abajo y añade pelis, series o libros. Pueden ir mezclados.</p>}
          <ul className="space-y-2">
            {sel.map((s, idx) => {
              const it = getItem(s.itemId)
              if (!it) return null
              return (
                <li key={s.itemId} className="flex gap-3 bg-surface rounded-2xl border border-line p-2.5">
                  <Poster item={it} style={{ borderRadius: posterRadius(it.type, 12), ...posterBox(it).style }} className={`w-12 ${posterBox(it).className} rounded-xl shrink-0 self-center object-cover`} />
                  <div className="flex-1 min-w-0">
                    <div className="serif font-semibold leading-tight truncate">{it.title}</div>
                    <input value={s.note ?? ''} onChange={(e) => setSel((cur) => cur.map((x, i) => (i === idx ? { ...x, note: e.target.value } : x)))}
                      placeholder="Nota (p. ej. «Escúchala con cascos»)" maxLength={100} aria-label={`Nota para ${it.title}`}
                      className="mt-1.5 w-full bg-surface2 rounded-xl px-3 min-h-[40px] text-sm placeholder:text-mute/70 focus:outline-none focus:ring-1 focus:ring-accent" />
                  </div>
                  <button onClick={() => setSel((cur) => cur.filter((x) => x.itemId !== s.itemId))} aria-label={`Quitar ${it.title}`} className="w-11 h-11 flex items-center justify-center text-mute shrink-0"><Icon name="x" size={18} /></button>
                </li>
              )
            })}
          </ul>
        </section>

        <section aria-label="Añadir obras">
          <h2 className="text-sm font-semibold text-mute uppercase tracking-wide mb-2">Añadir</h2>
          <div className="relative">
            <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar título o autor" aria-label="Buscar"
              className="w-full bg-surface border border-line rounded-2xl pl-10 pr-4 min-h-[48px] focus:outline-none focus:border-accent" />
          </div>
          <div className="flex gap-2 mt-2.5 overflow-x-auto no-scrollbar">
            <Chip active={shelf === 'all'} onClick={() => setShelf('all')}>Todo</Chip>
            {ACTIVE_SHELVES.map((s) => <Chip key={s} active={shelf === s} onClick={() => setShelf(s)}>{SHELF_LABEL[s].plural}</Chip>)}
          </div>
          <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
            {([['mine', 'Mis guardados'], ['seen', 'Vistas'], ['pending', 'Pendientes'], ['all', 'Todo el catálogo']] as [Scope, string][]).map(([k, l]) => (
              <Chip key={k} active={scope === k} onClick={() => setScope(k)}>{l}</Chip>
            ))}
          </div>
          <ul className="mt-3 space-y-2">
            {results.map((it) => (
              <li key={it.id} className="flex items-center gap-3 bg-surface/60 rounded-2xl border border-line p-2">
                <Poster item={it} style={it.type === 'boardgame' ? posterBox(it).style : undefined} className={`w-10 ${it.type === 'boardgame' ? posterBox(it).className : 'h-[60px]'} rounded-lg shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="serif font-medium leading-tight truncate">{it.title}</div>
                  <div className="text-xs text-mute truncate">{typeName(it.type)} · {it.year}</div>
                </div>
                <button onClick={() => setSel((c) => [...c, { itemId: it.id }])} aria-label={`Añadir ${it.title}`} className="w-11 h-11 rounded-full bg-accent text-accent-ink flex items-center justify-center shrink-0"><Icon name="plus" size={20} /></button>
              </li>
            ))}
            {results.length === 0 && <li className="text-sm text-mute text-center py-6">Nada que mostrar con estos filtros.{scope !== 'all' && ' Prueba con «Todo el catálogo».'}</li>}
          </ul>
        </section>

        {shown && (
          <section className="rounded-2xl bg-surface2 p-3 text-xs break-all select-text" aria-label="Link de la lista">
            <div className="text-mute mb-1">Link de la lista:</div>
            <a href={shown} className="text-accent underline">{shown}</a>
          </section>
        )}
        {existing && (
          <button onClick={() => setAskDelete(true)} className="w-full min-h-[46px] text-stamp-red text-sm flex items-center justify-center gap-2"><Icon name="trash" size={16} /> Eliminar lista</button>
        )}
      </div>

      <div className="shrink-0 p-3 flex gap-2 border-t border-line bg-bg">
        <button onClick={save} className="flex-1 min-h-[52px] rounded-2xl bg-surface border border-line font-semibold">Guardar</button>
        <button onClick={share} className="flex-[1.4] min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold flex items-center justify-center gap-2"><Icon name="share" size={18} /> Compartir</button>
      </div>

      {askDelete && <Confirm title="¿Eliminar esta lista?" text="Los links que ya hayas enviado seguirán funcionando." confirmLabel="Eliminar" onCancel={() => setAskDelete(false)} onConfirm={() => { if (listId) deleteList(listId); nav('/', { replace: true }) }} />}
      <AnimatePresence>{toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}</AnimatePresence>
      <Link to="/" className="sr-only">Volver a la biblioteca</Link>
    </div>
  )
}
