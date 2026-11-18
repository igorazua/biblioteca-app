import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import {
  ACTIVE_SHELVES,
  DUEL_MILESTONE,
  RANK_DUELS_FOR_DONE,
  SHELF_LABEL,
  applyDuelToRanking,
  assignSides,
  getItem,
  planNextDuel,
  type DuelRecord,
  type Item,
  type PlannedDuel,
  type ShelfType,
  type UserEntry,
} from '@biblioteca/core'
import { starsOfEntries, useStore } from '../../../store'
import { haptic } from '../../../lib/haptics'
import { posterAspect, titleOf } from '../../../lib/item'
import { colors, tx } from '../../../theme'
import { AppText } from '../../../components/AppText'
import { ActionBtn } from '../../../components/discover/ActionBtn'
import { Poster } from '../../../components/Poster'
import { Press } from '../../../components/Press'
import { Button, Group } from '../../../components/ui'
import { CommentSheet } from '../../../components/flows/RatingFlow'
import { ScreenTitle } from '../../../components/ScreenTitle'
import { takeDuelHandoff } from '../../../components/duel/overview'
import { SwipePair } from '../../../components/duel/SwipePair'
import { sideOf } from '../../../components/duel/sides'
import { byGender } from '@biblioteca/core'

interface Snapshot {
  entries: Record<string, UserEntry>
  ranking: string[]
  current: PlannedDuel | null
  count: number
  sides: Record<string, 'L' | 'R'>
  recent: string[]
  compared: Set<string>
  duelKey?: { a: string; b: string }
}

/** Igualdad superficial de dos mapas obra a lado: evita serializar a JSON en cada render. */
function sameSides(a: Record<string, 'L' | 'R'>, b: Record<string, 'L' | 'R'>): boolean {
  const ka = Object.keys(a)
  if (ka.length !== Object.keys(b).length) return false
  for (const k of ka) if (a[k] !== b[k]) return false
  return true
}

