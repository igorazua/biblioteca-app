// Genera src/data/seed.json (catálogo + amigos simulados). Determinista: misma entrada → mismo JSON.
//
//   npm run seed                 → enriquece pelis, series y libros con recursos libres (IMDb, TVMaze, Open Library)
//   TMDB_API_KEY en .env.local   → si existe clave TMDB, la usa para pelis/series (TMDB) y Open Library para libros
//   npm run seed -- --fast       → solo catálogo local sin llamadas de red (posterUrl: null)
//
// Los IDs son SLUGS estables (`movie:el-hoyo-2019`), no números de TMDB, para que ni los links compartidos
// ni el localStorage se rompan al regenerar el catálogo.
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { MOVIES, SERIES, BOOKS, PLATFORM } from './seed-catalog.mjs'
import { FRIENDS, COMMENTS } from './seed-friends.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, '..', 'src', 'data', 'seed.json')

const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hashStr = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }

// ---------- 1. Catálogo manual ----------
const plat = (codes) => (codes ? codes.split(',').map((c) => PLATFORM[c]) : [])
const items = []
for (const [title, year, creator, dur, genres, synopsis, popularity, p] of MOVIES)
  items.push({ id: `movie:${slugify(title)}-${year}`, type: 'movie', title, year, creator, durationMin: dur, genres: genres.split(','), synopsis, posterUrl: null, platforms: plat(p), popularity })
for (const [title, year, creator, dur, seasons, genres, synopsis, popularity, p] of SERIES)
  items.push({ id: `series:${slugify(title)}-${year}`, type: 'series', title, year, creator, durationMin: dur, ...(seasons ? { seasons } : {}), genres: genres.split(','), synopsis, posterUrl: null, platforms: plat(p), popularity })
// Profundidad de lectura: densa = clásicos, ensayo o ladrillos; ligera = cortos y de ritmo ágil; media = el resto
const depthOf = (pages, genres) => (genres.includes('Clásico') || genres.includes('Ensayo') || pages > 600 ? 'densa' : pages <= 300 ? 'ligera' : 'media')
for (const [title, year, creator, pages, genres, synopsis, popularity] of BOOKS)
  items.push({ id: `book:${slugify(title)}-${year}`, type: 'book', title, year, creator, pages, depth: depthOf(pages, genres.split(',')), genres: genres.split(','), synopsis, posterUrl: null, popularity })

if (MOVIES.length < 100 || SERIES.length < 100 || BOOKS.length < 100)
  throw new Error(`Catálogo con tamaño inesperado: ${MOVIES.length}/${SERIES.length}/${BOOKS.length} (se esperaba >= 100 de cada)`)
if (new Set(items.map((i) => i.id)).size !== items.length) throw new Error('IDs duplicados en el catálogo')

// ---------- 2. Enriquecimiento ----------
const TMDB_KEY = process.env.TMDB_API_KEY
const IS_FAST = process.argv.includes('--fast')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const getJson = async (url) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${url.replace(/api_key=[^&]+/, 'api_key=***')}`)
  return r.json()
}

async function enrichWithTmdb() {
  const base = 'https://api.themoviedb.org/3'
  const maxPop = { movie: 1, series: 1 }
  const tmdbPop = {}
  for (const it of items.filter((i) => i.type !== 'book')) {
    const kind = it.type === 'movie' ? 'movie' : 'tv'
    const yearParam = it.type === 'movie' ? 'year' : 'first_air_date_year'
    try {
      const s = await getJson(`${base}/search/${kind}?api_key=${TMDB_KEY}&language=es-ES&query=${encodeURIComponent(it.title)}&${yearParam}=${it.year}`)
      const hit = s.results?.[0]
      if (!hit) { console.warn('  sin resultado en TMDB:', it.title); continue }
      const d = await getJson(`${base}/${kind}/${hit.id}?api_key=${TMDB_KEY}&language=es-ES&append_to_response=watch/providers`)
      it.tmdbId = hit.id
      if (d.poster_path) it.posterUrl = `https://image.tmdb.org/t/p/w500${d.poster_path}`
      if (d.overview) it.synopsis = d.overview
      if (it.type === 'movie' && d.runtime) it.durationMin = d.runtime
      if (it.type === 'series') {
        if (d.episode_run_time?.[0]) it.durationMin = d.episode_run_time[0]
        if (d.number_of_seasons) it.seasons = d.number_of_seasons
      }
      const flat = d['watch/providers']?.results?.ES?.flatrate
      if (flat?.length) it.platforms = flat.map((p) => p.provider_name)
      tmdbPop[it.id] = d.popularity ?? hit.popularity ?? 0
      maxPop[it.type] = Math.max(maxPop[it.type], tmdbPop[it.id])
      await sleep(60)
    } catch (e) { console.warn('  fallo TMDB en', it.title, e.message) }
  }
  for (const it of items) if (tmdbPop[it.id] != null) {
    const norm = 100 * Math.sqrt(tmdbPop[it.id] / maxPop[it.type])
    it.popularity = Math.round(0.5 * it.popularity + 0.5 * norm)
  }
}

