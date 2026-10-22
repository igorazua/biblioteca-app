// Flujo compartido de importación: filas ImportRow[] -> emparejar con el catálogo -> revisar dudosas -> aplicar.
// Lo usan «Conectar» (archivos y conexiones) y cualquier otra pantalla que produzca filas.
import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useCatalog } from '../../store/useCatalog'
import { useAuth } from '../../store/useAuth'
import { track } from '../../store/useEvents'
import { supabase } from '../supabase'
import { items as seedItems, getItem } from '../../data/catalog'
import { buildLocalIndex, imdbToQids, matchLocal } from './match'
import { applyImportRows } from './apply'
import { pushLocalEntriesToCloud } from '../sync'
import type { ImportRow } from './types'
import type { Item } from '../../types'

export interface MatchedPair {
  row: ImportRow
  item: Item
}

export interface DoubtfulPair {
  row: ImportRow
  candidates: any[]
  chosenItem?: Item | null
}

export type FlowStep = 'idle' | 'matching' | 'review' | 'done'

export interface ImportSummary {
  created: number
  updated: number
  skipped: number
}

export function useImportFlow() {
  const user = useAuth((s) => s.user)
  const [step, setStep] = useState<FlowStep>('idle')
  const [source, setSource] = useState('')
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [sure, setSure] = useState<MatchedPair[]>([])
  const [doubtful, setDoubtful] = useState<DoubtfulPair[]>([])
  const [notFound, setNotFound] = useState<ImportRow[]>([])
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const reset = () => {
    setStep('idle')
    setSure([])
    setDoubtful([])
    setNotFound([])
    setSummary(null)
    setProgress(null)
  }

  /** Empareja las filas con el catálogo y deja el flujo en «review». */
  const run = async (rows: ImportRow[], src: string) => {
    setSource(src)
    setStep('matching')
    try {
      const matched: MatchedPair[] = []
      const remaining: ImportRow[] = []

      // 1. Catálogo local: IMDb ID → Wikidata (no depende del idioma del título) y, si no, título y año
      const qids = await imdbToQids(rows.map((r) => r.imdbId ?? ''))
      const index = buildLocalIndex(seedItems)
      for (const row of rows) {
        const localMatch = matchLocal(row, index, row.imdbId ? qids.get(row.imdbId) : undefined)
        if (localMatch) matched.push({ row, item: localMatch })
        else remaining.push(row)
      }

      // 2. Lo que queda va al catálogo vivo, en lotes pequeños (cada fila puede consultar varias fuentes)
      const doubts: DoubtfulPair[] = []
      const none: ImportRow[] = []
      if (remaining.length > 0 && supabase) {
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
                  // si la nube devuelve una gemela ya fusionada, se usa la obra del seed que la sustituye
                  useCatalog.getState().addItems([m.item])
                  matched.push({ row, item: getItem(m.item.id) ?? m.item })
                } else if (m?.status === 'doubt' && m.candidates?.length) {
                  doubts.push({ row, candidates: m.candidates })
                } else {
                  none.push(row)
                }
              }
            } else {
              none.push(...chunk)
            }
          } catch {
            none.push(...chunk)
          }
        }
      } else {
        none.push(...remaining)
      }

      setSure(matched)
      setDoubtful(doubts)
      setNotFound(none)
      setStep('review')
    } catch (err) {
      console.error('Error emparejando filas:', err)
      setStep('idle')
      throw err
    } finally {
      setProgress(null)
    }
  }

  const resolveCandidate = async (index: number, candidate: any) => {
    if (!supabase) return
    const pair = doubtful[index]
    try {
      const { data, error } = await supabase.functions.invoke('biblio-catalog', {
        body: { action: 'resolve', refs: [{ type: pair.row.type, source: candidate.ref.source, id: candidate.ref.id }] },
      })
      if (!error && data?.items?.[0]) {
        useCatalog.getState().addItems([data.items[0]])
        const item: Item = getItem(data.items[0].id) ?? data.items[0]
        setDoubtful((prev) => prev.map((d, i) => (i === index ? { ...d, chosenItem: item } : d)))
      }
    } catch (err) {
      console.warn('Error resolviendo candidato:', err)
    }
  }

  const skipCandidate = (index: number) => {
    setDoubtful((prev) => prev.map((d, i) => (i === index ? { ...d, chosenItem: null } : d)))
  }

  const confirm = () => {
    // Las seguras más las dudosas que el usuario haya resuelto positivamente
    const all: MatchedPair[] = [...sure]
    for (const d of doubtful) if (d.chosenItem) all.push({ row: d.row, item: d.chosenItem })

    const { entries, rankings } = useStore.getState()
    const result = applyImportRows(entries, rankings, all.map((p) => ({ row: p.row, itemId: p.item.id })), source)
    useStore.setState({ entries: result.entries, rankings: result.rankings })
    if (user) pushLocalEntriesToCloud(user.id)

    track('import_done', {
      data: {
        source,
        total: sure.length + doubtful.length + notFound.length,
        sure: sure.length,
        doubt: doubtful.length,
        none: notFound.length,
        created: result.createdCount,
        updated: result.updatedCount,
      },
    })
    setSummary({ created: result.createdCount, updated: result.updatedCount, skipped: result.skippedCount })
    setStep('done')
  }

  return { step, progress, sure, doubtful, notFound, summary, run, reset, resolveCandidate, skipCandidate, confirm }
}

export type ImportFlow = ReturnType<typeof useImportFlow>
