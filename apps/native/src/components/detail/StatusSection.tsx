import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { SHELF_LABEL, type Item, type Status } from '@biblioteca/core'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { Press } from '../Press'
import { RankBadge } from '../ui'
import { RatingFlow } from '../flows/RatingFlow'
import { haptic } from '../../lib/haptics'
import { useRanks, useStore } from '../../store'
import { alpha, colors, tx } from '../../theme'

// Tailwind rose / sky / emerald: 500 para fondo y borde, 400 para el icono (ItemDetail.tsx:178-226)
const TONES = {
  dismissed: { bg: alpha('#f43f5e', 0.15), border: alpha('#f43f5e', 0.6), fg: '#fb7185' },
  pending: { bg: alpha('#0ea5e9', 0.15), border: alpha('#0ea5e9', 0.6), fg: '#38bdf8' },
  seen: { bg: alpha('#10b981', 0.15), border: alpha('#10b981', 0.6), fg: '#34d399' },
} as const

function StateButton({ status, active, label, icon, truncate, onPress }: { status: keyof typeof TONES; active: boolean; label: string; icon: 'x' | 'bookmark' | 'check'; truncate?: boolean; onPress: () => void }) {
  const t = TONES[status]
  return (
    <Press
      onPress={onPress}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        flex: 1,
        minHeight: 52,
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1,
        backgroundColor: active ? t.bg : colors.surface,
        borderColor: active ? t.border : colors.line,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}
    >
      <Icon name={icon} size={16} color={active ? t.fg : colors.mute} strokeWidth={active ? 2.5 : 2} fill={icon === 'bookmark' && active ? t.fg : 'none'} />
      {/* `text-meta` fija su propio color (mute) y se lo queda también con el botón activo */}
      <AppText numberOfLines={truncate ? 1 : undefined} style={[tx('meta'), { fontFamily: 'Inter-500', letterSpacing: -0.325, maxWidth: '100%' }]}>
        {label}
      </AppText>
    </Press>
  )
}

/** «Tu estado»: tres botones, aviso de quién te la pasó y el panel «Tu puesto» (ItemDetail.tsx:171-241). */
export function StatusSection({ item, onNotify }: { item: Item; onNotify: (m: string) => void }) {
  const label = SHELF_LABEL[item.type]
  const entry = useStore((s) => s.entries[item.id])
  const ranking = useStore((s) => s.rankings[item.type]) ?? []
  const setStatus = useStore((s) => s.setStatus)
  const ranks = useRanks()
  const status = entry?.status
  const pos = ranking.indexOf(item.id)
  const myRank = ranks[item.id]

  // La hoja de valorar vive aquí: abrirla solo vuelve a pintar esta sección, no toda la ficha.
  const [rating, setRating] = useState<{ withStars: boolean } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const openRating = () => setRating({ withStars: !entry?.stars && !entry?.ranked })

  const toggle = (s: Status) => {
    haptic('tap')
    if (status === s) {
      setStatus(item.id, null)
      return
    }
    if (s === 'seen') {
      // La hoja se abre en el mismo toque; el cambio de estado (y todo lo que repinta) espera a que ya esté en marcha.
      // Si la hoja se cierra antes, `rate` ya deja la obra como vista.
      openRating()
      timer.current = setTimeout(() => {
        if (useStore.getState().entries[item.id]?.status !== 'seen') setStatus(item.id, 'seen')
      }, 150)
      return
    }
    setStatus(item.id, s)
  }

  return (
    <View accessibilityLabel="Tu estado">
      <AppText style={[tx('label'), { marginBottom: 10 }]}>Tu estado</AppText>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StateButton status="dismissed" active={status === 'dismissed'} label="No me interesa" icon="x" onPress={() => toggle('dismissed')} />
        <StateButton status="pending" active={status === 'pending'} label="Guardar" icon="bookmark" onPress={() => toggle('pending')} />
        <StateButton status="seen" active={status === 'seen'} label={label.actionPast} icon="check" truncate onPress={() => toggle('seen')} />
      </View>
      {entry?.origin && status === 'pending' ? <AppText style={[tx('meta'), { marginTop: 8 }]}>{`Te ${label.pronoun} pasó ${entry.origin}`}</AppText> : null}
      {status === 'seen' && (
        <View style={{ marginTop: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText style={tx('meta')}>Tu puesto</AppText>
            {entry?.ranked && myRank ? <RankBadge pos={myRank.pos} size="lg" /> : null}
          </View>
          {pos >= 0 && (
            <AppText style={[tx('meta'), { marginTop: 4 }]}>
              {'nº '}
              <AppText style={{ fontFamily: 'Inter-700', color: colors.ink }}>{String(pos + 1)}</AppText>
              {` de tus ${ranking.length} ${label.plural.toLowerCase()}`}
            </AppText>
          )}
          {entry?.comment ? <AppText style={[tx('body'), { marginTop: 8, fontFamily: 'Fraunces72-400-italic', color: alpha(colors.ink, 0.9) }]}>{`«${entry.comment}»`}</AppText> : null}
          <Press
            onPress={openRating}
            accessibilityRole="button"
            style={{ marginTop: 12, alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Icon name="edit" size={16} color={colors.ink} />
            <AppText style={[tx('meta'), { fontFamily: 'Inter-500', color: colors.ink }]}>{entry?.comment ? 'Editar comentario' : entry?.stars ? 'Añadir comentario' : 'Valorar'}</AppText>
          </Press>
        </View>
      )}
      {rating && (
        <RatingFlow
          withStars={rating.withStars}
          itemId={item.id}
          onDone={(m) => {
            setRating(null)
            if (m) onNotify(m)
          }}
        />
      )}
    </View>
  )
}
