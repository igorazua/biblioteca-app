import { useEffect, useState } from 'react'
import { Modal, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import {
  SHELF_LABEL,
  advancePlacementWithDuels,
  answerPlacement,
  finishPlacement,
  getItem,
  placementOpponent,
  startPlacement,
  type Placement,
} from '@biblioteca/core'
import { starsOfEntries, useStore } from '../../store'
import { colors } from '../../theme'
import { DuelHeader } from './DuelHeader'
import { SwipePair } from './SwipePair'
import { sideOf } from './sides'
import { byGender } from '@biblioteca/core'

/**
 * Colocación por duelos (§13.1): solo al añadir una obra vista a mano. 2-4 duelos (búsqueda binaria dentro de su
 * franja de estrellas, o en toda la estantería si no tiene estrellas). Sin comentario: ya se pidió en la hoja.
 * Si no hay con quién comparar, termina al instante. Al acabar llama a `onDone(byGender(item.type, 'Guardada ✓', 'Guardado ✓'))`.
 * La PWA la pinta en un portal sobre el marco; aquí es un Modal a pantalla completa (atrás de Android = `onDone()` sin msg).
 */
export function PlaceFlow({ itemId, onDone }: { itemId: string; onDone: (msg?: string) => void }) {
  const item = getItem(itemId)!
  const [p, setP] = useState<Placement | null>(null)

  useEffect(() => {
    const st = useStore.getState()
    const ranking = st.rankings[item.type] ?? []
    const base = ranking.filter((x) => x !== itemId)
    const stars = st.entries[itemId]?.stars
    if (base.length < 2) {
      onDone(byGender(item.type, 'Guardada ✓', 'Guardado ✓'))
      return
    }
    let start = startPlacement(ranking, starsOfEntries(st.entries), itemId, stars ?? undefined)
    start = advancePlacementWithDuels(start, st.duels?.[item.type])
    if (start.done) {
      st.applyRanking(item.type, finishPlacement(start), itemId)
      onDone(byGender(item.type, 'Guardada ✓', 'Guardado ✓'))
      return
    }
    setP(start)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  if (!p) return null
  const opp = placementOpponent(p)
  if (!opp) return null
  // alternar el lado de la obra nueva para que no siempre esté arriba
  const newOnTop = p.comparisons % 2 === 0

  const onChoose = (w: 'a' | 'b') => {
    const won = (w === 'a') === newOnTop
    const winnerId = won ? itemId : opp
    const st = useStore.getState()
    st.recordDuel(item.type, itemId, opp, winnerId)
    st.bumpCompared([itemId, opp])
    let next = answerPlacement(p, won)
    next = advancePlacementWithDuels(next, st.duels?.[item.type])
    if (next.done) {
      useStore.getState().applyRanking(item.type, finishPlacement(next), itemId)
      onDone(byGender(item.type, 'Guardada ✓', 'Guardado ✓'))
    } else setP(next)
  }

  return (
    <Modal visible animationType="fade" onRequestClose={() => onDone()} supportedOrientations={['portrait']} statusBarTranslucent navigationBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }} accessibilityViewIsModal accessibilityLabel="Colocar en tu ranking">
        <DuelHeader
          label={`COLOCAR · ${SHELF_LABEL[item.type].plural.toUpperCase()}`}
          step={{ current: p.comparisons + 1, total: 3 }}
          title="¿Cuál te gustó más?"
          onBack={() => onDone()}
        />
        <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 20, paddingBottom: 24 }}>
          <SwipePair
            key={`${p.comparisons}-${opp}`}
            left={sideOf(getItem(newOnTop ? itemId : opp)!)}
            right={sideOf(getItem(newOnTop ? opp : itemId)!)}
            onChoose={onChoose}
            kind="rank"
          />
        </View>
      </GestureHandlerRootView>
    </Modal>
  )
}
