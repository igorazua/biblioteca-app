// app/src/components/NudgeCard.tsx
import { motion } from 'framer-motion'
import { type Nudge } from '../lib/nudges'
import { Icon } from './Icon'

interface Props {
  nudge: Nudge
  onAction: () => void
  onDismiss: () => void
  variant?: 'banner' | 'card'
}

export function NudgeCard({ nudge, onAction, onDismiss, variant = 'banner' }: Props) {
  if (variant === 'card') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        className="w-full rounded-[28px] bg-gradient-to-br from-surface to-surface2 border border-accent/40 p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden"
      >
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-2xl bg-accent/20 text-accent flex items-center justify-center">
            <Icon name="sparkle" size={20} />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
            aria-label="Cerrar aviso"
            className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-mute hover:text-white"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="my-6">
          <h3 className="serif text-2xl font-bold leading-snug text-ink mb-2">Un recordatorio</h3>
          <p className="text-mute text-base leading-relaxed">{nudge.message}</p>
        </div>

        <button
          onClick={onAction}
          className="w-full min-h-[50px] rounded-2xl bg-accent text-accent-ink font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          {nudge.actionLabel}
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="mx-5 mb-3 p-3.5 rounded-2xl bg-surface border border-accent/35 flex items-center gap-3 shadow-lg relative overflow-hidden"
    >
      <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
        <Icon name="sparkle" size={18} />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <p className="text-xs text-ink/90 leading-snug line-clamp-2">{nudge.message}</p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onAction}
          className="min-h-[34px] px-3 rounded-xl bg-accent text-accent-ink text-xs font-semibold active:scale-95 transition-transform"
        >
          {nudge.actionLabel}
        </button>
        <button
          onClick={onDismiss}
          aria-label="Cerrar recordatorio"
          className="w-8 h-8 rounded-full flex items-center justify-center text-mute hover:text-ink active:scale-90"
        >
          <Icon name="x" size={15} />
        </button>
      </div>
    </motion.div>
  )
}
