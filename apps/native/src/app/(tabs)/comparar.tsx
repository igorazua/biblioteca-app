import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { getItem, itemsOfType, type Item } from '@biblioteca/core'
import { AppText } from '../../components/AppText'
import { DuelFan, type Side } from '../../components/DuelFan'
import { Poster } from '../../components/Poster'
import { Press } from '../../components/Press'
import { ScreenTitle } from '../../components/ScreenTitle'
import { posterShape, titleOf } from '../../lib/item'
import { colors, tx } from '../../theme'

type Kind = 'movie' | 'boardgame' | 'artist'
const KINDS: { kind: Kind; label: string }[] = [
  { kind: 'movie', label: 'Pelis' },
  { kind: 'boardgame', label: 'Juegos' },
  { kind: 'artist', label: 'Música' },
]

/** Pares de prueba con obras reales. Los juegos de mesa son dos con `posterRatio` distinto, para recorrer `duelCardSize` (modo `area`). */
function pairsFor(kind: Kind): [Item, Item][] {
  if (kind === 'boardgame') {
    const ratio = itemsOfType('boardgame').filter((i) => i.posterRatio)
    const a = getItem('boardgame:ark-nova-2021')
    const b = getItem('boardgame:gloomhaven-2017')
    const first: [Item, Item] | null = a?.posterRatio && b?.posterRatio ? [a, b] : null
    const rest: [Item, Item][] = []
    for (let i = 2; i + 1 < ratio.length && rest.length < 8; i += 2) rest.push([ratio[i], ratio[i + 1]])
    return first ? [first, ...rest] : rest
  }
  const pop = [...itemsOfType(kind)].sort((x, y) => y.popularity - x.popularity).slice(0, 20)
  const out: [Item, Item][] = []
  for (let i = 0; i + 1 < pop.length; i += 2) out.push([pop[i], pop[i + 1]])
  return out
}

const sideOf = (it: Item): Side => ({
  key: it.id,
  title: titleOf(it),
  subtitle: String(it.year || ''),
  type: it.type,
  ratio: it.type === 'boardgame' ? it.posterRatio : undefined,
  // dentro del duelo no se pinta el relleno difuminado de los juegos de mesa
  bg: <Poster item={it} noBlur showTitle style={{ flex: 1 }} />,
})

// ¡Duelos!: prueba del abanico con la caja medida con onLayout y tamaño `area` (D4).
export default function Comparar() {
  const [kind, setKind] = useState<Kind>('movie')
  const [n, setN] = useState(0)
  const [last, setLast] = useState('')
  const pairs = useMemo(() => pairsFor(kind), [kind])
  const pair = pairs[n % Math.max(1, pairs.length)]
  const square = pair ? posterShape(pair[0].type) === 'square' && posterShape(pair[1].type) === 'square' : false

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenTitle label="DUELOS" title="¿Cuál te gustó más?" />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: -8, marginBottom: 8 }}>
        {KINDS.map((k) => (
          <Press
            key={k.kind}
            onPress={() => {
              setKind(k.kind)
              setN(0)
              setLast('')
            }}
            accessibilityRole="button"
            style={{ minHeight: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: k.kind === kind ? colors.accent : 'rgba(255,255,255,0.05)', borderColor: k.kind === kind ? colors.accent : 'rgba(255,255,255,0.1)' }}
          >
            <AppText style={{ fontFamily: 'Inter-500', fontSize: 14, lineHeight: 20, color: k.kind === kind ? colors.accentInk : 'rgba(244,239,230,0.8)' }}>{k.label}</AppText>
          </Press>
        ))}
      </View>
      <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 20, paddingBottom: 24 }}>
        {pair ? (
          <>
            <DuelFan
              key={pair[0].id + pair[1].id}
              left={sideOf(pair[0])}
              right={sideOf(pair[1])}
              fast
              square={square}
              onChoose={(w) => {
                setLast(`Elegiste ${titleOf(w === 'a' ? pair[0] : pair[1])}`)
                setN((i) => i + 1)
              }}
            />
            <AppText style={[tx('meta'), { textAlign: 'center', paddingVertical: 6 }]}>← Desliza hacia la que prefieras →</AppText>
            {!!last && <AppText numberOfLines={1} style={[tx('meta'), { textAlign: 'center' }]}>{last}</AppText>}
          </>
        ) : (
          <AppText style={tx('meta')}>No hay obras para este duelo.</AppText>
        )}
      </View>
    </View>
  )
}
