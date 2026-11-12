// Flujo compartido de importación: filas ImportRow[] -> emparejar con el catálogo -> revisar dudosas -> aplicar.
// Lo usan «Conectar» (archivos y conexiones) y cualquier otra pantalla que produzca filas.
import { useState } from 'react'
import { applyImportRows, getItem, items as seedItems, type ImportRow, type Item } from '@biblioteca/core'
import { useStore } from '../../store/useStore'
import { useCatalog } from '../../store/useCatalog'
import { useAuth } from '../../store/useAuth'
import { track } from '../../store/useEvents'
import { supabase } from '../supabase'
import { pushLocalEntriesToCloud } from '../sync'
import { matchRows, type DoubtfulPair, type MatchedPair } from './matchRows'

export type { MatchedPair, DoubtfulPair }

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
    const client = supabase
    try {
      const { matched, doubts, none } = await matchRows(rows, {
        seedItems,
        invoke: client ? (body) => client.functions.invoke('biblio-catalog', { body: body as Record<string, unknown> }) : null,
        addItems: (list) => useCatalog.getState().addItems(list),
        getItem,
        onProgress: setProgress,
      })
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
    if (user) void pushLocalEntriesToCloud(user.id)

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