function calcShelfOrdenado(entries: Record<string, UserEntry>, rankings: Record<ShelfType, string[]>, shDuels: Record<string, DuelRecord>, shelf: ShelfType): number {
  const rk = rankings[shelf] ?? []
  const seen = Object.values(entries).filter((e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === shelf)
  if (seen.length === 0) return 0
  const duelCounts: Record<string, number> = {}
  for (const k of Object.keys(shDuels)) {
    const sep = k.indexOf('|')
    if (sep > 0) {
      const a = k.slice(0, sep)
      const b = k.slice(sep + 1)
      duelCounts[a] = (duelCounts[a] || 0) + 1
      duelCounts[b] = (duelCounts[b] || 0) + 1
    }
  }
  let bien = 0
  for (const e of seen) {
    if (rk.includes(e.itemId) && !e.provisional && (duelCounts[e.itemId] ?? 0) >= RANK_DUELS_FOR_DONE) bien++
  }
  return Math.round((100 * bien) / seen.length)
}

/** Vuelve a la portada de ¡Duelos! sacando la sesión de la pila. */
const toHome = () => {
  if (router.canGoBack()) router.back()
  else router.replace('/comparar')
}

export default function CompareSession() {
  const initialDuel = useRef<PlannedDuel | undefined>(undefined)
  const initialDuelConsumed = useRef(false)
  // La portada deja el primer duelo una sola vez
  const handoffTaken = useRef(false)
  if (!handoffTaken.current) {
    handoffTaken.current = true
    initialDuel.current = takeDuelHandoff()
  }

  const { shelf: rawShelf } = useLocalSearchParams<{ shelf: string }>()
  const shelf = (ACTIVE_SHELVES.includes(rawShelf as ShelfType) ? rawShelf : (ACTIVE_SHELVES[0] ?? 'movie')) as ShelfType

  const entries = useStore((s) => s.entries)
  const ranking = useStore((s) => s.rankings[shelf] ?? [])
  const duels = useStore((s) => s.duels[shelf] ?? {})
  const settings = useStore((s) => s.settings)
  const loadSample = useStore((s) => s.loadSample)

  const [count, setCount] = useState(0)
  const [summary, setSummary] = useState(false)
  const [currentDuel, setCurrentDuel] = useState<PlannedDuel | null>(null)
  const [emptyState, setEmptyState] = useState<'none' | 'complete' | 'need-more'>('none')

  // Asignación persistente de lado (T30.3): si una obra se repite, siempre en el mismo lado
  const [sides, setSides] = useState<Record<string, 'L' | 'R'>>({})
  const seenCountRef = useRef<Record<string, number>>({})
  const recentRef = useRef<string[]>([])
  // obras comparadas en esta sesión: el resumen enseña también las que se han quedado en su sitio
  const comparedRef = useRef<Set<string>>(new Set())

  const startRank = useRef<string[]>(ranking ?? [])
  const startPositions = useRef<Map<string, number>>(new Map())
  const startOrdenado = useRef<number>(0)
  const [commentFor, setCommentFor] = useState<string | null>(null)
  const [undo, setUndo] = useState<Snapshot | null>(null)
  // Aviso discreto del último duelo
  const [flash, setFlash] = useState<{ up: string; down: string; n: number } | null>(null)
  // Aviso de hito cada 25 duelos (DUEL_MILESTONE) que no bloquea la interacción
  const [milestoneNotice, setMilestoneNotice] = useState<string | null>(null)

  const lastPair = useRef<{ left: Item; right: Item; leftIsSubject: boolean } | null>(null)
  const lastPairKey = useRef(0)

  const resetSession = () => {
    setCount(0)
    setSummary(false)
    setUndo(null)
    setCurrentDuel(null)
    setEmptyState('none')
    setSides({})
    seenCountRef.current = {}
    recentRef.current = []
    comparedRef.current = new Set()
    initialDuelConsumed.current = false
    const st = useStore.getState()
    const initialRk = st.rankings[shelf] ?? []
    startRank.current = initialRk
    startPositions.current = new Map(initialRk.map((id, i) => [id, i + 1]))
    startOrdenado.current = calcShelfOrdenado(st.entries, st.rankings, st.duels[shelf] ?? {}, shelf)
    st.touchLastCompared(shelf)
  }

  // Registrar visita y recencia al abrir la estantería, y partir de cero
  useEffect(() => {
    resetSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelf])

  // Desvanecer aviso de hito a los 3,5 segundos
  useEffect(() => {
    if (!milestoneNotice) return
    const t = setTimeout(() => setMilestoneNotice(null), 3500)
    return () => clearTimeout(t)
  }, [milestoneNotice])

  // Planificar el siguiente duelo de la sesión (sin límite arbitrario)
  useEffect(() => {
    if (summary) return

    // Si viene con un duelo inicial de la portada
    if (count === 0 && !initialDuelConsumed.current && initialDuel.current) {
      initialDuelConsumed.current = true
      setCurrentDuel(initialDuel.current)
      setEmptyState('none')
      return
    }

    const st = useStore.getState()
    const rk = st.rankings[shelf] ?? []
    const shDuels = st.duels[shelf] ?? {}
    const unranked = Object.values(st.entries)
      .filter((e) => e.status === 'seen' && (!rk.includes(e.itemId) || Boolean(e.provisional)) && (e.shelf ?? getItem(e.itemId)?.type) === shelf)
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .map((e) => ({ itemId: e.itemId, stars: e.stars }))

    const counts: Record<string, number> = {}
    for (const e of Object.values(st.entries)) if (e.cmp) counts[e.itemId] = e.cmp

    const next = planNextDuel({
      shelf,
      ranking: rk,
      unranked,
      duels: shDuels,
      cmp: counts,
      sessionIndex: count,
      starsOf: starsOfEntries(st.entries),
      recent: recentRef.current,
      anchor: startRank.current,
      ratings: st.ratings?.[shelf] ?? {},
    })

    if (next) {
      setCurrentDuel(next)
      setEmptyState('none')
    } else {
      setCurrentDuel(null)
      const totalSeen = Object.values(st.entries).filter((e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === shelf).length
      setEmptyState(totalSeen < 2 ? 'need-more' : 'complete')
    }
  }, [summary, count, shelf, entries, ranking, duels])

  // Obtener los dos items a comparar respetando siempre su lado asignado (T30.3)
  const assigned = useMemo(() => {
    if (!currentDuel) return null
    const itA = getItem(currentDuel.a)
    const itB = getItem(currentDuel.b)
    if (!itA || !itB) return null
    const assign = assignSides(currentDuel.a, currentDuel.b, currentDuel.subject, sides, seenCountRef.current)
    return {
      left: assign.left === itA.id ? itA : itB,
      right: assign.right === itA.id ? itA : itB,
      leftIsSubject: assign.leftIsSubject,
      nextSides: assign.nextSides,
    }
  }, [currentDuel, sides])
  const pair = assigned

  useEffect(() => {
    if (assigned && !sameSides(assigned.nextSides, sides)) setSides(assigned.nextSides)
  }, [assigned, sides])

  if (pair) {
    lastPair.current = pair
    lastPairKey.current = count
  }
  const shownPair = pair ?? (emptyState === 'none' && !summary ? lastPair.current : null)
  // Los lados (con su <Poster> dentro) se crean una vez por par: si no, cada setState de la sesion repinta las dos portadas
  const leftId = shownPair?.left.id
  const rightId = shownPair?.right.id
  const leftSide = useMemo(() => (leftId ? sideOf(getItem(leftId) as Item) : null), [leftId])
  const rightSide = useMemo(() => (rightId ? sideOf(getItem(rightId) as Item) : null), [rightId])
  const finish = useCallback(() => setSummary(true), [])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 1400)
    return () => clearTimeout(t)
  }, [flash])

  // D22: vibración de éxito al terminar la sesión
  useEffect(() => {
    if (summary) haptic('success')
  }, [summary])

  const onChoose = (w: 'a' | 'b') => {
    if (!currentDuel || !pair) return
    const st = useStore.getState()
    const winnerId = w === 'a' ? pair.left.id : pair.right.id
    const loserId = w === 'a' ? pair.right.id : pair.left.id

    // Guardar snapshot de deshacer (T30.2 regla 9)
    setUndo({
      entries: st.entries,
      ranking: st.rankings[shelf] ?? [],
      current: currentDuel,
      count,
      sides,
      recent: [...recentRef.current],
      compared: new Set(comparedRef.current),
      duelKey: { a: pair.left.id, b: pair.right.id },
    })

    // Registrar duelo
    st.recordDuel(shelf, pair.left.id, pair.right.id, winnerId)
    st.bumpCompared([pair.left.id, pair.right.id])

    // Actualizar recencia y conteos de aparición de obras
    seenCountRef.current[pair.left.id] = (seenCountRef.current[pair.left.id] || 0) + 1
    seenCountRef.current[pair.right.id] = (seenCountRef.current[pair.right.id] || 0) + 1
    recentRef.current.push(pair.left.id, pair.right.id)
    comparedRef.current.add(pair.left.id).add(pair.right.id)

    // Actualizar puntos Elo y ranking en tiempo real
    const updatedState = useStore.getState()
    const shelfDuels = updatedState.duels[shelf] ?? {}
    const shelfRatings = updatedState.ratings?.[shelf] ?? {}
    const unrankedItems = Object.values(updatedState.entries)
      .filter((e) => e.status === 'seen' && (e.shelf ?? getItem(e.itemId)?.type) === shelf && (!ranking.includes(e.itemId) || Boolean(e.provisional)))
      .map((e) => ({ itemId: e.itemId, stars: e.stars }))

    const res = applyDuelToRanking({
      ranking,
      anchor: startRank.current,
      unranked: unrankedItems,
      duels: shelfDuels,
      lastDuel: { a: pair.left.id, b: pair.right.id, winner: winnerId },
      ratings: shelfRatings,
      entries: updatedState.entries,
      starsOf: starsOfEntries(updatedState.entries),
    })

    setFlash({ up: winnerId, down: loserId, n: count })

    for (const id of res.placed) st.markPlaced(id)

    // Aplicar el nuevo ordenamiento general y persistir Elo
    st.applyRanking(shelf, res.ranking, res.placed[0], res.ratings)
    setCurrentDuel(null)

    const nextCount = count + 1
    setCount(nextCount)

    // Cada 25 duelos, aviso discreto que no bloquea la sesión (T30.1)
    if (nextCount > 0 && nextCount % DUEL_MILESTONE === 0) setMilestoneNotice(`Llevas ${nextCount}. Sigue o pulsa Ver resumen`)

    if (settings.commentBoxInPairs) setCommentFor(winnerId)
  }

  const doUndo = () => {
    if (!undo) return
    const st = useStore.getState()
    if (undo.duelKey) st.deleteDuel(shelf, undo.duelKey.a, undo.duelKey.b)
    useStore.setState((s) => ({
      entries: undo.entries,
      rankings: { ...s.rankings, [shelf]: undo.ranking },
    }))
    setSides(undo.sides)
    recentRef.current = undo.recent
    comparedRef.current = undo.compared
    setCurrentDuel(undo.current)
    setCount(undo.count)
    setSummary(false)
    setUndo(null)
    setFlash(null)
    setMilestoneNotice(null)
  }

  // Resumen al terminar
  const nowOrdenado = useMemo(() => {
    if (!summary) return 0
    return calcShelfOrdenado(entries, useStore.getState().rankings, duels, shelf)
  }, [summary, entries, duels, shelf])

  const moves = useMemo(() => {
    if (!summary) return null
    const now = useStore.getState().rankings[shelf] ?? []
    const startMap = startPositions.current
    const ratings = useStore.getState().ratings?.[shelf] ?? {}

    const up: { id: string; oldPos: number; newPos: number; delta: number; rating: number }[] = []
    const down: { id: string; oldPos: number; newPos: number; delta: number; rating: number }[] = []
    const added: { id: string; pos: number; rating: number }[] = []
    const kept: { id: string; pos: number }[] = []

    now.forEach((id, i) => {
      const newPos = i + 1
      const oldPos = startMap.get(id)
      const r = ratings[id] ?? 1400
      if (oldPos === undefined) added.push({ id, pos: newPos, rating: r })
      else if (newPos < oldPos) up.push({ id, oldPos, newPos, delta: oldPos - newPos, rating: r })
      else if (newPos > oldPos) down.push({ id, oldPos, newPos, delta: newPos - oldPos, rating: r })
      else if (comparedRef.current.has(id)) kept.push({ id, pos: newPos }) // el duelo confirma su puesto
    })

    up.sort((a, b) => b.delta - a.delta)
    down.sort((a, b) => b.delta - a.delta)
    added.sort((a, b) => a.pos - b.pos)
    kept.sort((a, b) => a.pos - b.pos)
    return { up, down, added, kept }
  }, [summary, shelf])

  const handleBack = () => {
    if (count > 0 && !summary) setSummary(true)
    else toHome()
  }

  const plural = SHELF_LABEL[shelf].plural
  const goRanking = () => router.push({ pathname: '/estanteria/[type]', params: { type: shelf } })
  const goDiscover = () => router.push({ pathname: '/descubrir', params: { shelf } })

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenTitle
        label={`DUELOS · ${plural.toUpperCase()}`}
        title={summary ? 'Sesión completada' : currentDuel ? '¿Cuál te gustó más?' : 'Tu ranking'}
        subtitle={
          summary
            ? startOrdenado.current !== nowOrdenado
              ? `${plural}: del ${startOrdenado.current} % al ${nowOrdenado} %`
              : `${plural}: ${nowOrdenado} % ordenado`
            : currentDuel || shownPair
              ? count > 0
                ? `${count} ${count === 1 ? 'duelo' : 'duelos'} en esta sesión`
                : '\u00A0' // reserva la línea para que el abanico no cambie de alto al primer duelo
              : undefined
        }
        onBack={handleBack}
        topExtra={28}
        action={
          !summary && count > 0 ? (
            <Press
              onPress={finish}
              accessibilityRole="button"
              accessibilityLabel="Ver resumen de la sesión"
              scaleTo={0.95}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.mute }}
            >
              <AppText style={[tx('meta'), { fontFamily: 'Archivo-Regular', color: colors.ink }]}>Ver resumen</AppText>
            </Press>
          ) : undefined
        }
      />

      {/* Aviso flotante discreto del hito cada 25 duelos (T30.1) */}
      {milestoneNotice && !summary && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 64,
            alignSelf: 'center',
            zIndex: 40,
            elevation: 10,
            backgroundColor: 'rgba(30,27,24,0.95)',
            borderWidth: 1,
            borderColor: colors.line,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 999,
          }}
        >
          <AppText style={[tx('meta'), { color: colors.ink }]}>{milestoneNotice}</AppText>
        </Animated.View>
      )}

      <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 20, paddingBottom: 24 }}>
        {summary && moves ? (
          <Animated.View entering={FadeIn.duration(260)} style={{ flex: 1, minHeight: 0 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16 }}>
              <MoveList title={byGender(shelf, 'Nuevas en tu ranking', 'Nuevos en tu ranking')} type="added" rows={moves.added} />
              <MoveList title="Han subido" type="up" rows={moves.up} />
              <MoveList title="Han bajado" type="down" rows={moves.down} />
              <MoveList title="Confirmadas en su puesto" type="kept" rows={moves.kept} />
              {!moves.up.length && !moves.down.length && !moves.added.length && !moves.kept.length && (
                <AppText style={[tx('body'), { color: colors.mute, paddingVertical: 16 }]}>Tu ranking se ha confirmado: no ha cambiado nada.</AppText>
              )}
            </ScrollView>
            <View style={{ gap: 8, marginTop: 16, paddingTop: 8 }}>
              <Button variant="primary" onPress={resetSession} style={{ alignSelf: 'stretch' }}>
                {`Seguir con ${plural}`}
              </Button>
              <Button variant="secondary" onPress={goRanking} style={{ alignSelf: 'stretch' }}>
                {`Ver tu ranking de ${plural.toLowerCase()}`}
              </Button>
              <Button variant="text" onPress={toHome} style={{ alignSelf: 'stretch' }}>
                Elegir otra estantería
              </Button>
            </View>
          </Animated.View>
        ) : shownPair ? (
          <View style={{ flex: 1, minHeight: 0 }}>
            {leftSide && rightSide && (
              <SwipePair
                key={lastPairKey.current}
                left={leftSide}
                right={rightSide}
                onChoose={onChoose}
                kind="rank"
                bottomLeft={<ActionBtn size={48} color={colors.accentInk} icon="rotateCcw" iconSize={20} stroke={2.4} filled disabled={!undo} onPress={doUndo} label="Deshacer el último duelo" />}
              />
            )}
            <View pointerEvents="none" accessibilityLiveRegion="polite" style={{ position: 'absolute', left: 0, right: 0, top: '42%', zIndex: 30, alignItems: 'center', paddingHorizontal: 24 }}>
              {flash && (
                <Animated.View
                  key={flash.n}
                  entering={FadeIn.duration(140)}
                  exiting={FadeOut.duration(140)}
                  style={{ gap: 4, borderRadius: 12, backgroundColor: 'rgba(30,27,23,0.8)', paddingHorizontal: 12, paddingVertical: 8, maxWidth: '100%' }}
                >
                  <FlashName id={flash.up} up />
                  <FlashName id={flash.down} />
                </Animated.View>
              )}
            </View>
          </View>
        ) : emptyState === 'complete' ? (
          <View style={styles.empty}>
            <AppText style={[tx('title'), { color: colors.ink, textAlign: 'center' }]}>{`Has comparado ${byGender(shelf, 'todas', 'todos')} tus ${plural.toLowerCase()} entre sí`}</AppText>
            <AppText style={[tx('body'), { color: colors.mute, textAlign: 'center', maxWidth: 384 }]}>Cuando marques más, seguimos ordenando.</AppText>
            <View style={{ marginTop: 16, gap: 10, width: '100%', maxWidth: 320 }}>
              <Button variant="primary" onPress={goRanking}>
                Ver tu ranking
              </Button>
              <Button variant="secondary" onPress={goDiscover}>
                {`Ir a Descubrir ${plural.toLowerCase()}`}
              </Button>
              <Button variant="text" onPress={toHome}>
                Elegir otra estantería
              </Button>
            </View>
          </View>
        ) : emptyState === 'need-more' ? (
          <View style={styles.empty}>
            <AppText style={[tx('title'), { color: colors.ink, textAlign: 'center' }]}>{`Nada que comparar en ${plural.toLowerCase()}`}</AppText>
            <AppText style={[tx('body'), { color: colors.mute, textAlign: 'center', maxWidth: 384 }]}>
              {`Necesitas al menos dos ${SHELF_LABEL[shelf].seen} para ordenarlas. Haz swipe en Descubrir o carga unos datos de ejemplo.`}
            </AppText>
            <View style={{ marginTop: 12, gap: 8, width: '100%', maxWidth: 320 }}>
              <Button variant="primary" onPress={goDiscover}>
                {`Descubrir ${plural.toLowerCase()}`}
              </Button>
              <Button variant="secondary" onPress={loadSample}>
                Importar datos de ejemplo
              </Button>
              <Button variant="text" onPress={toHome}>
                Elegir otra estantería
              </Button>
            </View>
          </View>
        ) : null}
      </View>

      {commentFor && <CommentSheet key={commentFor + count} itemId={commentFor} onClose={() => setCommentFor(null)} />}
    </View>
  )
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 20 },
})

