import { useEffect, useMemo } from 'react'
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import { router } from 'expo-router'
import { ACTIVE_SHELVES, getItem, isKnownItem, SHELF_LABEL } from '@biblioteca/core'
import { decodeProfile } from '@biblioteca/core/src/lib/share'
import { posterRadius } from '@biblioteca/core/src/lib/posterShape'
import { AppText } from '../AppText'
import { Poster } from '../Poster'
import { Avatar, Button } from '../ui'
import { posterAspect, titleOf } from '../../lib/item'
import { useCatalog } from '../../store'
import { colors, tx } from '../../theme'
import { BOTTOM_BAR_SPACE, BrokenLink, PublicShell } from './PublicShell'

const GAP = 12
const GUTTER = 20

/** Perfil compartido (PublicProfile de Public.tsx): el top 3 de cada estantería en una rejilla de tres columnas. */
export function PublicProfile({ payload }: { payload: string }) {
  const { width } = useWindowDimensions()
  const catalogVersion = useCatalog((s) => s.version)
  const data = useMemo(() => decodeProfile(payload, isKnownItem), [payload, catalogVersion])

  useEffect(() => {
    if (data?.top) {
      const allIds = Object.values(data.top).flat()
      if (allIds.length > 0) void useCatalog.getState().ensureItems(allIds)
    }
  }, [data])

  if (!data) return <BrokenLink />

  // Columna de 480 como mucho (PublicShell): tres celdas con dos huecos entre medias.
  const column = Math.min(width, 480) - GUTTER * 2
  const cell = (column - GAP * 2) / 3

  return (
    <PublicShell
      bottomBar={<Button variant="primary" onPress={() => router.replace('/')} style={styles.cta}>Crear mi biblioteca</Button>}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: BOTTOM_BAR_SPACE }} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Avatar name={data.n} color={data.c} size={56} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText style={[tx('display'), { color: colors.ink }]}>{data.n}</AppText>
            <AppText style={[tx('meta'), { color: colors.mute }]}>Lo que más le ha marcado</AppText>
          </View>
        </View>

        {ACTIVE_SHELVES.map((t) => {
          const ids = data.top[t] ?? []
          if (!ids.length) return null
          return (
            <View key={t} style={{ marginTop: 28 }}>
              <AppText style={[tx('title'), { color: colors.ink, marginBottom: 12 }]}>{SHELF_LABEL[t].plural}</AppText>
              <View style={[styles.grid, { gap: GAP }]}>
                {ids.map((id, i) => {
                  const it = getItem(id)
                  if (!it) return null
                  return (
                    <View key={id} style={{ width: cell }}>
                      <View>
                        <Poster
                          item={it}
                          style={{ width: cell, aspectRatio: posterAspect(it), borderRadius: posterRadius(it.type, 10) as number, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}
                        />
                        <View style={styles.badge}>
                          <AppText fixed style={styles.badgeText}>
                            {i + 1}
                          </AppText>
                        </View>
                      </View>
                      <AppText style={[tx('item'), { color: colors.ink, marginTop: 6 }]} numberOfLines={2}>
                        {titleOf(it)}
                      </AppText>
                    </View>
                  )
                })}
              </View>
            </View>
          )
        })}
      </ScrollView>
    </PublicShell>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: 'Inter-700', fontSize: 11, lineHeight: 13, color: colors.accentInk, fontVariant: ['tabular-nums'] },
  cta: { width: '100%' },
})
