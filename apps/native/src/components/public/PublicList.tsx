import { useEffect, useMemo, useState } from 'react'
import { FlatList, Linking, StyleSheet, View } from 'react-native'
import { router, usePathname } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getItem, isKnownItem, itemFacts, typeName, type Item } from '@biblioteca/core'
import { decodeList } from '@biblioteca/core/src/lib/share'
import { posterRadius } from '@biblioteca/core/src/lib/posterShape'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { Poster } from '../Poster'
import { Press } from '../Press'
import { Avatar, Button, Toast } from '../ui'
import { posterAspect, titleOf } from '../../lib/item'
import { BUILT } from '../../lib/phase'
import { useCatalog, useStore } from '../../store'
import { colors, tx } from '../../theme'
import { BOTTOM_BAR_SPACE, BrokenLink, PublicShell } from './PublicShell'

/**
 * Lista compartida (PublicList de Public.tsx). Guardar sin cuenta ni onboarding: si el onboarding aún no está construido
 * (BUILT.onboarding), la obra se guarda directamente como pendiente, como la PWA cuando el usuario ya está onboarded.
 */
export function PublicList({ payload }: { payload: string }) {
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
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
    if (data?.items) void useCatalog.getState().ensureItems(data.items.map(([id]) => id))
  }, [data])

  // Volvemos del onboarding con un guardado en espera: se aplica ahora (como en la PWA).
  useEffect(() => {
    if (onboarded && pendingSave) {
      const n = applyPendingSave()
      if (n) setToast(`${n} guardada${n > 1 ? 's' : ''} como pendiente${n > 1 ? 's' : ''}`)
    }
  }, [onboarded, pendingSave, applyPendingSave])

  if (!data) return <BrokenLink />
  const { list, items } = data
  const ids = items.map(([id]) => id)

  const save = (these: string[]) => {
    if (!onboarded && BUILT.onboarding) {
      setPendingSave({ ids: these, origin: list.a })
      router.push(`/onboarding?next=${encodeURIComponent(pathname)}`)
      return
    }
    const n = saveItemsAsPending(these, list.a)
    setToast(n ? `${n} guardada${n > 1 ? 's' : ''} como pendiente${n > 1 ? 's' : ''}` : 'Ya la tenías en tu biblioteca')
  }

  const count = `${ids.length} obra${ids.length !== 1 ? 's' : ''}${data.missing ? ` · ${data.missing} ya no está${data.missing > 1 ? 'n' : ''} en el catálogo` : ''}`

  const header = (
    <View style={{ paddingBottom: 24 }}>
      <View style={styles.author}>
        <Avatar name={list.a} color={list.c} size={40} />
        <AppText style={[tx('meta'), { color: colors.mute, flex: 1 }]}>
          <AppText style={{ color: colors.ink, fontFamily: 'Inter-600' }}>{list.a}</AppText> te ha preparado esta lista
        </AppText>
      </View>
      <AppText style={[tx('display'), { color: colors.ink, marginTop: 12 }]}>{list.t}</AppText>
      {list.d ? <AppText style={[tx('body'), { color: colors.mute, marginTop: 8 }]}>{list.d}</AppText> : null}
      <AppText style={[tx('meta'), { color: colors.mute, marginTop: 12 }]}>{count}</AppText>
    </View>
  )

  return (
    <PublicShell bottomBar={<Button variant="primary" onPress={() => save(ids)} style={styles.bulk}>Guardar toda la lista</Button>}>
      <FlatList
        data={items}
        keyExtractor={([id]) => id}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item: [id, note] }) => {
          const it = getItem(id)
          if (!it) return null
          return <ListRow item={it} note={note} saved={!!entries[id] && entries[id].status !== 'dismissed'} onSave={() => save([id])} />
        }}
        contentContainerStyle={{ paddingBottom: BOTTOM_BAR_SPACE + insets.bottom }}
        showsVerticalScrollIndicator={false}
      />
      {toast ? <Toast key={toast} message={toast} onDone={() => setToast(null)} /> : null}
    </PublicShell>
  )
}

function ListRow({ item: it, note, saved, onSave }: { item: Item; note?: string; saved: boolean; onSave: () => void }) {
  const facts = itemFacts(it)
  return (
    <View style={styles.card}>
      <Poster item={it} style={[styles.poster, { aspectRatio: posterAspect(it), borderRadius: posterRadius(it.type, 10) as number }]} />
      <View style={styles.info}>
        <AppText style={[tx('label'), { color: colors.mute }]}>
          {typeName(it.type)} · {it.year}
        </AppText>
        <AppText style={[tx('item'), { color: colors.ink, marginTop: 2 }]}>{titleOf(it)}</AppText>
        <AppText style={[tx('meta'), { color: colors.mute, marginTop: 2 }]}>{facts ? `${it.creator} · ${facts}` : it.creator}</AppText>
        {note ? <AppText style={[tx('body'), { color: colors.accent, marginTop: 6, fontFamily: 'Fraunces72-400-italic' }]}>«{note}»</AppText> : null}
        <AppText style={[tx('meta'), { color: colors.mute, marginTop: 6 }]} numberOfLines={2}>
          {it.synopsis}
        </AppText>
        {it.type === 'song' ? (
          <Press
            accessibilityRole="link"
            accessibilityLabel="Abrir en Spotify"
            onPress={() => void Linking.openURL(`https://open.spotify.com/search/${encodeURIComponent(`${it.title} ${it.creator}`)}`)}
            style={styles.spotify}
          >
            <Icon name="disc" size={13} color={colors.accent} />
            <AppText style={[tx('meta'), { color: colors.accent }]}>Abrir en Spotify</AppText>
          </Press>
        ) : null}
        <Press
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Ya en tu biblioteca' : 'Guardar en mi biblioteca'}
          accessibilityState={{ disabled: saved }}
          disabled={saved}
          onPress={onSave}
          style={styles.saveOne}
        >
          <Icon name={saved ? 'check' : 'bookmark'} size={14} color={saved ? colors.stampGreen : colors.ink} />
          <AppText style={[tx('meta', { fontFamily: 'Inter-500' }), { color: saved ? colors.stampGreen : colors.ink }]}>
            {saved ? 'Ya en tu biblioteca' : 'Guardar en mi biblioteca'}
          </AppText>
        </Press>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  author: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bulk: { width: '100%' },
  card: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  poster: { width: 84, alignSelf: 'center', overflow: 'hidden', flexShrink: 0 },
  info: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  spotify: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  saveOne: {
    marginTop: 'auto',
    paddingTop: 8,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    alignSelf: 'flex-start',
  },
})