function FlashName({ id, up = false }: { id: string; up?: boolean }) {
  const it = getItem(id)
  if (!it) return null
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 }} accessibilityLabel={`${titleOf(it)} ${up ? 'sube' : 'baja'}`}>
      <AppText importantForAccessibility="no" style={{ fontSize: 13, color: up ? '#3ec878' : '#ef4b4b' }}>
        {up ? '▲' : '▼'}
      </AppText>
      <AppText numberOfLines={1} style={{ fontFamily: 'Archivo-Regular', fontSize: 13, maxWidth: 224, color: colors.ink }}>
        {titleOf(it)}
      </AppText>
    </View>
  )
}

function MoveList({
  title,
  type,
  rows,
}: {
  title: string
  type: 'up' | 'down' | 'added' | 'kept'
  rows: { id: string; oldPos?: number; newPos?: number; pos?: number; delta?: number }[]
}) {
  if (!rows.length) return null
  const color = type === 'up' ? '#3ec878' : type === 'down' ? '#ef4b4b' : type === 'kept' ? colors.mute : colors.accent

  return (
    <Group title={title}>
      {rows.map((r) => {
        const it = getItem(r.id)
        if (!it) return null

        let subtitle = ''
        let badge = ''
        if (type === 'added') {
          subtitle = `Entra en el puesto #${r.pos}`
          badge = `★ #${r.pos}`
        } else if (type === 'kept') {
          subtitle = `Sigue en el puesto #${r.pos}`
          badge = `= #${r.pos}`
        } else if (type === 'up') {
          subtitle = `Puesto #${r.oldPos} ➔ #${r.newPos}`
          badge = `▲ +${r.delta}`
        } else {
          subtitle = `Puesto #${r.oldPos} ➔ #${r.newPos}`
          badge = `▼ -${r.delta}`
        }

        return (
          <View key={r.id} style={{ minHeight: 56, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[{ width: 32, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }, it.type === 'boardgame' ? { aspectRatio: posterAspect(it) } : { height: 48 }]}>
              <Poster item={it} showTitle={false} noBlur style={StyleSheet.absoluteFill} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText numberOfLines={1} style={[tx('item'), { color: colors.ink }]}>
                {titleOf(it)}
              </AppText>
              <AppText style={tx('meta')}>{subtitle}</AppText>
            </View>
            <View style={{ flexShrink: 0, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
              <AppText style={{ fontFamily: 'Archivo-SemiBold', fontSize: 12, lineHeight: 16, color, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{badge}</AppText>
            </View>
          </View>
        )
      })}
    </Group>
  )
}
