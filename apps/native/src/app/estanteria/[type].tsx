import { useEffect, useMemo, useState } from 'react'
import { SectionList, View, type SectionListRenderItemInfo } from 'react-native'
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ACTIVE_SHELVES, computeCompareOverview, getItem, SHELF_LABEL, type ShelfType } from '@biblioteca/core'
import { useStore } from '../../store'
import { loadShelves } from '../../data/loadData'
import { alpha, colors, shelfColors, tx } from '../../theme'
import { AppText } from '../../components/AppText'
import { Icon } from '../../components/Icon'
import { Press } from '../../components/Press'
import { ItemRow } from '../../components/ItemRow'
import { Button, Toast } from '../../components/ui'
import { AddFlow } from '../../components/flows/AddFlow'
import { CleanupFlow } from '../../components/flows/CleanupFlow'
import { CardRow, Empty, FilmStrip, HeroBackdrop } from '../../components/library/LibraryParts'
import { SHELF_ICON, pctColor, useCatalogTick } from '../../components/library/shelfMeta'

type Seg = 'ord' | 'pend'
const NO_IDS: string[] = []
interface Row {
  k: string
  id: string
  rank?: number
  note?: string
}
interface Section {
  key: 'rk' | 'un' | 'pend'
  title?: string
  data: Row[]
}

/** Estantería (Shelf.tsx). Sin listas (D5): no hay selección ni botón «Compartir». */
export default function Estanteria() {
  const { type } = useLocalSearchParams<{ type: string }>()
  if (!type || !(ACTIVE_SHELVES as readonly string[]).includes(type)) return <Redirect href="/" />
  return <ShelfScreen t={type as ShelfType} />
}

