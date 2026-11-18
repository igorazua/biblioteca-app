import { useRef, type ComponentRef, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import type { Friend, Item } from '@biblioteca/core'
import { posterAspect, titleOf } from '../../lib/item'
import { useFlight } from '../../lib/flight'
import { colors, tx } from '../../theme'
import { AppText } from '../AppText'
import { Icon, type IconName } from '../Icon'
import { Poster } from '../Poster'
import { Press } from '../Press'
import { Avatar } from '../ui'

// Piezas de Profile.tsx de la PWA.

/** Contador de la cabecera (`Counter`, Profile.tsx:305): cifra `text-lg font-bold tabular-nums leading-none` y etiqueta de 11. */
export function Counter({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <AppText style={styles.counterValue}>{String(value)}</AppText>
      <AppText style={styles.counterLabel}>{label}</AppText>
    </View>
  )
}

/** Sección con título `text-title font-medium` y `mb-3`. */
export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View accessibilityLabel={title}>
      <View style={styles.sectionHead}>
        <AppText style={[tx('title'), { color: colors.ink }]}>{title}</AppText>
        {right}
      </View>
      {children}
    </View>
  )
}

/** Obra del top 3: póster con la insignia del puesto y el título debajo. Abre la ficha con el vuelo del póster. */
export function TopTile({ item, pos }: { item: Item; pos: number }) {
  const flight = useFlight()
  const ref = useRef<ComponentRef<typeof View>>(null)
  return (
    <Press
      style={{ flex: 1, minWidth: 0 }}
      accessibilityRole="button"
      accessibilityLabel={`Nº ${pos}: ${titleOf(item)}`}
      onPress={() => flight.openFromRef(item, ref, 10)}
    >
      <View ref={ref} collapsable={false}>
        <Poster item={item} style={{ width: '100%', aspectRatio: posterAspect(item), borderRadius: 10 }} />
        <View style={styles.badge}>
          <AppText fixed style={styles.badgeText}>
            {String(pos)}
          </AppText>
        </View>
      </View>
      <AppText numberOfLines={2} style={[tx('item'), { color: colors.ink, lineHeight: 20, marginTop: 6 }]}>
        {titleOf(item)}
      </AppText>
    </Press>
  )
}

/** Tarjeta de «Mis números»: cifra y etiqueta. Con `onPress`, abre la estantería. */
export function StatCard({ big, small, label, onPress }: { big: string; small?: boolean; label: string; onPress?: () => void }) {
  const body = (
    <>
      <AppText numberOfLines={1} style={small ? styles.statSmall : styles.statBig}>
        {big}
      </AppText>
      <AppText numberOfLines={small ? undefined : 1} style={[tx('meta'), { marginTop: 6 }]}>
        {label}
      </AppText>
    </>
  )
  if (!onPress) return <View style={styles.statCard}>{body}</View>
  return (
    <Press accessibilityRole="button" accessibilityLabel={`${big} ${label}`} onPress={onPress} style={styles.statCard}>
      {body}
    </Press>
  )
}

/** Fila de un amigo con su barra de afinidad. */
export function AffinityRow({ friend, a, example }: { friend: Friend; a: number | null; example: boolean }) {
  return (
    <View style={styles.friendRow}>
      <Avatar name={friend.name} color={friend.avatarColor} url={friend.avatarUrl} size={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText style={styles.friendName}>
          {friend.name}
          {example ? <AppText style={styles.example}>{' (ejemplo)'}</AppText> : null}
        </AppText>
        {a !== null ? (
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${a}%` }]} />
          </View>
        ) : (
          <AppText style={styles.noCommon}>Aún sin obras en común</AppText>
        )}
      </View>
      {a !== null && <AppText style={styles.pct}>{`${a}%`}</AppText>}
    </View>
  )
}

/** Fila de aviso que lleva a otra pantalla (`perfil incompleto`). */
export function NoticeLink({ icon, text, onPress }: { icon: IconName; text: string; onPress: () => void }) {
  return (
    <Press accessibilityRole="link" accessibilityLabel={text} onPress={onPress} style={styles.notice}>
      <Icon name={icon} size={16} color={colors.accent} />
      <AppText style={[tx('meta'), { flex: 1 }]}>{text}</AppText>
      <Icon name="chevron" size={16} color={colors.mute} />
    </Press>
  )
}

const styles = StyleSheet.create({
  counterValue: { fontFamily: 'Archivo-SemiBold', fontSize: 18, lineHeight: 18, color: colors.ink, fontVariant: ['tabular-nums'] },
  counterLabel: { fontFamily: 'Archivo-Regular', fontSize: 11, color: colors.mute, marginTop: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  badge: { position: 'absolute', top: 6, left: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: 'Archivo-SemiBold', fontSize: 11, lineHeight: 14, color: colors.accentInk, fontVariant: ['tabular-nums'] },
  statCard: { width: '48%', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 12 },
  statBig: { fontFamily: 'Archivo-SemiBold', fontSize: 24, lineHeight: 24, color: colors.ink, fontVariant: ['tabular-nums'] },
  statSmall: { fontFamily: 'Archivo-SemiBold', fontSize: 18, lineHeight: 18, color: colors.ink },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 12 },
  friendName: { fontFamily: 'Archivo-SemiBold', fontSize: 14, lineHeight: 20, color: colors.ink },
  example: { fontFamily: 'Archivo-Regular', fontSize: 10, color: colors.mute },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.line, marginTop: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: colors.accent },
  noCommon: { fontFamily: 'Archivo-Regular', fontSize: 12, lineHeight: 16, color: colors.mute },
  pct: { fontFamily: 'Archivo-SemiBold', fontSize: 16, lineHeight: 24, color: colors.accent, fontVariant: ['tabular-nums'] },
  notice: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
})

