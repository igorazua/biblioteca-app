import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader, Chip } from '../components/ui'
import { Icon } from '../components/Icon'
import { Poster } from '../components/Poster'
import { useStore } from '../store/useStore'
import { useCatalog } from '../store/useCatalog'
import { useAuth } from '../store/useAuth'
import { track } from '../store/useEvents'
import { supabase } from '../lib/supabase'
import { items as seedItems, getItem } from '../data/catalog'
import { parseLetterboxd } from '../lib/import/letterboxd'
import { buildLocalIndex, imdbToQids, matchLocal } from '../lib/import/match'
import { parseImdb } from '../lib/import/imdb'
import { parseGoodreads } from '../lib/import/goodreads'
import { parseNetflix } from '../lib/import/netflix'
import { applyImportRows } from '../lib/import/apply'
import { pushLocalEntriesToCloud } from '../lib/sync'
import type { ImportRow } from '../lib/import/types'
import type { Item, ShelfType } from '../types'

type ImportSource = 'letterboxd' | 'imdb' | 'goodreads' | 'netflix'

interface SourceConfig {
  id: ImportSource
  name: string
  icon: 'film' | 'tv' | 'bookOpen'
  shelves: string
  extensions: string
  url?: string
  urlLabel?: string
  steps: string[]
}

const SOURCES: SourceConfig[] = [
  {
    id: 'letterboxd',
    name: 'Letterboxd',
    icon: 'film',
    shelves: 'Películas',
    extensions: '.zip, .csv',
    url: 'https://letterboxd.com/settings/data/',
    urlLabel: 'Abrir Ajustes de Letterboxd',
    steps: [
      'Entra en letterboxd.com en tu navegador e inicia sesión.',
      'Ve a Ajustes (Settings) → pestaña «Data» o «Import & Export» → pulsa «Export your data».',
      'Descarga el archivo ZIP (o los archivos ratings.csv / watched.csv) y súbelo aquí.',
    ],
  },
  {
    id: 'imdb',
    name: 'IMDb',
    icon: 'tv',
    shelves: 'Películas y series',
    extensions: '.csv',
    url: 'https://www.imdb.com/list/ratings',
    urlLabel: 'Abrir tus ratings en IMDb',
    steps: [
      'Entra en imdb.com y ve a tu página de «Your Ratings» o a tu «Watchlist».',
      'Pulsa el menú de 3 puntos (⋮) o el botón «Export» al final de la página.',
      'Sube aquí el archivo ratings.csv o watchlist.csv descargado.',
    ],
  },
  {
    id: 'goodreads',
    name: 'Goodreads / StoryGraph',
    icon: 'bookOpen',
    shelves: 'Libros',
    extensions: '.csv',
    url: 'https://www.goodreads.com/review/import',
    urlLabel: 'Abrir exportación en Goodreads',
    steps: [
      'Entra en goodreads.com en tu navegador e inicia sesión.',
      'Ve a «My Books» → en el menú lateral pulsa «Import and export».',
      'Pulsa «Export Library» y sube aquí el archivo CSV generado (o el export de StoryGraph).',
    ],
  },
  {
    id: 'netflix',
    name: 'Netflix',
    icon: 'film',
    shelves: 'Películas y series',
    extensions: '.csv',
    url: 'https://www.netflix.com/viewingactivity',
    urlLabel: 'Abrir actividad de visionado en Netflix',
    steps: [
      'Entra en netflix.com/youraccount e inicia sesión.',
      'Selecciona tu perfil y ve a «Actividad de visionado» (Viewing activity).',
      'Al final de la lista, pulsa «Descargar todo» y sube el archivo NetflixViewingHistory.csv.',
    ],
  },
]

interface MatchedPair {
  row: ImportRow
  item: Item
}

interface DoubtfulPair {
  row: ImportRow
  candidates: any[]
  chosenItem?: Item | null
}

