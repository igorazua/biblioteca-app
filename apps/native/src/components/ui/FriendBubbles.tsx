import { useMemo, useState, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { Press } from '../Press'
import { alpha, colors } from '../../theme'
import { haptic } from '../../lib/haptics'
import type { ShelfTerms } from '@biblioteca/core'
import { Avatar } from './Avatar'
import { RankBadge } from './RankBadge'

// FriendBubbles de ui.tsx de la PWA: caras de amigos con su señal. Recibe datos por props; no lee stores.
// Tipo local `BubbleFriend` (no `FriendHit`: en core ese nombre es otra forma, con `friend` y `entry`).
export interface BubbleFriend {
  id: string
  name: string
  avatarColor: string
  avatarUrl?: string | null
  status: 'seen' | 'pending'
  comment?: string | null
  /** Puesto de esta obra en su ranking, si lo tiene. */
  rank?: { pos: number; total: number } | null
}

export interface FriendBubblesProps {
  /** Amigos con esta obra, ya filtrados. */
  hits: BubbleFriend[]
  /** Textos de la estantería (SHELF_LABEL en la PWA). */
  terms: ShelfTerms
  /** Caras visibles antes del «+N». 4 por defecto. */
  max?: number
  /** Sin sesión: la etiqueta lleva «(ejemplo)». */
  example?: boolean
}

const LONG_PRESS_MS = 350 // igual que el temporizador de la PWA (FriendBubbles, 350 ms)
const RING = 'rgba(0, 0, 0, 0.7)'
const BADGE_RING = 'rgba(0, 0, 0, 0.6)'

/** Orden de la PWA (§7.8): primero las que tienen comentario, luego por puesto. */
function byCommentThenRank(a: BubbleFriend, b: BubbleFriend): number {
  const ac = Boolean(a.comment)
  const bc = Boolean(b.comment)
  if (ac !== bc) return ac ? -1 : 1
  return (a.rank?.pos ?? 9999) - (b.rank?.pos ?? 9999)
}

/** Anillo de 2 px por fuera de la cara (ring-2 de Tailwind). */
function Ring({ color }: { color: string }) {
  return <View pointerEvents="none" style={[styles.ring, { borderColor: color }]} />
}

export function FriendBubbles({ hits, terms, max = 4, example = false }: FriendBubblesProps): ReactNode {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sorted = useMemo(() => [...hits].sort(byCommentThenRank), [hits])
  if (!sorted.length) return null

  const shown = sorted.slice(0, max)
  const extra = sorted.length - shown.length
  const seen = sorted.filter((h) => h.status === 'seen')
  const label = seen.length
    ? `${seen[0].name}${seen.length > 1 ? ` y ${seen.length - 1} más` : ''} ${seen.length > 1 ? terms.verbPerfPlural : terms.verbPerfSingular}`
    : `${sorted[0].name}${sorted.length > 1 ? ` y ${sorted.length - 1} más` : ''} ${sorted.length > 1 ? terms.pendingPlural : terms.pendingSingular}`
  const active = sorted.find((h) => h.id === activeId) ?? null

  return (
    <View style={styles.wrap} accessibilityLabel={label}>
      <View style={styles.row}>
        {shown.map((h, i) => (
          <Press
            key={h.id}
            accessibilityLabel={h.name}
            delayLongPress={LONG_PRESS_MS}
            onLongPress={() => {
              haptic('tap')
              setActiveId(h.id)
            }}
            onPressOut={() => setActiveId(null)}
            style={[styles.bubble, { marginLeft: i ? 2 : 0, zIndex: 10 - i }]}
          >
            <View style={styles.face}>
              <Avatar name={h.name} color={h.avatarColor} url={h.avatarUrl} size={34} />
              <Ring color={RING} />
              {/* Cada señal en su esquina: abajo a la derecha el puesto (o el marcador si está pendiente, nunca los dos). */}
              {h.status === 'seen' && h.rank ? (
                <View style={styles.rankBadge}>
                  <AppText fixed style={styles.rankText}>{String(h.rank.pos)}</AppText>
                </View>
              ) : (
                <View style={styles.pendingBadge}>
                  <Icon name="bookmark" size={8} color="#ffffff" fill="#ffffff" strokeWidth={2.5} />
                </View>
              )}
              {h.comment ? (
                <View style={styles.commentBadge}>
                  <Icon name="message" size={7} color="#ffffff" fill="#ffffff" strokeWidth={1} />
                </View>
              ) : null}
            </View>
          </Press>
        ))}
        {extra > 0 ? (
          <View style={styles.more}>
            <AppText fixed style={styles.moreText}>{`+${extra}`}</AppText>
            <Ring color={RING} />
          </View>
        ) : null}
      </View>

      <View style={styles.labelPill}>
        <AppText style={styles.labelText}>{`${label}${example ? ' (ejemplo)' : ''}`}</AppText>
      </View>

      {/* Al mantener pulsada una cara: quién es, su puesto «de cuántas» y lo que escribió (§7.8). Sin toques: pointerEvents none. */}
      {active ? (
        <View pointerEvents="none" style={styles.tip}>
          <View style={styles.tipHead}>
            <Avatar name={active.name} color={active.avatarColor} url={active.avatarUrl} size={36} />
            <View style={styles.tipText}>
              <AppText numberOfLines={1} style={styles.tipName}>{active.name}</AppText>
              {active.status === 'seen' && active.rank ? (
                <AppText style={styles.tipSub}>{`nº ${active.rank.pos} de sus ${active.rank.total} ${terms.plural.toLowerCase()}`}</AppText>
              ) : active.status === 'pending' ? (
                <AppText style={[styles.tipSub, styles.tipPending]}>{terms.pendingSingular}</AppText>
              ) : (
                <AppText style={styles.tipSub}>{terms.verbPerfSingular}</AppText>
              )}
            </View>
            {active.status === 'seen' && active.rank ? <RankBadge pos={active.rank.pos} style={styles.tipRank} /> : null}
          </View>
          {active.comment ? (
            <AppText style={styles.tipComment}>
              {`«${active.comment.split('\n')[0].slice(0, 120)}${active.comment.length > 120 ? '…' : ''}»`}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', alignItems: 'flex-end', gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  bubble: {},
  face: { width: 34, height: 34 },
  ring: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 999,
    borderWidth: 2,
  },
  // Los badges llevan el anillo de 1 px dentro de la caja (borderWidth): la caja es 2 pt mayor que la de la PWA
  // y el desplazamiento 1 pt menor, para que el borde exterior caiga donde cae el ring-1 de Tailwind.
  rankBadge: {
    position: 'absolute',
    bottom: -5,
    right: -7,
    zIndex: 10,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BADGE_RING,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontFamily: 'Inter-700', fontSize: 10, lineHeight: 10, color: colors.accentInk, fontVariant: ['tabular-nums'] },
  pendingBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    zIndex: 10,
    width: 17,
    height: 17,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BADGE_RING,
    backgroundColor: colors.stampBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    zIndex: 20,
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: RING,
    backgroundColor: '#161513',
    alignItems: 'center',
    justifyContent: 'center',
  },
  more: { marginLeft: 2, width: 34, height: 34, borderRadius: 999, backgroundColor: RING, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontFamily: 'Inter-600', fontSize: 12, lineHeight: 16, color: colors.ink },
  labelPill: {
    marginTop: 8,
    alignSelf: 'flex-end',
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  labelText: { fontFamily: 'Inter-400', fontSize: 11, color: alpha('#ffffff', 0.85) },
  tip: {
    position: 'absolute',
    top: 48,
    right: 0,
    zIndex: 50,
    elevation: 12,
    minWidth: 200,
    maxWidth: 250,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#181715',
    // shadow-2xl: color fijado en index.css (rgb(20 12 2 / 0.7)).
    shadowColor: 'rgb(20, 12, 2)',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.7,
    shadowRadius: 25,
  },
  tipHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  tipText: { flexShrink: 1, minWidth: 0 },
  tipName: { fontFamily: 'Inter-600', fontSize: 13, lineHeight: 18, color: '#ffffff' },
  tipSub: { fontFamily: 'Inter-400', fontSize: 11, lineHeight: 15, color: alpha('#ffffff', 0.7) },
  tipPending: { fontFamily: 'Inter-500', color: colors.stampBlue },
  tipRank: { marginLeft: 'auto' },
  // La PWA usa la serif en cursiva (leading-snug = 1,375 × 13); Fraunces no trae cursiva en la fase 1 (anotado en el informe).
  tipComment: { fontFamily: 'Fraunces72-400', fontSize: 13, lineHeight: 17.875, color: alpha('#ffffff', 0.9) },
})
