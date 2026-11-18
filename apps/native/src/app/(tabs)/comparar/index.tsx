import { useMemo, useRef, type ComponentRef } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { router, useScrollToTop } from 'expo-router'
import { ACTIVE_SHELVES, SHELF_LABEL, getItem, planNextDuel, type Item, type PlannedDuel, type ShelfType } from '@biblioteca/core'
import { starsOfEntries, useStore } from '../../../store'
import { posterAspect, titleOf } from '../../../lib/item'
import { colors, tx } from '../../../theme'
import { AppText } from '../../../components/AppText'
import { Poster } from '../../../components/Poster'
import { Press } from '../../../components/Press'
import { Button } from '../../../components/ui'
import { ScreenTitle } from '../../../components/ScreenTitle'
import { pctColor, setDuelHandoff, useCompareOverview, useFrozenWhenBlurred } from '../../../components/duel/overview'
import { byGender } from '@biblioteca/core'

const MAX_POSTERS_ROW = 5

function formatShelfNames(shelves: ShelfType[]): string {
  const names = shelves.map((s) => SHELF_LABEL[s].plural)
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} y ${names[1]}`
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}

/** Carta del próximo duelo: 118 × 177 (2:3), o la forma real si es un juego de mesa (posterBox). */
function PairCard({ item, side }: { item: Item; side: 'a' | 'b' }) {
  const board = item.type === 'boardgame'
  return (
    <View
      style={[
        {
          width: 118,
          borderRadius: 10,
          overflow: 'hidden',
          flexShrink: 0,
          transform: [{ rotate: side === 'a' ? '-5deg' : '5deg' }],
          marginLeft: side === 'b' ? -14 : 0,
          backgroundColor: colors.surface2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 7.5,
          elevation: 8,
        },
        board ? { aspectRatio: posterAspect(item) } : { height: 177 },
      ]}
    >
      <Poster item={item} showTitle={false} noBlur style={StyleSheet.absoluteFill} />
    </View>
  )
}

// ¡Duelos! · portada (CompareHome.tsx): el próximo duelo, las otras estanterías y las que aún no tienen 2 vistas.
export default function CompareHome() {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null)
  useScrollToTop(ref)
  const overview = useCompareOverview()
  const entries = useFrozenWhenBlurred(useStore((s) => s.entries))
  const rankings = useFrozenWhenBlurred(useStore((s) => s.rankings))
  const duels = useFrozenWhenBlurred(useStore((s) => s.duels))

  // Comparaciones por obra para el planificador
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const e of Object.values(entries)) if (e.cmp) c[e.itemId] = e.cmp
    return c
  }, [entries])

  // Disponibles, ordenadas por más sin ordenar y, si empatan, menor % ordenado (T19 §4.2.2)
  const availableShelves = useMemo(
    () =>
      ACTIVE_SHELVES.filter((s) => overview.shelves[s]?.disponible).sort((a, b) => {
        const oA = overview.shelves[a]
        const oB = overview.shelves[b]
        if (oB.sinOrdenar !== oA.sinOrdenar) return oB.sinOrdenar - oA.sinOrdenar
        if (oA.ordenado !== oB.ordenado) return oA.ordenado - oB.ordenado
        return oA.pulido - oB.pulido
      }),
    [overview],
  )
  const unavailableShelves = useMemo(() => ACTIVE_SHELVES.filter((s) => !overview.shelves[s]?.disponible), [overview])

  const recShelf = availableShelves[0] as ShelfType | undefined
  const recOverview = recShelf ? overview.shelves[recShelf] : undefined
  const totalSinOrdenar = useMemo(() => availableShelves.reduce((acc, s) => acc + (overview.shelves[s]?.sinOrdenar ?? 0), 0), [availableShelves, overview])
  const allAt100 = useMemo(() => availableShelves.length > 0 && availableShelves.every((s) => (overview.shelves[s]?.ordenado ?? 0) === 100), [availableShelves, overview])

  // Próximo duelo para la estantería recomendada (sin consumirlo)
  const nextDuel = useMemo<PlannedDuel | null>(() => {
    if (!recShelf) return null
    const rk = rankings[recShelf] ?? []
    const unranked = Object.values(entries)
      .filter((e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === recShelf && (!rk.includes(e.itemId) || Boolean(e.provisional)))
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .map((e) => ({ itemId: e.itemId, stars: e.stars }))
    return planNextDuel({
      shelf: recShelf,
      ranking: rk,
      unranked,
      duels: duels[recShelf] ?? {},
      cmp: counts,
      sessionIndex: 0,
      activePlacement: null,
      refineState: null,
      starsOf: starsOfEntries(entries),
    })
  }, [recShelf, rankings, entries, duels, counts])

  const pairItems = useMemo<{ a: Item; b: Item } | null>(() => {
    if (!nextDuel) return null
    const itA = getItem(nextDuel.a)
    const itB = getItem(nextDuel.b)
    return itA && itB ? { a: itA, b: itB } : null
  }, [nextDuel])

  // Título y subtítulo de la cabecera (T19 §4.2.2)
  let title = '¡Duelos!'
  let subtitle: string | undefined
  if (availableShelves.length === 0) {
    title = 'Todo por empezar'
    subtitle = 'Marca obras como vistas en Descubrir para ordenarlas'
  } else if (recOverview && recOverview.sinOrdenar > 0) {
    title = `${recOverview.sinOrdenar} ${SHELF_LABEL[recShelf!].plural.toLowerCase()} esperan su sitio`
  } else if (totalSinOrdenar === 0) {
    if (allAt100) {
      title = 'Todo en su sitio'
      subtitle = 'Marca más en Descubrir y seguimos'
    } else {
      const minShelf = [...availableShelves].sort((a, b) => (overview.shelves[a]?.ordenado ?? 0) - (overview.shelves[b]?.ordenado ?? 0))[0]
      title = `Seguimos puliendo tus ${SHELF_LABEL[minShelf].plural.toLowerCase()}`
    }
  }

  const otherShelves = availableShelves.slice(1)

  const startDuel = () => {
    if (!recShelf) return
    setDuelHandoff(nextDuel)
    router.push({ pathname: '/comparar/[shelf]', params: { shelf: recShelf } })
  }
  const openShelf = (s: ShelfType) => {
    setDuelHandoff(null)
    router.push({ pathname: '/comparar/[shelf]', params: { shelf: s } })
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenTitle label="DUELOS" title={title} subtitle={subtitle} />
      <ScrollView ref={ref} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} contentInsetAdjustmentBehavior="never">
        {/* 2. El próximo duelo (24 px bajo el título) */}
        {pairItems && recShelf ? (
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
              <PairCard item={pairItems.a} side="a" />
              <PairCard item={pairItems.b} side="b" />
              {/* Círculo central de 34 con «o» serif de 14 */}
              <View
                style={{
                  position: 'absolute',
                  alignSelf: 'center',
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: colors.bg,
                  borderWidth: 1,
                  borderColor: colors.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  elevation: 10,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                }}
              >
                <AppText style={{ fontFamily: 'Archivo-Regular', fontSize: 14, color: colors.mute }}>o</AppText>
              </View>
            </View>
            <AppText numberOfLines={1} style={{ fontFamily: 'Archivo-Regular', fontSize: 15, marginTop: 14, paddingHorizontal: 8, maxWidth: '100%', textAlign: 'center', color: colors.ink }}>
              <AppText style={{ fontFamily: 'Archivo-SemiBold' }}>{titleOf(pairItems.a)}</AppText>
              {' '}
              <AppText style={{ color: colors.mute }}>o</AppText>
              {' '}
              <AppText style={{ fontFamily: 'Archivo-SemiBold' }}>{titleOf(pairItems.b)}</AppText>
            </AppText>
            <Button variant="primary" onPress={startDuel} style={{ alignSelf: 'stretch', marginTop: 20 }}>
              Empezar · 7 duelos
            </Button>
          </View>
        ) : allAt100 ? (
          <View style={{ marginTop: 24, alignItems: 'center', paddingVertical: 24 }}>
            <Button variant="primary" onPress={() => router.push('/descubrir')} style={{ alignSelf: 'stretch', marginTop: 8 }}>
              Ir a Descubrir
            </Button>
          </View>
        ) : null}

        {/* 3. Otras estanterías (32 px bajo el botón) */}
        {otherShelves.length > 0 && (
          <View style={{ marginTop: 32 }}>
            <AppText style={tx('label')}>OTRAS ESTANTERÍAS</AppText>
            <View style={{ height: 1, backgroundColor: colors.line, marginTop: 10 }} />
            <View style={{ gap: 20, marginTop: 20 }}>
              {otherShelves.map((s) => {
                const o = overview.shelves[s]
                const rk = rankings[s] ?? []
                const unranked = Object.values(entries).filter(
                  (e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === s && (!rk.includes(e.itemId) || Boolean(e.provisional)),
                )
                // Cartas a mostrar: sin ordenar si hay, o las del próximo duelo a pulir
                let posterItems = unranked.map((e) => getItem(e.itemId)).filter(Boolean) as Item[]
                if (posterItems.length === 0) {
                  const pDuel = planNextDuel({ shelf: s, ranking: rk, unranked: [], duels: duels[s] ?? {}, cmp: counts })
                  if (pDuel) posterItems = [getItem(pDuel.a), getItem(pDuel.b)].filter(Boolean) as Item[]
                }
                const visible = posterItems.slice(0, MAX_POSTERS_ROW)
                const remaining = posterItems.length - MAX_POSTERS_ROW
                const pct = Math.min(100, Math.max(0, o.ordenado))
                return (
                  <Press key={s} onPress={() => openShelf(s)} scaleTo={0.99} accessibilityRole="button" accessibilityLabel={`${SHELF_LABEL[s].plural}, ${o.ordenado} % ordenado`}>
                    <View style={{ height: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <AppText style={{ fontFamily: 'Archivo-Condensed-ExtraBold', fontSize: 22, lineHeight: 22, textTransform: 'uppercase', color: colors.ink }}>{SHELF_LABEL[s].plural}</AppText>
                        <AppText style={[tx('meta'), { fontFamily: 'Archivo-SemiBold', color: pctColor(o.ordenado), fontVariant: ['tabular-nums'] }]}>{o.ordenado} %</AppText>
                      </View>
                      <AppText style={tx('meta')}>{o.sinOrdenar > 0 ? `${o.sinOrdenar} ${o.sinOrdenar === 1 ? byGender(s, 'nueva', 'nuevo') : byGender(s, 'nuevas', 'nuevos')}` : 'todo en su sitio'}</AppText>
                    </View>
                    <View style={{ marginTop: 8, height: 2, width: '100%', backgroundColor: colors.surface2, borderRadius: 1, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${pct}%`, borderRadius: 1, backgroundColor: pctColor(o.ordenado) }} />
                    </View>
                    {posterItems.length > 0 && (
                      <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                        {visible.map((it) => (
                          <View
                            key={it.id}
                            style={[
                              { width: 46, borderRadius: 6, overflow: 'hidden', flexShrink: 0, backgroundColor: colors.surface2 },
                              it.type === 'boardgame' ? { aspectRatio: posterAspect(it) } : { height: 69 },
                            ]}
                          >
                            <Poster item={it} showTitle={false} noBlur style={StyleSheet.absoluteFill} />
                          </View>
                        ))}
                        {remaining > 0 && (
                          <View style={{ width: 46, height: 69, borderRadius: 6, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <AppText style={tx('meta')}>+{remaining}</AppText>
                          </View>
                        )}
                      </View>
                    )}
                  </Press>
                )
              })}
            </View>
          </View>
        )}

        {/* Estanterías no disponibles (menos de 2 vistas) */}
        {unavailableShelves.length > 0 && (
          <AppText style={[tx('meta'), { marginTop: 32, textAlign: 'center' }]}>
            {formatShelfNames(unavailableShelves)}:{' '}
            <AppText
              accessibilityRole="link"
              onPress={() => router.push(unavailableShelves.length === 1 ? { pathname: '/descubrir', params: { shelf: unavailableShelves[0] } } : '/descubrir')}
              style={[tx('meta'), { textDecorationLine: 'underline' }]}
            >
              marca alguna en Descubrir para empezar
            </AppText>
          </AppText>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  )
}
