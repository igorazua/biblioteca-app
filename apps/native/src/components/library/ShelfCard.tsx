import { useMemo } from 'react'
import { FlatList, View } from 'react-native'
import { useRouter } from 'expo-router'
import { getItem, SHELF_LABEL, type ShelfType } from '@biblioteca/core'
import { colors, tx } from '../../theme'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { PosterTile } from '../ItemRow'
import { Press } from '../Press'
import { PosterPile } from './LibraryParts'

interface Props {
  shelf: ShelfType
  /** Obras ordenadas, en orden de puesto. */
  ranked: string[]
  /** Vistas sin ordenar (como mucho 10 se muestran). */
  unranked: string[]
  pendingCount: number
}

/** Una estantería en Biblioteca (Library.tsx:129-176): cabecera que abre la estantería, fila de portadas o estado vacío. */
export function ShelfCard({ shelf, ranked, unranked, pendingCount }: Props) {
  const router = useRouter()
  const label = SHELF_LABEL[shelf]
  const total = ranked.length + unranked.length
  const data = useMemo(
    () => [
      ...ranked.filter((id) => getItem(id)).map((id, i) => ({ id, rank: i + 1 })),
      ...unranked.slice(0, 10).map((id) => ({ id, rank: undefined as number | undefined })),
    ],
    [ranked, unranked],
  )

  return (
    <View style={{ marginHorizontal: 16, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingTop: 4, paddingBottom: 16 }}>
      <Press
        onPress={() => router.push(`/estanteria/${shelf}`)}
        accessibilityRole="link"
        accessibilityLabel={label.plural}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, minHeight: 52 }}
      >
        <AppText style={[tx('title'), { color: colors.ink }]}>{label.plural}</AppText>
        <AppText style={[tx('meta'), { color: colors.mute, fontVariant: ['tabular-nums'] }]}>
          {total}
          {pendingCount > 0 ? ` · ${pendingCount} pendientes` : ''}
        </AppText>
        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <AppText style={[tx('meta'), { color: colors.accent, fontFamily: 'Archivo-Regular' }]}>Ver todo</AppText>
          <Icon name="chevron" size={14} color={colors.accent} />
        </View>
      </Press>

      {data.length > 0 ? (
        <FlatList
          horizontal
          data={data}
          keyExtractor={(d) => d.id}
          showsHorizontalScrollIndicator={false}
          initialNumToRender={6}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, gap: 12, alignItems: 'flex-end' }}
          renderItem={({ item }) => <PosterTile item={getItem(item.id)} rank={item.rank} />}
        />
      ) : (
        <View style={{ marginHorizontal: 16, gap: 8 }}>
          <Press
            onPress={() => router.navigate({ pathname: '/descubrir', params: { shelf } })}
            style={{ borderRadius: 16, backgroundColor: colors.surface2, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}
          >
            <PosterPile shelf={shelf} />
            <AppText style={[tx('body'), { flex: 1, color: colors.mute, fontSize: 14, lineHeight: 20 }]}>
              Aún está vacía. <AppText style={{ color: colors.ink, fontFamily: 'Archivo-Regular' }}>Haz swipe en Descubrir</AppText> y se llena sola.
            </AppText>
            <Icon name="chevron" size={18} color={colors.mute} />
          </Press>
          {/* Importar (película, serie y libro) no se muestra: la pantalla Importar aún no existe (phase.ts). */}
        </View>
      )}
    </View>
  )
}
