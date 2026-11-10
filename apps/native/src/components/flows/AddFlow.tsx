import { useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Modal, TextInput, View } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ACTIVE_SHELVES, SHELF_LABEL, friends, itemsOfType, nextCards, type Item, type ShelfType } from '@biblioteca/core'
import { cleanDisplayTitle, isDjOrGarbageVersion, slugify } from '@biblioteca/core/src/lib/cleanTitle'
import { searchTitles } from '@biblioteca/core/src/lib/locale'
import { AppText } from '../AppText'
import { Icon } from '../Icon'
import { Poster } from '../Poster'
import { Press } from '../Press'
import { posterAspect, titleOf } from '../../lib/item'
import { useCatalog, useStore } from '../../store'
import { alpha, colors, tx } from '../../theme'
import { PlaceFlow } from '../duel/PlaceFlow'
import { RatingFlow } from './RatingFlow'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const STATUS_TXT = {
  seen: 'Ya está en tu biblioteca',
  pending: 'Está en tus pendientes',
  dismissed: 'La marcaste como «no me interesa»',
}

interface RemoteSearchResult {
  ref: { source: 'wikidata' | 'openlibrary' | 'musicbrainz' | 'tvmaze'; id: string }
  title: string
  year: number | null
  creator: string | null
  posterUrl: string | null
  catalogId: string | null
}

const seenLabel = (t: ShelfType) => (t === 'book' ? 'Lo he leído' : t === 'artist' ? 'Lo he escuchado' : t === 'boardgame' ? 'Lo he jugado' : 'La he visto')

/**
 * Añadir a mano (§12.1): buscador del catálogo de una estantería. Sin `shelf`, primero se elige la estantería.
 * Pantalla completa sobre todo, barra inferior incluida (el `absolute inset-0 z-40` de la PWA): un Modal que no se desmonta
 * al pasar a la valoración o a la colocación, para no encadenar cierres y aperturas de Modal.
 */
