/**
 * harvest.mjs — Pipeline de recolección, deduplicación y portadas para Canciones (T28 §28.2 y §28.3)
 *
 * Fuentes:
 * 1. ListenBrainz: top grabaciones por artista del seed (409 artistas con mbid).
 *    Si un artista requiere auth en ListenBrainz (HTTP 401), recurre a iTunes Search API (top temas + carátula 600px).
 * 2. Éxitos en España: Los 40 / PROMUSICAE / clásicos españoles, resueltos en MusicBrainz.
 *    Lo que no se resuelve va a cache/songs/sin-resolver.json.
 * 3. MusicBrainz: primer año de publicación (first-release-date), obras (works) e ISRCs.
 * 4. Carátulas: Cover Art Archive (CAA) -> iTunes (600px) -> foto del artista del seed -> póster generado.
 * 5. Deduplicación: dedupe.mjs (1 versión de estudio original por canción, fusionando remasters/directos).
 *
 * Salida:
 * - app/public/data/songs.json (~4.000 - 6.000 canciones)
 * - app/scripts/cache/songs/sin-resolver.json
 * - Informe de métricas para docs/registro/T28.md (Parada 1)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deduplicateRecordings, normalizeArtist, pickCanonicalSong, slugify } from './dedupe.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const CACHE_DIR = join(ROOT, 'scripts', 'cache', 'songs')
const LB_CACHE_DIR = join(CACHE_DIR, 'listenbrainz')
const MB_CACHE_DIR = join(CACHE_DIR, 'musicbrainz')
const ITUNES_CACHE_DIR = join(CACHE_DIR, 'itunes')
const UNRESOLVED_FILE = join(CACHE_DIR, 'sin-resolver.json')
const OUTPUT_FILE = join(ROOT, 'public', 'data', 'songs.json')

// Crear carpetas de caché
for (const dir of [CACHE_DIR, LB_CACHE_DIR, MB_CACHE_DIR, ITUNES_CACHE_DIR, dirname(OUTPUT_FILE)]) {
  mkdirSync(dir, { recursive: true })
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const USER_AGENT = 'BibliotecaApp/1.0 (contacto@biblioteca.app)'
const LB_TOKEN = process.env.LISTENBRAINZ_TOKEN || null

/** Petición con reintentos y control de errores */
async function fetchJsonWithRetry(url, headers = {}, retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...headers } })
      if (res.status === 404 || res.status === 401) return { status: res.status, data: null }
      if (res.status === 429 || res.status >= 500) {
        await sleep(delayMs * (i + 1))
        continue
      }
      if (!res.ok) return { status: res.status, data: null }
      const data = await res.json()
      return { status: 200, data }
    } catch {
      await sleep(delayMs * (i + 1))
    }
  }
  return { status: 0, data: null }
}