async function enrichWithOpenLibrary() {
  console.log('Enriqueciendo libros con Open Library (recurso libre)...')
  let ok = 0
  for (const it of items.filter((i) => i.type === 'book')) {
    try {
      let q = `https://openlibrary.org/search.json?title=${encodeURIComponent(it.title)}&author=${encodeURIComponent(it.creator)}&limit=1&fields=key,cover_i`
      let hit = (await getJson(q)).docs?.[0]
      if (!hit?.cover_i && it.title.includes(':')) {
        const shortTitle = it.title.split(':')[0].trim()
        q = `https://openlibrary.org/search.json?title=${encodeURIComponent(shortTitle)}&author=${encodeURIComponent(it.creator)}&limit=1&fields=key,cover_i`
        hit = (await getJson(q)).docs?.[0]
      }
      if (hit?.key) it.olid = hit.key.replace('/works/', '')
      if (hit?.cover_i) {
        it.posterUrl = `https://covers.openlibrary.org/b/id/${hit.cover_i}-L.jpg`
        ok++
      }
      await sleep(80)
    } catch (e) { /* fallback a portada generada */ }
  }
  console.log(`  Libros con portada de Open Library: ${ok}/${items.filter(i => i.type === 'book').length}`)
}

async function enrichWithTvMaze() {
  console.log('Enriqueciendo series con TVMaze (recurso libre)...')
  let ok = 0
  for (const it of items.filter((i) => i.type === 'series')) {
    try {
      const q = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(it.title)}`
      const hits = await getJson(q)
      const show = hits?.[0]?.show
      if (show) {
        it.tvmazeId = show.id
        if (show.image?.original || show.image?.medium) {
          it.posterUrl = show.image.original || show.image.medium
          ok++
        }
      }
      await sleep(60)
    } catch (e) { /* fallback a portada generada */ }
  }
  console.log(`  Series con portada de TVMaze: ${ok}/${items.filter(i => i.type === 'series').length}`)
}

async function enrichWithImdb() {
  console.log('Enriqueciendo películas con IMDb Suggestions (recurso libre)...')
  let ok = 0
  for (const it of items.filter((i) => i.type === 'movie')) {
    try {
      const slug = it.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '_')
      const url = `https://v2.sg.media-imdb.com/suggestion/${slug[0]}/${slug}.json`
      const res = await getJson(url)
      const hit = res.d?.find((x) => x.qid === 'movie' || x.q === 'feature') || res.d?.[0]
      if (hit?.i?.imageUrl) {
        it.posterUrl = hit.i.imageUrl
        ok++
      }
      await sleep(60)
    } catch (e) { /* fallback a portada generada */ }
  }
  console.log(`  Películas con portada de IMDb: ${ok}/${items.filter(i => i.type === 'movie').length}`)
}

if (IS_FAST) {
  console.log('Modo rápido (--fast): generando catálogo local con portadas de diseño.')
} else if (TMDB_KEY) {
  console.log('TMDB_API_KEY detectada: enriqueciendo con TMDB y Open Library…')
  await enrichWithTmdb()
  await enrichWithOpenLibrary()
} else {
  console.log('Sin TMDB_API_KEY: enriqueciendo con recursos libres (IMDb, TVMaze, Open Library)…')
  await enrichWithImdb()
  await enrichWithTvMaze()
  await enrichWithOpenLibrary()
}

// ---------- 3. Amigos simulados (semilla fija) ----------
const byTitle = new Map(items.map((i) => [i.title, i]))
const roundHalf = (x) => Math.round(x * 2) / 2
const friends = FRIENDS.map((f) => {
  const rng = mulberry32(hashStr(f.id))
  const forced = new Map()
  for (const [title, score, comment] of COMMENTS[f.id] ?? []) {
    const it = byTitle.get(title)
    if (!it) throw new Error(`Comentario de ${f.name} para un título que no existe: «${title}»`)
    forced.set(it.id, { itemId: it.id, status: 'seen', score, comment })
  }
  // «interés» = afinidad de géneros + sesgo por tipo + popularidad + ruido
  const interest = (it) =>
    it.genres.reduce((a, g) => a + (f.likes[g] ?? 0), 0) / Math.sqrt(it.genres.length) +
    (f.typeBias[it.type] ?? 0) + it.popularity / 40 + (rng() - 0.5) * 2.2
  const ranked = items.filter((i) => !forced.has(i.id)).map((i) => [i, interest(i)]).sort((a, b) => b[1] - a[1])
  const nSeen = 60 + Math.floor(rng() * 41)         // 60-100 vistas en total (catálogo ampliado)
  const nPending = 20 + Math.floor(rng() * 16)       // 20-35 pendientes
  const seenExtra = ranked.slice(0, Math.max(0, nSeen - forced.size))
  const seenIds = new Set(seenExtra.map(([i]) => i.id))
  const pendPool = ranked.filter(([i]) => !seenIds.has(i.id)).slice(0, 50)
  const pending = pendPool.sort(() => rng() - 0.5).slice(0, nPending)
  const entries = [...forced.values()]
  for (const [it, score] of seenExtra) {
    const raw = 6.2 + score * 0.55 + f.strict + (rng() - 0.5) * 1.6
    entries.push({ itemId: it.id, status: 'seen', score: Math.min(10, Math.max(0.5, roundHalf(raw))) })
  }
  for (const [it] of pending) entries.push({ itemId: it.id, status: 'pending' })
  entries.sort((a, b) => a.itemId.localeCompare(b.itemId))
  return { id: f.id, name: f.name, avatarColor: f.avatarColor, contact: f.contact, entries }
})

const seed = { version: 1, items, friends }
writeFileSync(OUT, JSON.stringify(seed))
const nCom = friends.reduce((a, f) => a + f.entries.filter((e) => e.comment).length, 0)
const nPosters = items.filter((i) => i.posterUrl).length
console.log(`seed.json: ${items.length} items (${MOVIES.length} pelis, ${SERIES.length} series, ${BOOKS.length} libros), ${nPosters} con portada real`)
console.log(`${friends.length} amigos simulados, ${nCom} comentarios`)
for (const f of friends) console.log(`  ${f.name}: ${f.entries.filter((e) => e.status === 'seen').length} vistas, ${f.entries.filter((e) => e.status === 'pending').length} pendientes`)