function ShelfScreen({ t }: { t: ShelfType }) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { seg: segParam } = useLocalSearchParams<{ seg?: string }>()
  useCatalogTick()

  const entries = useStore((s) => s.entries)
  const rankings = useStore((s) => s.rankings)
  const ranking = rankings[t] ?? NO_IDS
  const duels = useStore((s) => s.duels)
  const lastCompared = useStore((s) => s.lastCompared)
  const [seg, setSeg] = useState<Seg>(segParam === 'pend' ? 'pend' : 'ord')
  const [adding, setAdding] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    void loadShelves(t)
  }, [t])

  const label = SHELF_LABEL[t]
  const color = shelfColors[t]
  const all = useMemo(() => Object.values(entries).filter((e) => getItem(e.itemId)?.type === t), [entries, t])
  const overview = useMemo(() => computeCompareOverview(entries, rankings, duels, lastCompared), [entries, rankings, duels, lastCompared])
  const ordenadoPct = overview.shelves[t]?.ordenado ?? 0

  // Fuente de verdad: el array de ranking (T19 §3)
  const seenEntries = all.filter((e) => e.status === 'seen')
  const unrankedIds = seenEntries.filter((e) => !ranking.includes(e.itemId) || Boolean(e.provisional)).map((e) => e.itemId)
  const totalSeen = seenEntries.length
  const pend = all.filter((e) => e.status === 'pending')
  const stripIds = [...ranking, ...unrankedIds, ...pend.map((e) => e.itemId)].slice(0, 12)

  const sections: Section[] = useMemo(() => {
    if (seg === 'pend') {
      return [{ key: 'pend', data: pend.map((e) => ({ k: `pend:${e.itemId}`, id: e.itemId, note: e.origin ? `De ${e.origin}` : undefined })) }]
    }
    const out: Section[] = []
    const rankedRows = ranking.filter((id) => getItem(id)).map((id, i) => ({ k: `rk:${id}`, id, rank: i + 1 }))
    if (rankedRows.length) out.push({ key: 'rk', data: rankedRows })
    if (unrankedIds.length) out.push({ key: 'un', title: `NUEVAS · ${unrankedIds.length}`, data: unrankedIds.map((id) => ({ k: `un:${id}`, id })) })
    return out
  }, [seg, pend, ranking, unrankedIds])

  const plural = label.plural.toLowerCase()
  const pendButtonLabel = t === 'book' ? '¿Qué leo?' : t === 'boardgame' ? '¿A qué jugamos?' : t === 'artist' ? '¿Qué escucho?' : '¿Qué vemos?'
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'))
  const toDiscover = () => router.navigate({ pathname: '/descubrir', params: { shelf: t } })

  const renderRow = ({ item, index, section }: SectionListRenderItemInfo<Row, Section>) => {
    const first = index === 0
    const last = index === section.data.length - 1
    const it = getItem(item.id)
    if (!it) return null
    const row =
      section.key === 'rk' ? (
        <ItemRow item={it} rank={item.rank} highlight={item.rank === 1} />
      ) : section.key === 'un' ? (
        <ItemRow item={it} indent tail="nueva" />
      ) : (
        <ItemRow item={it} note={item.note} />
      )
    return (
      <CardRow first={first} last={last}>
        {row}
      </CardRow>
    )
  }

  const header = (
    <View>
      {/* Cabecera a sangre (carrete): sin tarjeta, con el color de la estantería */}
      <View style={{ overflow: 'hidden', position: 'relative' }}>
        <HeroBackdrop shelf={t} />
        <FilmStrip ids={stripIds} shelf={t} />
        <View style={{ paddingHorizontal: 20, paddingTop: Math.max(insets.top, 18), paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Press
              onPress={back}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              style={{ width: 40, height: 40, marginLeft: -4, borderRadius: 20, backgroundColor: alpha(colors.bg, 0.6), borderWidth: 1, borderColor: alpha(colors.line, 0.6), alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="back" size={20} color={colors.ink} />
            </Press>
            <Press
              onPress={() => setAdding(true)}
              accessibilityRole="button"
              accessibilityLabel={`Añadir a ${label.plural}`}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="plus" size={18} strokeWidth={2.5} color={colors.accentInk} />
            </Press>
          </View>
          <View style={{ marginTop: 96 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name={SHELF_ICON[t]} size={14} strokeWidth={2.2} color={color} />
              <AppText style={[tx('label'), { color }]}>ESTANTERÍA</AppText>
            </View>
            <AppText numberOfLines={1} style={[tx('display'), { color: colors.ink, marginTop: 4 }]}>{label.plural}</AppText>
            <AppText style={[tx('meta'), { color: alpha(colors.ink, 0.75), marginTop: 4 }]}>
              {seg === 'ord' ? (
                <>
                  {totalSeen} obras · <AppText style={{ fontFamily: 'Inter-600', color: pctColor(ordenadoPct) }}>{ordenadoPct} % ordenado</AppText>
                </>
              ) : (
                `${pend.length} pendientes`
              )}
            </AppText>
          </View>
        </View>
      </View>

      {/* Pestañas de texto con subrayado */}
      <View style={{ flexDirection: 'row', gap: 24, marginHorizontal: 20, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.line }} accessibilityRole="tablist">
        {(['ord', 'pend'] as const).map((k) => (
          <Press key={k} onPress={() => setSeg(k)} accessibilityRole="tab" accessibilityState={{ selected: seg === k }} style={{ paddingBottom: 10 }}>
            <AppText style={{ fontFamily: 'Inter-600', fontSize: 15, color: seg === k ? colors.ink : colors.mute }}>
              {k === 'ord' ? `Mis ${plural}` : 'Pendientes'}{' '}
              <AppText style={{ fontFamily: 'Inter-400', color: colors.mute, fontVariant: ['tabular-nums'] }}>{k === 'ord' ? totalSeen : pend.length}</AppText>
            </AppText>
            {seg === k && <View style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, borderRadius: 2, backgroundColor: colors.accent }} />}
          </Press>
        ))}
      </View>

      {seg === 'pend' && pend.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 20, marginBottom: 12 }}>
          {pend.length >= 3 && (
            <View style={{ flex: 1 }}>
              <Button variant="secondary" icon={<Icon name="sparkle" size={16} color={colors.ink} />} onPress={() => setCleaning(true)}>
                {`Limpieza (${pend.length})`}
              </Button>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Button variant="primary" onPress={() => router.navigate({ pathname: '/decidir', params: { t } })}>
              {pendButtonLabel}
            </Button>
          </View>
        </View>
      )}
    </View>
  )

  const empty =
    seg === 'ord' ? (
      <Empty text="Todavía no hay nada aquí.">
        <View style={{ width: '100%', maxWidth: 320, gap: 10 }}>
          <Button variant="primary" onPress={toDiscover}>Ir a Descubrir</Button>
          {/* «Importar tus obras» no se muestra: la pantalla Importar aún no existe (phase.ts). */}
        </View>
      </Empty>
    ) : (
      <Empty text="No tienes pendientes. Desliza hacia arriba en Descubrir para guardar.">
        <View style={{ width: '100%', maxWidth: 320, gap: 10 }}>
          <Button variant="primary" onPress={toDiscover}>{`Ir a Descubrir ${plural}`}</Button>
        </View>
      </Empty>
    )

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SectionList<Row, Section>
        sections={sections}
        keyExtractor={(item) => item.k}
        renderItem={renderRow}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <AppText style={[tx('label'), { color: colors.mute, marginHorizontal: 20, marginTop: 24, marginBottom: 10 }]}>{section.title}</AppText>
          ) : null
        }
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 112 }}
        initialNumToRender={12}
      />

      {/* Botón flotante para ordenar con duelos: siempre a mano aunque la lista tenga 200 obras */}
      {seg === 'ord' && totalSeen >= 2 && (
        <Press
          onPress={() => router.push({ pathname: '/comparar/[shelf]', params: { shelf: t } })}
          accessibilityRole="button"
          style={{ position: 'absolute', right: 20, bottom: Math.max(insets.bottom, 20), flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingLeft: 16, paddingRight: 20, borderRadius: 26, backgroundColor: colors.accent, elevation: 8 }}
        >
          <Icon name="scale" size={18} strokeWidth={2.2} color={colors.accentInk} />
          <AppText style={{ fontFamily: 'Inter-600', fontSize: 15, color: colors.accentInk }}>Ordenar</AppText>
          {unrankedIds.length > 0 && (
            <View style={{ minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: colors.accentInk, alignItems: 'center', justifyContent: 'center' }}>
              <AppText style={{ fontFamily: 'Inter-700', fontSize: 12, color: colors.accent, fontVariant: ['tabular-nums'] }}>{unrankedIds.length}</AppText>
            </View>
          )}
        </Press>
      )}

      {adding && (
        <AddFlow
          shelf={t}
          onClose={(m?: string) => {
            setAdding(false)
            if (m) setToast(m)
          }}
        />
      )}
      {cleaning && <CleanupFlow shelf={t} onClose={() => setCleaning(false)} />}
      {toast && <Toast key={toast} message={toast} onDone={() => setToast(null)} />}
    </View>
  )
}