export function Import() {
  const nav = useNavigate()
  const user = useAuth((s) => s.user)
  const [selectedSource, setSelectedSource] = useState<ImportSource>('letterboxd')
  const [parsing, setParsing] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  const [sureItems, setSureItems] = useState<MatchedPair[]>([])
  const [doubtfulItems, setDoubtfulItems] = useState<DoubtfulPair[]>([])
  const [notFoundRows, setNotFoundRows] = useState<ImportRow[]>([])

  const [step, setStep] = useState<'source' | 'matching' | 'review' | 'done'>('source')
  const [importSummary, setImportSummary] = useState<{ created: number; updated: number; skipped: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSourceSelect = (src: ImportSource) => {
    setSelectedSource(src)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedSource) return

    setParsing(true)
    setStep('matching')

    try {
      track('import_started', {
        data: { source: selectedSource },
      })

      let rows: ImportRow[] = []
      if (file.name.endsWith('.zip')) {
        const buffer = await file.arrayBuffer()
        const uint8 = new Uint8Array(buffer)
        rows = parseLetterboxd(uint8)
      } else {
        const text = await file.text()
        if (selectedSource === 'letterboxd') rows = parseLetterboxd(text, file.name)
        else if (selectedSource === 'imdb') rows = parseImdb(text)
        else if (selectedSource === 'goodreads') rows = parseGoodreads(text)
        else if (selectedSource === 'netflix') rows = parseNetflix(text)
      }

      if (rows.length === 0) {
        alert('No se encontraron registros válidos en el archivo.')
        setStep('source')
        setParsing(false)
        return
      }

      // Proceso de emparejamiento
      const matched: MatchedPair[] = []
      const remaining: ImportRow[] = []

      // 1. Casar primero contra el catálogo local: IMDb ID → Wikidata (no depende del idioma del título) y, si no, título y año
      const qids = await imdbToQids(rows.map((r) => r.imdbId ?? ''))
      const index = buildLocalIndex(seedItems)
      for (const row of rows) {
        const localMatch = matchLocal(row, index, row.imdbId ? qids.get(row.imdbId) : undefined)
        if (localMatch) matched.push({ row, item: localMatch })
        else remaining.push(row)
      }

      // 2. Si quedan obras y hay conexión a Supabase, enviar a match en lotes de 50
      const doubts: DoubtfulPair[] = []
      const notFound: ImportRow[] = []

      if (remaining.length > 0 && supabase) {
        // lotes pequeños: cada fila puede consultar varias fuentes y la función tiene límite de tiempo
        const chunkSize = 10
        for (let i = 0; i < remaining.length; i += chunkSize) {
          setProgress({ current: i, total: remaining.length })
          const chunk = remaining.slice(i, i + chunkSize)
          try {
            const { data, error } = await supabase.functions.invoke('biblio-catalog', {
              body: {
                action: 'match',
                rows: chunk.map((r) => ({
                  type: r.type,
                  title: r.title,
                  originalTitle: r.originalTitle,
                  year: r.year,
                  imdbId: r.imdbId,
                  isbn13: r.isbn13,
                })),
              },
            })

            if (!error && data?.matches) {
              for (let j = 0; j < chunk.length; j++) {
                const row = chunk[j]
                const m = data.matches[j]
                if (m?.status === 'sure' && m.item) {
                  matched.push({ row, item: m.item })
                  useCatalog.getState().addItems([m.item])
                } else if (m?.status === 'doubt' && m.candidates?.length) {
                  doubts.push({ row, candidates: m.candidates })
                } else {
                  notFound.push(row)
                }
              }
            } else {
              notFound.push(...chunk)
            }
          } catch {
            notFound.push(...chunk)
          }
        }
      } else {
        notFound.push(...remaining)
      }

      setSureItems(matched)
      setDoubtfulItems(doubts)
      setNotFoundRows(notFound)
      setStep('review')
    } catch (err) {
      console.error('Error importando archivo:', err)
      alert('Error leyendo el archivo. Comprueba que el formato es correcto.')
      setStep('source')
    } finally {
      setParsing(false)
      setProgress(null)
    }
  }

  const handleResolveCandidate = async (index: number, candidate: any) => {
    if (!supabase || !selectedSource) return
    const pair = doubtfulItems[index]
    try {
      const { data, error } = await supabase.functions.invoke('biblio-catalog', {
        body: {
          action: 'resolve',
          refs: [{ type: pair.row.type, source: candidate.ref.source, id: candidate.ref.id }],
        },
      })
      if (!error && data?.items?.[0]) {
        const item: Item = data.items[0]
        useCatalog.getState().addItems([item])
        setDoubtfulItems((prev) =>
          prev.map((d, i) => (i === index ? { ...d, chosenItem: item } : d))
        )
      }
    } catch (err) {
      console.warn('Error resolviendo candidato:', err)
    }
  }

  const handleSkipCandidate = (index: number) => {
    setDoubtfulItems((prev) =>
      prev.map((d, i) => (i === index ? { ...d, chosenItem: null } : d))
    )
  }

  const handleConfirm = async () => {
    if (!selectedSource) return

    // Unir las seguras con las dudosas que el usuario haya resuelto positivamente
    const allToApply: MatchedPair[] = [...sureItems]
    for (const d of doubtfulItems) {
      if (d.chosenItem) {
        allToApply.push({ row: d.row, item: d.chosenItem })
      }
    }

    const { entries, rankings } = useStore.getState()
    const result = applyImportRows(
      entries,
      rankings,
      allToApply.map((p) => ({ row: p.row, itemId: p.item.id })),
      selectedSource
    )

    useStore.setState({ entries: result.entries, rankings: result.rankings })

    if (user) {
      pushLocalEntriesToCloud(user.id)
    }

    track('import_done', {
      data: {
        source: selectedSource,
        total: sureItems.length + doubtfulItems.length + notFoundRows.length,
        sure: sureItems.length,
        doubt: doubtfulItems.length,
        none: notFoundRows.length,
        created: result.createdCount,
        updated: result.updatedCount,
      },
    })

    setImportSummary({
      created: result.createdCount,
      updated: result.updatedCount,
      skipped: result.skippedCount,
    })
    setStep('done')
  }

  const activeSourceConfig = SOURCES.find((s) => s.id === selectedSource)

  return (
    <div className="h-full flex flex-col bg-bg text-ink scroll-y">
      <ScreenHeader title="Importar lista" onBack={() => nav(-1)} />

      <div className="p-5 flex-1 flex flex-col max-w-md mx-auto w-full">
        {step === 'source' && (
          <div className="space-y-6">
            <div>
              <p className="text-mute text-sm">
                Importa tus valoraciones y listas pendientes. El archivo se procesa de forma segura en tu móvil y solo se guardan en tu estantería las obras que elijas.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-xs text-accent font-semibold uppercase tracking-wider">Elige el servicio</h2>
              <div className="grid grid-cols-1 gap-2.5">
                {SOURCES.map((s) => {
                  const active = selectedSource === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSourceSelect(s.id)}
                      className={`flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-colors ${
                        active ? 'bg-accent/10 border-accent text-ink' : 'bg-surface border-line active:bg-surface2'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center shrink-0">
                        <Icon name={s.icon as any} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base">{s.name}</div>
                        <div className="text-xs text-mute">{s.shelves}</div>
                      </div>
                      {active && <span className="text-accent text-lg">✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {activeSourceConfig && (
              <div className="bg-surface border border-accent/30 rounded-3xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                  <h3 className="text-sm font-semibold text-ink">
                    Tutorial: Cómo exportar tu lista de {activeSourceConfig.name}
                  </h3>
                </div>

                <div className="space-y-3 pt-1">
                  {activeSourceConfig.steps.map((st, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-surface2 border border-line text-xs font-bold text-accent flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="flex-1 text-ink/90 leading-snug">{st}</p>
                    </div>
                  ))}
                </div>

                {activeSourceConfig.url && (
                  <div className="pt-1">
                    <a
                      href={activeSourceConfig.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-semibold bg-accent/10 px-3 py-1.5 rounded-xl border border-accent/20 active:scale-95 transition-transform"
                    >
                      <Icon name="link" size={13} />
                      {activeSourceConfig.urlLabel}
                      <span className="text-[10px]">↗</span>
                    </a>
                  </div>
                )}

                <div className="pt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={activeSourceConfig.extensions}
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full min-h-[50px] rounded-2xl bg-accent text-accent-ink font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow"
                  >
                    <Icon name="search" size={18} />
                    Subir archivo ({activeSourceConfig.extensions})
                  </button>
                  <p className="text-[11px] text-mute text-center mt-2">
                    Privacidad: El archivo se lee únicamente en tu navegador. Tus notas se guardan sin pisar las existentes.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'matching' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
            <h3 className="serif text-xl font-semibold">Buscando obras en el catálogo vivo...</h3>
            {progress && (
              <p className="text-sm text-mute">
                Lote {progress.current} de {progress.total}
              </p>
            )}
            <p className="text-xs text-mute/80 max-w-xs">
              Estamos casando títulos con identidades de Wikidata, TVmaze, Open Library y MusicBrainz.
            </p>
          </div>
        )}

        {step === 'review' && (
          <div className="flex-1 flex flex-col space-y-5">
            <div className="rounded-2xl bg-surface border border-line p-4">
              <div className="text-xs font-semibold text-accent uppercase tracking-wider">Resultado del escaneo</div>
              <div className="serif text-2xl font-bold mt-1">
                {sureItems.length} encontradas
              </div>
              <div className="flex gap-4 mt-2 text-xs text-mute">
                <span>{doubtfulItems.length} dudosas</span>
                <span>•</span>
                <span>{notFoundRows.length} no encontradas</span>
              </div>
            </div>

            {doubtfulItems.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-ink">Revisar coincidencias dudosas:</h3>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {doubtfulItems.map((d, idx) => {
                    return (
                      <div key={idx} className="bg-surface border border-line rounded-2xl p-3 space-y-2">
                        <div className="text-sm font-semibold">
                          {d.row.title} {d.row.year ? `(${d.row.year})` : ''}
                        </div>
                        <div className="text-xs text-mute">¿A cuál corresponde?</div>
                        <div className="flex flex-wrap gap-1.5">
                          {d.candidates.slice(0, 3).map((c, cIdx) => {
                            const isChosen = d.chosenItem?.title === c.title
                            return (
                              <button
                                key={cIdx}
                                onClick={() => handleResolveCandidate(idx, c)}
                                className={`text-xs px-2.5 py-1.5 rounded-xl border text-left flex items-center gap-1.5 ${
                                  isChosen ? 'bg-accent text-accent-ink border-accent' : 'bg-surface2 border-line text-ink'
                                }`}
                              >
                                <span>{c.title} ({c.year ?? '?'})</span>
                                {isChosen && <span>✓</span>}
                              </button>
                            )
                          })}
                          <button
                            onClick={() => handleSkipCandidate(idx)}
                            className={`text-xs px-2.5 py-1.5 rounded-xl border ${
                              d.chosenItem === null ? 'bg-stamp-red/20 text-stamp-red border-stamp-red' : 'bg-surface2 border-line text-mute'
                            }`}
                          >
                            Ninguna
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-auto pt-4">
              <button
                onClick={handleConfirm}
                className="w-full min-h-[52px] rounded-2xl bg-accent text-accent-ink font-semibold active:scale-[0.98] transition-transform"
              >
                Confirmar e importar {sureItems.length + doubtfulItems.filter((d) => d.chosenItem).length} obras
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-5">
            <div className="w-14 h-14 rounded-full bg-accent/20 text-accent flex items-center justify-center text-2xl font-bold">
              ✓
            </div>
            <h3 className="serif text-2xl font-semibold">¡Importación completada!</h3>
            {importSummary && (
              <p className="text-sm text-mute max-w-xs">
                Se han añadido {importSummary.created} obras nuevas a tus estanterías
                {importSummary.updated > 0 && ` y se han actualizado ${importSummary.updated} con sus estrellas`}.
                {importSummary.skipped > 0 && ` (${importSummary.skipped} ya estaban en tu biblioteca).`}
              </p>
            )}
            <button
              onClick={() => nav('/')}
              className="mt-4 px-6 min-h-[48px] rounded-2xl bg-accent text-accent-ink font-semibold active:scale-95 transition-transform"
            >
              Ir a mis estanterías
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