/** 1. Obtener top grabaciones de ListenBrainz (con fallback a iTunes) para los 409 artistas */
async function fetchArtistRecordings(artists) {
  console.log(`\n=== Paso 1: Top grabaciones por artista (${artists.length} artistas del seed) ===`)
  const allRecordings = []
  let fromLbCache = 0
  let fromLbNet = 0
  let fromItunesCache = 0
  let fromItunesNet = 0

  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i]
    const lbCachePath = join(LB_CACHE_DIR, `${artist.mbid}.json`)
    const itunesCachePath = join(ITUNES_CACHE_DIR, `artist_${artist.mbid}.json`)

    let lbData = null
    let itunesData = null

    // Intentar caché de ListenBrainz
    if (existsSync(lbCachePath)) {
      try {
        lbData = JSON.parse(readFileSync(lbCachePath, 'utf8'))
        fromLbCache++
      } catch {
        lbData = null
      }
    }

    // Si no hay caché de LB, intentar red de LB
    if (!lbData && !existsSync(itunesCachePath)) {
      const lbHeaders = LB_TOKEN ? { Authorization: `Token ${LB_TOKEN}` } : {}
      const url = `https://api.listenbrainz.org/1/popularity/top-recordings-for-artist/${artist.mbid}`
      const resp = await fetchJsonWithRetry(url, lbHeaders, 2, 400)
      if (resp.status === 200 && Array.isArray(resp.data)) {
        lbData = resp.data
        writeFileSync(lbCachePath, JSON.stringify(lbData), 'utf8')
        fromLbNet++
      }
      await sleep(120)
    }

    // Si ListenBrainz tiene datos, usarlos
    if (Array.isArray(lbData) && lbData.length > 0) {
      const topRecs = lbData.slice(0, 15)
      for (const r of topRecs) {
        if (!r.recording_name || !r.recording_mbid) continue
        allRecordings.push({
          title: r.recording_name,
          artist: artist.title,
          artistId: artist.id,
          artistMbid: artist.mbid,
          recordingMbid: r.recording_mbid,
          mbid: r.recording_mbid,
          releaseName: r.release_name || null,
          releaseMbid: r.release_mbid || null,
          caaId: r.caa_id || null,
          caaReleaseMbid: r.caa_release_mbid || null,
          length: r.length || null,
          totalListenCount: r.total_listen_count || 0,
          totalUserCount: r.total_user_count || 0,
          provenance: 'listenbrainz',
        })
      }
    } else {
      // Fallback a iTunes para artistas con 401 en ListenBrainz
      if (existsSync(itunesCachePath)) {
        try {
          itunesData = JSON.parse(readFileSync(itunesCachePath, 'utf8'))
          fromItunesCache++
        } catch {
          itunesData = null
        }
      }

      if (!itunesData) {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artist.title)}&entity=song&limit=25`
        const resp = await fetchJsonWithRetry(url, {}, 2, 300)
        if (resp.data) {
          itunesData = resp.data
          writeFileSync(itunesCachePath, JSON.stringify(itunesData), 'utf8')
          fromItunesNet++
        }
        await sleep(100)
      }

      const results = itunesData?.results || []
      const normArtist = normalizeArtist(artist.title)
      const matchingTracks = results
        .filter((r) => {
          const rNorm = normalizeArtist(r.artistName)
          return rNorm === normArtist || rNorm.includes(normArtist) || normArtist.includes(rNorm)
        })
        .slice(0, 15)

      for (const t of matchingTracks) {
        if (!t.trackName) continue
        allRecordings.push({
          title: t.trackName,
          artist: artist.title,
          artistId: artist.id,
          artistMbid: artist.mbid,
          recordingMbid: null, // se resuelve en el paso 3
          mbid: null,
          firstReleaseDate: t.releaseDate ? t.releaseDate.slice(0, 10) : null,
          year: t.releaseDate ? parseInt(t.releaseDate.slice(0, 4), 10) : null,
          album: t.collectionName || null,
          length: t.trackTimeMillis || null,
          posterUrl: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb', '600x600bb') : null,
          totalListenCount: 100000,
          provenance: 'itunes',
        })
      }
    }

    if ((i + 1) % 50 === 0 || i + 1 === artists.length) {
      console.log(
        `Procesados ${i + 1}/${artists.length} artistas (LB: ${fromLbCache + fromLbNet}, iTunes: ${fromItunesCache + fromItunesNet}, Grabaciones acumuladas: ${allRecordings.length})`
      )
    }
  }

  return allRecordings
}

/** 2. Lista curada de clásicos y Nº1s emblemáticos en España (Los 40 / PROMUSICAE / Rolling Stone) */
const SPANISH_HITS_CURATED = [
  { title: 'La Macarena', artist: 'Los del Río', year: 1993, src: 'los40-historico' },
  { title: 'Aserejé', artist: 'Las Ketchup', year: 2002, src: 'promusicae-n1' },
  { title: 'Bailando', artist: 'Enrique Iglesias', year: 2014, src: 'promusicae-n1' },
  { title: 'Nochentera', artist: 'Vicco', year: 2023, src: 'los40-n1' },
  { title: 'Quédate (Bzrp Music Sessions, Vol. 52)', artist: 'Bizarrap', year: 2022, src: 'promusicae-n1' },
  { title: 'Todo de Ti', artist: 'Rauw Alejandro', year: 2021, src: 'promusicae-n1' },
  { title: 'Tacones Rojos', artist: 'Sebastián Yatra', year: 2021, src: 'los40-n1' },
  { title: 'Potra Salvaje', artist: 'Isabel Aaiún', year: 2023, src: 'promusicae-n1' },
  { title: 'Zorra', artist: 'Nebulossa', year: 2024, src: 'los40-n1' },
  { title: 'SloMo', artist: 'Chanel', year: 2022, src: 'los40-n1' },
  { title: 'Ay Mamá', artist: 'Rigoberta Bandini', year: 2021, src: 'los40-n1' },
  { title: 'Soldadito Marinero', artist: 'Fito y Fitipaldis', year: 2003, src: 'rolling-stone-espana' },
  { title: 'Chiquilla', artist: 'Seguridad Social', year: 1991, src: 'los40-historico' },
  { title: 'La Flaca', artist: 'Jarabe de Palo', year: 1996, src: 'rolling-stone-espana' },
  { title: 'La Chica de Ayer', artist: 'Nacha Pop', year: 1980, src: 'rolling-stone-espana' },
  { title: 'Devuélveme a mi chica', artist: 'Hombres G', year: 1985, src: 'rolling-stone-espana' },
  { title: 'Ave María', artist: 'David Bisbal', year: 2002, src: 'los40-n1' },
  { title: 'Bulería', artist: 'David Bisbal', year: 2004, src: 'los40-n1' },
  { title: 'Corazón Partío', artist: 'Alejandro Sanz', year: 1997, src: 'los40-historico' },
  { title: 'Amiga Mía', artist: 'Alejandro Sanz', year: 1997, src: 'los40-historico' },
  { title: 'La Raja de Tu Falda', artist: 'Estopa', year: 1999, src: 'rolling-stone-espana' },
  { title: 'Como Camarón', artist: 'Estopa', year: 1999, src: 'rolling-stone-espana' },
  { title: 'Hijo de la Luna', artist: 'Mecano', year: 1986, src: 'rolling-stone-espana' },
  { title: 'Mujer contra Mujer', artist: 'Mecano', year: 1988, src: 'rolling-stone-espana' },
  { title: 'Barco a Venus', artist: 'Mecano', year: 1983, src: 'rolling-stone-espana' },
  { title: 'Entre dos tierras', artist: 'Héroes del Silencio', year: 1990, src: 'rolling-stone-espana' },
  { title: 'Maldito Duende', artist: 'Héroes del Silencio', year: 1990, src: 'rolling-stone-espana' },
  { title: 'Sin Documentos', artist: 'Los Rodríguez', year: 1993, src: 'rolling-stone-espana' },
  { title: 'Agradecido', artist: 'Rosendo', year: 1985, src: 'rolling-stone-espana' },
  { title: 'So Payaso', artist: 'Extremoduro', year: 1996, src: 'rolling-stone-espana' },
  { title: 'La Vereda de la Puerta de Atrás', artist: 'Extremoduro', year: 2002, src: 'rolling-stone-espana' },
  { title: '19 días y 500 noches', artist: 'Joaquín Sabina', year: 1999, src: 'rolling-stone-espana' },
  { title: 'Y sin embargo', artist: 'Joaquín Sabina', year: 1996, src: 'rolling-stone-espana' },
  { title: 'Mediterráneo', artist: 'Joan Manuel Serrat', year: 1971, src: 'rolling-stone-espana' },
  { title: 'Fiesta', artist: 'Joan Manuel Serrat', year: 1970, src: 'rolling-stone-espana' },
  { title: 'Vivir así es morir de amor', artist: 'Camilo Sesto', year: 1978, src: 'los40-historico' },
  { title: 'Eres tú', artist: 'Mocedades', year: 1973, src: 'los40-historico' },
  { title: 'Un beso y una flor', artist: 'Nino Bravo', year: 1972, src: 'los40-historico' },
  { title: 'Libre', artist: 'Nino Bravo', year: 1972, src: 'los40-historico' },
  { title: 'Como una ola', artist: 'Rocío Jurado', year: 1981, src: 'los40-historico' },
  { title: 'Señora', artist: 'Rocío Jurado', year: 1979, src: 'los40-historico' },
  { title: 'Escándalo', artist: 'Raphael', year: 1992, src: 'los40-historico' },
  { title: 'Mi gran noche', artist: 'Raphael', year: 1968, src: 'los40-historico' },
  { title: 'Bailar pegados', artist: 'Sergio Dalma', year: 1991, src: 'los40-historico' },
  { title: 'Cosas de la edad', artist: 'Modestia Aparte', year: 1990, src: 'los40-historico' },
  { title: 'Sabor de amor', artist: 'Danza Invisible', year: 1988, src: 'los40-historico' },
  { title: 'A quién le importa', artist: 'Alaska y Dinarama', year: 1986, src: 'rolling-stone-espana' },
  { title: 'Ni tú ni nadie', artist: 'Alaska y Dinarama', year: 1985, src: 'rolling-stone-espana' },
  { title: 'Mil campanas', artist: 'Olé Olé', year: 1990, src: 'los40-historico' },
  { title: 'No controles', artist: 'Olé Olé', year: 1983, src: 'los40-historico' },
]

/** 3. Resolver éxitos españoles adicionales en MusicBrainz */
async function resolveSpanishHits() {
  console.log(`\n=== Paso 2: Resolución de éxitos en España (${SPANISH_HITS_CURATED.length} temas) ===`)
  const resolved = []
  const unresolved = []

  for (const hit of SPANISH_HITS_CURATED) {
    const slug = slugify(`${hit.title}-${hit.artist}`)
    const cachePath = join(MB_CACHE_DIR, `search_${slug}.json`)
    let data = null

    if (existsSync(cachePath)) {
      try {
        data = JSON.parse(readFileSync(cachePath, 'utf8'))
      } catch {
        data = null
      }
    }

    if (!data) {
      const q = `recording:${hit.title} AND artist:${hit.artist}`
      const url = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(q)}&limit=3&fmt=json`
      const resp = await fetchJsonWithRetry(url, {}, 3, 1100)
      data = resp.data
      if (data) writeFileSync(cachePath, JSON.stringify(data), 'utf8')
      await sleep(1100)
    }

    const rec = data?.recordings?.[0]
    if (rec && rec.id) {
      resolved.push({
        title: rec.title || hit.title,
        artist: rec['artist-credit']?.[0]?.name || hit.artist,
        recordingMbid: rec.id,
        mbid: rec.id,
        firstReleaseDate: rec['first-release-date'] || `${hit.year}-01-01`,
        year: hit.year,
        isrc: rec.isrcs?.[0] || null,
        totalListenCount: 200000,
        provenance: hit.src,
      })
    } else {
      unresolved.push({
        title: hit.title,
        artist: hit.artist,
        year: hit.year,
        src: hit.src,
        reason: 'no_recording_found_in_musicbrainz',
      })
    }
  }

  console.log(`Éxitos españoles resueltos: ${resolved.length}, sin resolver: ${unresolved.length}`)
  return { resolved, unresolved }
}

