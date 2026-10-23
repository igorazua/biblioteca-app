import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  DUEL_COPIES,
  DuelFan,
  duelTexts,
  useDuelCopy,
  type DuelKind,
  type DuelCopy,
} from './DuelVariants'

export interface Side {
  key: string
  title: string
  subtitle?: string
  /** fondo a sangre del lado (póster, collage…) */
  bg: ReactNode
}

export const DUEL_LEFT = '#F5B544' // ámbar del acento
export const DUEL_RIGHT = '#9A86FF' // violeta contrastado

type Choose = (w: 'a' | 'b') => void

/**
 * Duelo con diseño 3 (abanico, T19 §4.1). Se usa en Comparar, colocar y Decidir.
 * En Decidir se mantiene una pastilla «Texto A ›» para alternar los textos A·B·C de prueba.
 */
export function SwipePair(props: { left: Side; right: Side; onChoose: Choose; kind?: DuelKind; /** hueco entre las cartas y la pista (p. ej. «No conozco ninguna») */ extra?: ReactNode }) {
  const { kind = 'rank', extra, ...rest } = props
  const [copy, setCopy] = useDuelCopy()
  const texts = duelTexts(kind, copy)

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <DuelFan {...rest} texts={texts} fast={kind === 'rank'} />
      {extra}
      <p className="text-center text-meta text-mute py-1.5 pointer-events-none select-none shrink-0">
        {/* con ratón no se desliza: se hace clic en la carta */}
        <span className="[@media(hover:hover)_and_(pointer:fine)]:hidden">Desliza hacia la que prefieras</span>
        <span className="hidden [@media(hover:hover)_and_(pointer:fine)]:inline">Haz clic en la que prefieras</span>
      </p>
      {kind === 'decide' && <DecideCopyPicker copy={copy} setCopy={setCopy} />}
    </div>
  )
}

/** Pastilla pequeña «Texto A ›» en Decidir para pruebas de texto A·B·C (T19 §4.1). */
function DecideCopyPicker({ copy, setCopy }: { copy: DuelCopy; setCopy: (c: DuelCopy) => void }) {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {open && <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />}
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Textos de Decidir"
            initial={reduce ? false : { opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 460, damping: 32 }}
            style={{ transformOrigin: 'bottom right' }}
            className="fixed bottom-32 right-4 z-40 rounded-2xl bg-surface2 border border-line shadow-[0_16px_40px_-10px_rgba(0,0,0,0.7)] p-3 flex flex-col gap-2.5"
          >
            <div className="flex items-center gap-3">
              <span className="w-[52px] text-[11px] font-semibold uppercase tracking-wider text-mute">Texto</span>
              <div className="flex gap-1.5">
                {DUEL_COPIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={`Texto ${c.id}: ${c.name}`}
                    aria-pressed={c.id === copy}
                    onClick={() => {
                      setCopy(c.id)
                      setOpen(false)
                    }}
                    className={`min-w-[40px] min-h-[36px] rounded-xl text-[13px] font-semibold border transition-colors active:scale-95 ${
                      c.id === copy ? 'bg-accent text-accent-ink border-accent' : 'bg-surface border-line text-ink/80'
                    }`}
                  >
                    {c.id}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        aria-label="Probar otros textos de Decidir"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 z-40 min-h-[32px] px-3 rounded-full bg-surface2/90 border border-line text-[11px] font-semibold text-ink/80 flex items-center gap-1.5 shadow-lg active:scale-95 backdrop-blur-md"
      >
        Texto {copy}
        <span aria-hidden className={`transition-transform ${open ? 'rotate-90' : '-rotate-90'}`}>
          ›
        </span>
      </button>
    </>
  )
}