export function AddFlow({ shelf: initial, onClose }: { shelf?: ShelfType; onClose: (msg?: string) => void }) {
  const insets = useSafeAreaInsets()
  const entries = useStore((s) => s.entries)
  const setStatus = useStore((s) => s.setStatus)
  const [shelf, setShelf] = useState<ShelfType | undefined>(initial)
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [rating, setRating] = useState<string | null>(null)
  const [placing, setPlacing] = useState<string | null>(null)

  const [remoteResults, setRemoteResults] = useState<RemoteSearchResult[]>([])
  const [searchingRemote, setSearchingRemote] = useState(false)
  const [resolvingRef, setResolvingRef] = useState<string | null>(null)
  const lastMbTimeRef = useRef(0)

  const catalogVersion = useCatalog((s) => s.version)

  const results = useMemo(() => {
    if (!shelf) return []
    const n = norm(q.trim())
    const allItems = itemsOfType(shelf)
    // Sin texto (§14.5, §7.9): sugerencias ordenadas con nextCards sin cupo explore ni aprendizaje
    if (!n) {
      const st = useStore.getState()
      const cards = nextCards(
        { shelf, items: allItems, entries: st.entries, rankings: st.rankings, profile: st.profile, friends, affinity: () => null, friendPct: () => null },
        [],
        40,
      )
      return cards.map((c) => c.item)
    }
    return allItems
      .filter((i) => i.type === shelf && (searchTitles(i).some((t) => norm(t).includes(n)) || norm(i.creator).includes(n)))
      .sort((a, b) => (norm(a.title).startsWith(n) ? 0 : 1) - (norm(b.title).startsWith(n) ? 0 : 1) || b.popularity - a.popularity)
      .slice(0, 40)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelf, q, catalogVersion])

  // Búsqueda en vivo. Canciones: MusicBrainz con debounce de 400 ms si hay menos de 5 resultados locales (T28.8.3).
  // El resto de estanterías usaba la función `biblio-catalog` de Supabase: sin cuenta (D7) no hay resultados remotos.
  useEffect(() => {
    const trimmed = q.trim()
    if (shelf !== 'song' || trimmed.length < 2 || results.length >= 5) {
      setRemoteResults([])
      setSearchingRemote(false)
      return
    }
    const controller = new AbortController()
    setSearchingRemote(true)

    const timer = setTimeout(async () => {
      try {
        const now = Date.now()
        const waitMs = Math.max(0, 1000 - (now - lastMbTimeRef.current))
        if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs))
        lastMbTimeRef.current = Date.now()

        const clean = trimmed.replace(/["«»]/g, '')
        const qString = trimmed.includes(' ')
          ? `recording:"${clean}" OR (${trimmed.split(/\s+/).map((w) => `(recording:"${w}" OR artist:"${w}")`).join(' AND ')})`
          : `recording:"${clean}" OR "${clean}"`

        const res = await fetch(`https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(qString)}&limit=15&fmt=json`, { signal: controller.signal })
        if (!res.ok) throw new Error(`MB status ${res.status}`)
        const data = await res.json()
        if (controller.signal.aborted) return

        const rawRecs: any[] = data.recordings || []
        const localTitles = new Set(results.flatMap((r) => [norm(r.title), norm(r.originalTitle ?? '')]))
        const localMbids = new Set(results.map((r) => r.mbid).filter(Boolean))
        const liveCatalog = useCatalog.getState().items
        const candidates: RemoteSearchResult[] = []
        const seenKeys = new Set<string>()

        for (const r of rawRecs) {
          if (isDjOrGarbageVersion(r.title)) continue
          const cleanT = cleanDisplayTitle(r.title)
          if (!cleanT) continue
          const rawArt = r['artist-credit']?.[0]?.name || ''
          const cleanArt = rawArt.replace(/\s+(?:feat\.|ft\.|con|with|junto a)\s+.*$/i, '').trim() || 'Desconocido'
          const key = `${norm(cleanT)}|${norm(cleanArt)}`
          if (seenKeys.has(key)) continue
          seenKeys.add(key)
          if (localTitles.has(norm(cleanT)) || localMbids.has(r.id)) continue

          let minYear: number | null = null
          const consider = (d?: string) => {
            if (!d) return
            const y = parseInt(d.slice(0, 4), 10)
            if (y >= 1900 && y <= 2026 && (!minYear || y < minYear)) minYear = y
          }
          consider(r['first-release-date'])
          for (const rel of r.releases || []) {
            consider(rel.date)
            consider(rel['release-group']?.['first-release-date'])
          }

          const titleSlug = slugify(cleanT).slice(0, 60).replace(/-+$/, '') || 'cancion'
          const artistSlug = slugify(cleanArt).slice(0, 30).replace(/-+$/, '') || 'artista'
          const canonicalId = minYear ? `song:${titleSlug}-${artistSlug}-${minYear}` : `song:${titleSlug}-${artistSlug}`
          if (liveCatalog[canonicalId]) continue

          const caaRelease = r.releases?.find((rel: any) => rel.status === 'Official') || r.releases?.[0]
          candidates.push({
            ref: { source: 'musicbrainz', id: r.id },
            title: cleanT,
            year: minYear,
            creator: cleanArt,
            posterUrl: caaRelease?.id ? `https://coverartarchive.org/release/${caaRelease.id}/front-250` : null,
            catalogId: canonicalId,
          })
        }
        setRemoteResults(candidates)
        setSearchingRemote(false)
      } catch {
        // Sin conexión o si MusicBrainz falla, solo los resultados locales y sin errores en pantalla (T28.8.3 §5)
        if (!controller.signal.aborted) {
          setRemoteResults([])
          setSearchingRemote(false)
        }
      }
    }, 400)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [shelf, q, results])

  // Canciones de MusicBrainz: se añaden directamente al catálogo vivo (T28.8.3 §4)
  const handleSelectRemote = (hit: RemoteSearchResult) => {
    if (shelf !== 'song' || hit.ref.source !== 'musicbrainz' || resolvingRef) return
    setResolvingRef(hit.ref.id)
    try {
      const titleSlug = slugify(hit.title).slice(0, 60).replace(/-+$/, '') || 'cancion'
      const artistSlug = slugify(hit.creator || 'artista').slice(0, 30).replace(/-+$/, '') || 'artista'
      const songId = hit.catalogId || (hit.year ? `song:${titleSlug}-${artistSlug}-${hit.year}` : `song:${titleSlug}-${artistSlug}`)
      const item: Item = {
        id: songId,
        type: 'song',
        title: hit.title,
        creator: hit.creator || 'Desconocido',
        year: hit.year || 2000,
        mbid: hit.ref.id,
        synopsis: '',
        popularity: 50,
        posterUrl: hit.posterUrl || null,
        genres: [],
        src: { recording: 'musicbrainz', popularity: 'musicbrainz', ...(hit.posterUrl ? { posterUrl: 'coverartarchive' } : {}) },
      }
      useCatalog.getState().addItems([item])
      setOpen(item.id)
      setRemoteResults((prev) => prev.filter((r) => r.ref.id !== hit.ref.id))
    } finally {
      setResolvingRef(null)
    }
  }

  const rowPoster = (it: Item) => {
    const w = 44
    const h = it.type === 'boardgame' ? w / posterAspect(it) : 66
    return { width: w, height: h }
  }

  const renderItem = ({ item: it }: { item: Item }) => {
    const st = entries[it.id]?.status
    const isOpen = open === it.id
    return (
      <View style={{ borderRadius: 16, backgroundColor: alpha(colors.surface, 0.7), borderWidth: 1, borderColor: colors.line, marginBottom: 8 }}>
        <Press onPress={() => setOpen(isOpen ? null : it.id)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }}>
          <Poster item={it} style={[rowPoster(it), { borderRadius: 8, alignSelf: 'center' }]} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText numberOfLines={2} style={{ fontFamily: 'Fraunces72-600', fontSize: 16, lineHeight: 20, color: colors.ink }}>{titleOf(it)}</AppText>
            <AppText numberOfLines={1} style={{ fontFamily: 'Inter-400', fontSize: 12, lineHeight: 16, color: colors.mute }}>{`${it.year} · ${it.creator}`}</AppText>
          </View>
          {st ? <Icon name={st === 'seen' ? 'check' : 'bookmark'} size={18} color={colors.accent} /> : null}
        </Press>
        {isOpen && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4 }}>
            {st ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppText style={{ flex: 1, fontFamily: 'Inter-400', fontSize: 14, lineHeight: 20, color: colors.mute }}>{STATUS_TXT[st]}</AppText>
                <Press
                  accessibilityRole="button"
                  onPress={() => {
                    onClose()
                    router.push({ pathname: '/i/[id]', params: { id: it.id } })
                  }}
                  style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
                >
                  <AppText style={{ fontFamily: 'Inter-600', fontSize: 14, lineHeight: 20, color: colors.accentInk }}>Abrir ficha</AppText>
                </Press>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Press
                  accessibilityRole="button"
                  onPress={() => {
                    setStatus(it.id, 'seen')
                    setRating(it.id)
                  }}
                  style={{ flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
                >
                  <AppText style={{ fontFamily: 'Inter-600', fontSize: 14, lineHeight: 20, color: colors.accentInk }}>{seenLabel(it.type)}</AppText>
                </Press>
                <Press
                  accessibilityRole="button"
                  onPress={() => {
                    setStatus(it.id, 'pending')
                    onClose('Guardada en pendientes ✓')
                  }}
                  style={{ flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}
                >
                  <AppText style={{ fontFamily: 'Inter-600', fontSize: 14, lineHeight: 20, color: colors.ink }}>Pendiente</AppText>
                </Press>
              </View>
            )}
          </View>
        )}
      </View>
    )
  }

  const footer = (
    <View>
      {(remoteResults.length > 0 || searchingRemote) && (
        <View style={{ paddingTop: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 8 }}>
            <AppText style={{ fontFamily: 'Inter-600', fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.mute }}>Más en el catálogo</AppText>
            {searchingRemote && <AppText style={{ fontFamily: 'Inter-400', fontSize: 12, lineHeight: 16, color: alpha(colors.mute, 0.8) }}>Buscando…</AppText>}
          </View>
          {searchingRemote && remoteResults.length === 0 &&
            [0, 1, 2].map((i) => (
              <View key={`sk${i}`} accessibilityElementsHidden style={{ borderRadius: 16, backgroundColor: alpha(colors.surface, 0.5), borderWidth: 1, borderColor: alpha(colors.line, 0.6), flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, marginBottom: 8 }}>
                <View style={{ width: 44, height: 66, borderRadius: 8, backgroundColor: colors.surface2 }} />
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={{ height: 16, width: '66%', borderRadius: 4, backgroundColor: colors.surface2 }} />
                  <View style={{ height: 12, width: '33%', borderRadius: 4, backgroundColor: colors.surface2 }} />
                </View>
              </View>
            ))}
          {remoteResults.map((hit) => {
            const resolving = resolvingRef === hit.ref.id
            return (
              <Press
                key={hit.ref.id}
                onPress={() => handleSelectRemote(hit)}
                disabled={resolving}
                dim={resolving ? 0.6 : 1}
                accessibilityRole="button"
                style={{ borderRadius: 16, backgroundColor: alpha(colors.surface, 0.5), borderWidth: 1, borderColor: alpha(colors.line, 0.6), flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, marginBottom: 8 }}
              >
                {hit.posterUrl ? (
                  <Image source={{ uri: hit.posterUrl }} accessibilityLabel={`Portada de ${hit.title}`} contentFit="cover" cachePolicy="memory-disk" style={{ width: 44, height: 66, borderRadius: 8, backgroundColor: colors.surface2 }} />
                ) : (
                  <View style={{ width: 44, height: 66, borderRadius: 8, backgroundColor: alpha(colors.surface2, 0.8), alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="search" size={16} color={colors.mute} />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText numberOfLines={2} style={{ fontFamily: 'Fraunces72-600', fontSize: 16, lineHeight: 20, color: colors.ink }}>{hit.title}</AppText>
                  <AppText numberOfLines={1} style={{ fontFamily: 'Inter-400', fontSize: 12, lineHeight: 16, color: colors.mute }}>{`${hit.year || '—'} ${hit.creator ? `· ${hit.creator}` : ''}`}</AppText>
                </View>
                <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: alpha(colors.accent, 0.1) }}>
                  <AppText style={{ fontFamily: 'Inter-600', fontSize: 12, lineHeight: 16, color: colors.accent }}>{resolving ? '…' : 'Añadir'}</AppText>
                </View>
              </Press>
            )
          })}
        </View>
      )}
      {results.length === 0 && !searchingRemote && remoteResults.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Icon name="search" size={20} color={colors.mute} />
          </View>
          <AppText style={[tx('body'), { color: colors.mute }]}>No está en nuestro catálogo todavía</AppText>
        </View>
      )}
    </View>
  )

  let body
  if (placing) body = <PlaceFlow key={placing} itemId={placing} onDone={(m?: string) => onClose(m)} />
  else if (rating) body = <RatingFlow key={rating} itemId={rating} withStars onDone={() => { setPlacing(rating); setRating(null) }} />
  else
    body = (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: Math.max(insets.top, 12) }}>
        <View style={{ paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Press onPress={() => onClose()} accessibilityRole="button" accessibilityLabel="Cerrar" style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" color={colors.ink} />
          </Press>
          <AppText numberOfLines={1} style={{ flex: 1, fontFamily: 'Inter-600', fontSize: 20, lineHeight: 28, color: colors.ink }}>
            {shelf ? `Añadir a ${SHELF_LABEL[shelf].plural}` : 'Añadir a mano'}
          </AppText>
        </View>

        {!shelf ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 12 }}>
            {/* «Importar listas externas» y su texto de enlace no se muestran hasta que exista la pantalla Importar (BUILT.importar) */}
            {ACTIVE_SHELVES.map((s) => (
              <Press
                key={s}
                onPress={() => setShelf(s)}
                accessibilityRole="button"
                style={{ minHeight: 64, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <AppText style={{ fontFamily: 'Inter-600', fontSize: 18, lineHeight: 28, color: colors.ink }}>{SHELF_LABEL[s].plural}</AppText>
                <Icon name="chevron" size={18} color={colors.mute} />
              </Press>
            ))}
          </View>
        ) : (
          <>
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <View style={{ position: 'absolute', left: 28, top: 16, zIndex: 1 }} pointerEvents="none">
                <Icon name="search" size={18} color={colors.mute} />
              </View>
              <TextInput
                autoFocus
                value={q}
                onChangeText={setQ}
                onFocus={() => setFocus(true)}
                onBlur={() => setFocus(false)}
                placeholder={`Buscar en ${SHELF_LABEL[shelf].plural.toLowerCase()}…`}
                placeholderTextColor={colors.mute}
                accessibilityLabel="Buscar en el catálogo"
                autoCorrect={false}
                returnKeyType="search"
                style={{ minHeight: 50, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: focus ? colors.accent : colors.line, paddingLeft: 40, paddingRight: 16, fontFamily: 'Inter-400', fontSize: 15, color: colors.ink }}
              />
            </View>
            <FlatList
              data={results}
              keyExtractor={(it) => it.id}
              renderItem={renderItem}
              extraData={[open, entries]}
              ListFooterComponent={footer}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 0) + 24 }}
              style={{ flex: 1 }}
            />
          </>
        )}
      </View>
    )

  return (
    <Modal visible animationType="none" statusBarTranslucent navigationBarTranslucent supportedOrientations={['portrait']} onRequestClose={() => onClose()}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>{body}</GestureHandlerRootView>
    </Modal>
  )
}