/** 4. Resolver grabaciones de iTunes sin MBID contra MusicBrainz (agrupado por artista para máxima velocidad) */
async function resolveMissingMbids(recordings) {
  const missing = recordings.filter((r) => !r.recordingMbid && r.artistMbid)
  console.log(`\n=== Paso 3: Resolución de ${missing.length} grabaciones sin MBID en MusicBrainz ===`)

  // Agrupar por artista para hacer 1 sola llamada a MusicBrainz por artista (máx. 100 temas)
  const byArtist = new Map()
  for (const r of missing) {
    if (!byArtist.has(r.artistMbid)) byArtist.set(r.artistMbid, [])
    byArtist.get(r.artistMbid).push(r)
  }

  const artistMbids = Array.from(byArtist.keys())
  console.log(`Artistas a consultar en MusicBrainz: ${artistMbids.length}`)

  for (let i = 0; i < artistMbids.length; i++) {
    const arid = artistMbids[i]
    const tracks = byArtist.get(arid)
    const cachePath = join(MB_CACHE_DIR, `artist_recs_${arid}.json`)
    let data = null

    if (existsSync(cachePath)) {
      try {
        data = JSON.parse(readFileSync(cachePath, 'utf8'))
      } catch {
        data = null
      }
    }

    if (!data) {
      const q = `arid:${arid}`
      const url = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(q)}&limit=100&fmt=json`
      const resp = await fetchJsonWithRetry(url, {}, 2, 1100)
      data = resp.data
      if (data) writeFileSync(cachePath, JSON.stringify(data), 'utf8')
      await sleep(1100)
    }

    const mbRecs = data?.recordings || []
    for (const track of tracks) {
      const normT = track.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
      // Buscar coincidencia exacta o por inclusión
      const match = mbRecs.find((mr) => {
        const mrNorm = mr.title?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
        return mrNorm === normT || mrNorm?.startsWith(normT) || normT?.startsWith(mrNorm)
      })

      if (match) {
        track.recordingMbid = match.id
        track.mbid = match.id
        if (!track.firstReleaseDate && match['first-release-date']) {
          track.firstReleaseDate = match['first-release-date']
        }
        if (!track.isrc && match.isrcs?.[0]) {
          track.isrc = match.isrcs[0]
        }
      }
    }

    if ((i + 1) % 25 === 0 || i + 1 === artistMbids.length) {
      console.log(`Artistas procesados en MB: ${i + 1}/${artistMbids.length}`)
    }
  }
}

/** 5. Enriquecimiento por lotes de fechas en MusicBrainz para las que tienen MBID */
async function enrichDatesFromMusicBrainz(recordings) {
  const needsDate = recordings.filter((r) => r.recordingMbid && !r.firstReleaseDate)
  console.log(`\n=== Paso 4: Enriquecimiento de fechas en MusicBrainz (${needsDate.length} grabaciones) ===`)

  const BATCH_SIZE = 25
  const totalBatches = Math.ceil(needsDate.length / BATCH_SIZE)

  for (let b = 0; b < totalBatches; b++) {
    const batch = needsDate.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)
    const batchIds = batch.map((r) => r.recordingMbid)
    const cachePath = join(MB_CACHE_DIR, `date_batch_${b}.json`)
    let data = null

    if (existsSync(cachePath)) {
      try {
        data = JSON.parse(readFileSync(cachePath, 'utf8'))
      } catch {
        data = null
      }
    }

    if (!data) {
      const query = batchIds.map((id) => `rid:${id}`).join(' OR ')
      const url = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(query)}&limit=${BATCH_SIZE}&fmt=json`
      const resp = await fetchJsonWithRetry(url, {}, 3, 1100)
      data = resp.data
      if (data) writeFileSync(cachePath, JSON.stringify(data), 'utf8')
      await sleep(1100)
    }

    if (data?.recordings) {
      const map = new Map(data.recordings.map((rec) => [rec.id, rec]))
      for (const item of batch) {
        const mbRec = map.get(item.recordingMbid)
        if (mbRec) {
          if (mbRec['first-release-date']) item.firstReleaseDate = mbRec['first-release-date']
          if (mbRec.isrcs?.[0]) item.isrc = mbRec.isrcs[0]
        }
      }
    }

    if ((b + 1) % 10 === 0 || b + 1 === totalBatches) {
      console.log(`Lotes de fechas completados: ${b + 1}/${totalBatches}`)
    }
  }
}

