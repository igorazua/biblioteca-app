import { useMemo, useRef, type ComponentRef } from 'react'
import { ScrollView, View } from 'react-native'
import { useScrollToTop } from 'expo-router'
import { itemsOfType } from '@biblioteca/core'
import { AppText } from '../../components/AppText'
import { ItemRow, PosterTile } from '../../components/ItemRow'
import { ScreenTitle } from '../../components/ScreenTitle'
import { colors, tx } from '../../theme'

// Biblioteca: solo la prueba del número de ranking hueco (D11) con obras reales; lo demás se porta con la pantalla.
export default function Biblioteca() {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null)
  useScrollToTop(ref)
  const top = useMemo(() => [...itemsOfType('movie')].sort((a, b) => b.popularity - a.popularity).slice(0, 3), [])
  return (
    <ScrollView ref={ref} contentContainerStyle={{ paddingBottom: 24 }}>
      <ScreenTitle label="TU BIBLIOTECA" title="Biblioteca" />
      <AppText style={[tx('label'), { paddingHorizontal: 20, marginBottom: 12 }]}>Prueba · número hueco</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 4, alignItems: 'flex-end' }}>
        {top.map((it, i) => (
          <PosterTile key={it.id} item={it} rank={i + 1} />
        ))}
      </ScrollView>
      <View style={{ marginHorizontal: 20, marginTop: 24, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
        {top.map((it, i) => (
          <View key={it.id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined}>
            <ItemRow item={it} rank={i + 1} highlight={i === 0} />
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