/** 6. Enriquecimiento de carátulas: CAA (Cover Art Archive) e iTunes Search */
async function enrichCovers(songs, seedArtistsById) {
  console.log(`\n=== Paso 5: Carátulas (Cover Art Archive / iTunes) (${songs.length} canciones) ===`)
  let caaCount = 0
  let itunesCount = 0
  let artistPosterCount = 0
  let generatedCount = 0

  for (let i = 0; i < songs.length; i++) {
    const s = songs[i]

    // 1. Si ya tiene posterUrl (ej. traída de iTunes), conservarla
    if (s.posterUrl) {
      itunesCount++
      continue
    }

    // 2. Cover Art Archive si tiene caaReleaseMbid
    if (s.caaReleaseMbid) {
      s.posterUrl = `https://coverartarchive.org/release/${s.caaReleaseMbid}/front-500`
      s.src = { ...s.src, posterUrl: 'coverartarchive' }
      caaCount++
      continue
    }

    // 3. Búsqueda en iTunes
    const slug = slugify(`${s.title}-${s.creator}`)
    const itunesCachePath = join(ITUNES_CACHE_DIR, `cover_${slug}.json`)
    let itunesData = null

    if (existsSync(itunesCachePath)) {
      try {
        itunesData = JSON.parse(readFileSync(itunesCachePath, 'utf8'))
      } catch {
        itunesData = null
      }
    }

    if (!itunesData) {
      const term = `${s.creator} ${s.title}`
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=1`
      const resp = await fetchJsonWithRetry(url, {}, 2, 300)
      itunesData = resp.data
      if (itunesData) writeFileSync(itunesCachePath, JSON.stringify(itunesData), 'utf8')
      await sleep(100)
    }

    const firstResult = itunesData?.results?.[0]
    if (firstResult && firstResult.artworkUrl100) {
      s.posterUrl = firstResult.artworkUrl100.replace('100x100bb', '600x600bb')
      s.src = { ...s.src, posterUrl: 'itunes' }
      itunesCount++
      continue
    }

    // 4. Foto del artista en el seed
    const artistSeed = s.artistId ? seedArtistsById.get(s.artistId) : null
    if (artistSeed && artistSeed.posterUrl) {
      s.posterUrl = artistSeed.posterUrl
      s.src = { ...s.src, posterUrl: 'artist-seed' }
      artistPosterCount++
      continue
    }

    // 5. Póster generado (sin carátula externa)
    s.posterUrl = null
    generatedCount++
  }

  console.log(
    `Portadas asignadas: CAA: ${caaCount}, iTunes: ${itunesCount}, Artista: ${artistPosterCount}, Generadas: ${generatedCount}`
  )
  return { caaCount, itunesCount, artistPosterCount, generatedCount }
}

/** Función principal */
async function main() {
  console.log('Iniciando recolección de Canciones (T28)...')

  // Cargar artistas del seed
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const seedArtists = seed.items.filter((it) => it.type === 'artist' && it.mbid)
  const seedArtistsById = new Map(seed.items.filter((it) => it.type === 'artist').map((a) => [a.id, a]))
  console.log(`Artistas del seed con MBID: ${seedArtists.length}`)

  // 1. Recolección de grabaciones por artista
  const artistRecordings = await fetchArtistRecordings(seedArtists)

  // 2. Éxitos españoles curados
  const { resolved: spanishHits, unresolved } = await resolveSpanishHits()
  writeFileSync(UNRESOLVED_FILE, JSON.stringify(unresolved, null, 2), 'utf8')

  // Combinar grabaciones candidatas
  const allCandidates = [...artistRecordings, ...spanishHits]
  console.log(`\nTotal grabaciones candidatas recolectadas: ${allCandidates.length}`)

  // 3. Resolver MBIDs que falten en grabaciones
  await resolveMissingMbids(allCandidates)

  // 4. Enriquecer fechas de publicación en MusicBrainz
  await enrichDatesFromMusicBrainz(allCandidates)

  // 5. Deduplicar grabaciones
  console.log(`\n=== Paso 6: Deduplicación (§28.3) ===`)
  const groups = deduplicateRecordings(allCandidates)
  console.log(`Grupos formados tras deduplicación: ${groups.length}`)

  // Convertir cada grupo en una Song canónica
  const deduplicatedSongs = []
  const mergedGroupsSample = []

  for (const group of groups) {
    const song = pickCanonicalSong(group)
    if (song) {
      deduplicatedSongs.push(song)
      if (group.length > 1) {
        mergedGroupsSample.push({
          canonical: `${song.title} (${song.creator}, ${song.year}) [${song.id}]`,
          variants: group.map((g) => `${g.title} [${g.recordingMbid || 'no-mbid'}] (${g.provenance})`),
        })
      }
    }
  }

  console.log(`Canciones únicas resultantes: ${deduplicatedSongs.length}`)

  // 6. Enriquecer carátulas
  const coverStats = await enrichCovers(deduplicatedSongs, seedArtistsById)

  // 7. Formatear y ordenar catálogo final
  // Ordenar por popularidad descendente
  deduplicatedSongs.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))

  // Asignar popularidad relativa como percentil entero [1..100]
  for (let i = 0; i < deduplicatedSongs.length; i++) {
    const pct = Math.round(100 - (i / deduplicatedSongs.length) * 99)
    deduplicatedSongs[i].popularity = Math.max(1, Math.min(100, pct))
  }

  // Guardar archivo final compacto
  const cleanSongs = deduplicatedSongs.map((s) => {
    const { groupSize, caaReleaseMbid, caaId, ...rest } = s
    return rest
  })

  writeFileSync(OUTPUT_FILE, JSON.stringify(cleanSongs), 'utf8')
  console.log(`\nGuardado ${cleanSongs.length} canciones en ${OUTPUT_FILE}`)

  // Métricas para la Parada 1
  const songsWithCover = cleanSongs.filter((s) => s.posterUrl).length
  const pctCover = ((songsWithCover / cleanSongs.length) * 100).toFixed(1)
  const pctUnresolved = ((unresolved.length / (allCandidates.length + unresolved.length)) * 100).toFixed(2)

  // Seleccionar 30 grupos fusionados aleatorios
  const random30Merged = [...mergedGroupsSample].sort(() => Math.random() - 0.5).slice(0, 30)

  // Seleccionar 50 canciones aleatorias
  const random50Sample = [...cleanSongs].sort(() => Math.random() - 0.5).slice(0, 50)

  const report = {
    totalRecordingsIngested: allCandidates.length,
    resultingSongsCount: cleanSongs.length,
    songsWithCoverCount: songsWithCover,
    pctCover,
    unresolvedCount: unresolved.length,
    pctUnresolved,
    coverBreakdown: coverStats,
    sample30MergedGroups: random30Merged,
    sample50Songs: random50Sample.map((s) => ({
      id: s.id,
      title: s.title,
      creator: s.creator,
      year: s.year,
      album: s.album,
      popularity: s.popularity,
      posterUrl: s.posterUrl,
      src: s.src,
    })),
  }

  writeFileSync(join(CACHE_DIR, 'report_parada_1.json'), JSON.stringify(report, null, 2), 'utf8')
  console.log(`Informe guardado en ${join(CACHE_DIR, 'report_parada_1.json')}`)
}

main().catch((err) => {
  console.error('Error en harvest.mjs:', err)
  process.exit(1)
})
