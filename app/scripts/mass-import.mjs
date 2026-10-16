// Ingesta masiva para alcanzar ~1.000 pelis, ~1.000 series y ~1.000 libros
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FRIENDS, COMMENTS } from './seed-friends.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const SEED_FILE = join(here, '..', 'src', 'data', 'seed.json')

const slugify = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const stripHtml = (html) =>
  String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()

function mulberry32(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hashStr = (s) => {
  let h = 2166136261
  for (const c of s) {
    h ^= c.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function parseCSV(text) {
  const rows = []
  let currentRow = []
  let currentCell = ''
  let insideQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim())
      currentCell = ''
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++
      currentRow.push(currentCell.trim())
      if (currentRow.length > 1) rows.push(currentRow)
      currentRow = []
      currentCell = ''
    } else {
      currentCell += char
    }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.length > 1) rows.push(currentRow)
  }
  return rows
}

const depthOf = (pages, genres) =>
  genres.includes('Clásico') || genres.includes('Ensayo') || pages > 600
    ? 'densa'
    : pages <= 300
      ? 'ligera'
      : 'media'

async function run() {
  console.log('--- Iniciando importación masiva (~1.000 por categoría) ---')

  // 1. Cargar catálogo actual para preservar el 100% de lo ya curado
  const currentSeed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const existingItems = currentSeed.items || []
  console.log(`Catálogo base cargado: ${existingItems.length} obras`)

  const movies = existingItems.filter((i) => i.type === 'movie')
  const series = existingItems.filter((i) => i.type === 'series')
  const books = existingItems.filter((i) => i.type === 'book')
  console.log(`  Base: ${movies.length} pelis, ${series.length} series, ${books.length} libros`)

  const seenIds = new Set(existingItems.map((i) => i.id))
  const seenTitles = new Set(existingItems.map((i) => i.title.toLowerCase().trim()))

  // 2. Importar Películas (IMDb Top 1000)
  console.log('\nDescargando películas (IMDb Top 1000)...')
  try {
    const csvRes = await fetch('https://raw.githubusercontent.com/krishna-koly/IMDB_TOP_1000/main/imdb_top_1000.csv')
    const csvText = await csvRes.text()
    const rows = parseCSV(csvText).slice(1) // omitir header

    for (const r of rows) {
      if (movies.length >= 1000) break
      const rawPoster = r[0] || ''
      const title = r[1]
      const year = parseInt(r[2], 10)
      const dur = parseInt(r[4], 10) || 115
      const genres = (r[5] || 'Drama').split(',').map((g) => g.trim())
      const rating = parseFloat(r[6]) || 8.0
      const synopsis = r[7] || title
      const director = r[9] || 'Desconocido'

      if (!title || isNaN(year)) continue
      const titleLower = title.toLowerCase().trim()
      if (seenTitles.has(titleLower)) continue

      let slug = `movie:${slugify(title)}-${year}`
      if (seenIds.has(slug)) slug = `movie:${slugify(title)}-${year}-${movies.length}`

      const posterUrl = rawPoster.includes('images/M/')
        ? rawPoster.replace(/\._V1_.*\.jpg$/, '._V1_.jpg')
        : rawPoster || null

      const pop = Math.min(95, Math.max(50, Math.round(rating * 10)))

      movies.push({
        id: slug,
        type: 'movie',
        title,
        year,
        creator: director,
        durationMin: dur,
        genres,
        synopsis,
        posterUrl,
        platforms: ['Netflix', 'Prime Video'],
        popularity: pop,
      })
      seenIds.add(slug)
      seenTitles.add(titleLower)
    }
  } catch (err) {
    console.error('Error importando películas:', err.message)
  }
  console.log(`Películas totales: ${movies.length}`)

  // 3. Importar Series (TVMaze pages)
  console.log('\nDescargando series (TVMaze)...')
  try {
    for (let page = 0; page <= 6; page++) {
      if (series.length >= 1000) break
      const res = await fetch(`https://api.tvmaze.com/shows?page=${page}`)
      if (!res.ok) break
      const shows = await res.json()

      for (const show of shows) {
        if (series.length >= 1000) break
        const title = show.name
        if (!title) continue
        const titleLower = title.toLowerCase().trim()
        if (seenTitles.has(titleLower)) continue

        const year = parseInt((show.premiered || '').slice(0, 4), 10) || 2016
        const creator = show.network?.name || show.webChannel?.name || 'TV'
        const dur = show.averageRuntime || show.runtime || 45
        const genres = show.genres?.length ? show.genres : ['Drama']
        const synopsis = stripHtml(show.summary) || `Serie emitida en ${creator}.`
        const posterUrl = show.image?.original || show.image?.medium || null
        const pop = Math.min(95, Math.max(45, Math.round(show.weight || 65)))

        let slug = `series:${slugify(title)}-${year}`
        if (seenIds.has(slug)) slug = `series:${slugify(title)}-${year}-${series.length}`

        series.push({
          id: slug,
          type: 'series',
          title,
          year,
          creator,
          durationMin: dur,
          genres,
          synopsis,
          posterUrl,
          platforms: [creator.includes('Netflix') ? 'Netflix' : creator.includes('HBO') ? 'HBO Max' : 'Prime Video'],
          popularity: pop,
        })
        seenIds.add(slug)
        seenTitles.add(titleLower)
      }
    }
  } catch (err) {
    console.error('Error importando series:', err.message)
  }
  console.log(`Series totales: ${series.length}`)

  // 4. Importar Libros (Open Library Trending y Subjects)
  console.log('\nDescargando libros (Open Library)...')
  try {
    // 4.1 Trending
    const trendRes = await fetch('https://openlibrary.org/trending/yearly.json?limit=600')
    if (trendRes.ok) {
      const trendData = await trendRes.json()
      for (const w of trendData.works || []) {
        if (books.length >= 1000) break
        const title = w.title
        if (!title) continue
        const titleLower = title.toLowerCase().trim()
        if (seenTitles.has(titleLower)) continue

        const year = w.first_publish_year || 2005
        const creator = w.author_name?.[0] || 'Autor'
        const pages = w.number_of_pages_median || 320
        const coverId = w.cover_i
        const posterUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null
        const genres = ['Novela', 'Literatura']
        const pop = 85

        let slug = `book:${slugify(title)}-${year}`
        if (seenIds.has(slug)) slug = `book:${slugify(title)}-${year}-${books.length}`

        books.push({
          id: slug,
          type: 'book',
          title,
          year,
          creator,
          pages,
          depth: depthOf(pages, genres),
          genres,
          synopsis: `Obra de ${creator} publicada originalmente en ${year}.`,
          posterUrl,
          popularity: pop,
        })
        seenIds.add(slug)
        seenTitles.add(titleLower)
      }
    }

    // 4.2 Subjects temáticos para variedad (Ficción, Clásicos, Ensayo, Historia, Filosofía, Ciencia ficción)
    const subjects = [
      ['classic_literature', 'Clásico'],
      ['history', 'Historia'],
      ['philosophy', 'Ensayo'],
      ['science_fiction', 'Ciencia ficción'],
      ['thriller', 'Thriller'],
      ['fantasy', 'Fantasía'],
      ['biography', 'Biografía'],
    ]

    for (const [sub, genreTag] of subjects) {
      if (books.length >= 1000) break
      try {
        const subRes = await fetch(`https://openlibrary.org/subjects/${sub}.json?limit=120`)
        if (!subRes.ok) continue
        const subData = await subRes.json()
        for (const w of subData.works || []) {
          if (books.length >= 1000) break
          const title = w.title
          if (!title) continue
          const titleLower = title.toLowerCase().trim()
          if (seenTitles.has(titleLower)) continue

          const year = w.first_publish_year || 1990
          const creator = w.authors?.[0]?.name || 'Autor'
          const pages = 300
          const coverId = w.cover_id
          const posterUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null
          const genres = [genreTag, 'Literatura']
          const pop = Math.min(92, Math.max(50, Math.round(Math.log10(w.edition_count || 5) * 20 + 50)))

          let slug = `book:${slugify(title)}-${year}`
          if (seenIds.has(slug)) slug = `book:${slugify(title)}-${year}-${books.length}`

          books.push({
            id: slug,
            type: 'book',
            title,
            year,
            creator,
            pages,
            depth: depthOf(pages, genres),
            genres,
            synopsis: `Obra clásica de ${genreTag.toLowerCase()} escrita por ${creator}.`,
            posterUrl,
            popularity: pop,
          })
          seenIds.add(slug)
          seenTitles.add(titleLower)
        }
      } catch (e) {
        console.warn(`  Fallo en subject ${sub}:`, e.message)
      }
    }
  } catch (err) {
    console.error('Error importando libros:', err.message)
  }
  console.log(`Libros totales: ${books.length}`)

  // 5. Unir y normalizar todo el catálogo
  const allItems = [...movies, ...series, ...books]
  console.log(`\nTotal consolidado: ${allItems.length} obras`)

  // 6. Regenerar amigos simulados sobre el catálogo masivo
  console.log('Regenerando amigos simulados...')
  const byTitle = new Map(allItems.map((i) => [i.title, i]))
  const roundHalf = (x) => Math.round(x * 2) / 2

  const friends = FRIENDS.map((f) => {
    const rng = mulberry32(hashStr(f.id))
    const forced = new Map()
    for (const [title, score, comment] of COMMENTS[f.id] ?? []) {
      const it = byTitle.get(title)
      if (!it) {
        // Fallback suave si cambió ligeramente
        console.warn(`Comentario de ${f.name} para título no hallado directamente: «${title}»`)
        continue
      }
      forced.set(it.id, { itemId: it.id, status: 'seen', score, comment })
    }

    const interest = (it) =>
      it.genres.reduce((a, g) => a + (f.likes[g] ?? 0), 0) / Math.sqrt(it.genres.length || 1) +
      (f.typeBias[it.type] ?? 0) +
      it.popularity / 40 +
      (rng() - 0.5) * 2.2

    const ranked = allItems
      .filter((i) => !forced.has(i.id))
      .map((i) => [i, interest(i)])
      .sort((a, b) => b[1] - a[1])

    const nSeen = 120 + Math.floor(rng() * 61) // 120-180 vistas en total
    const nPending = 30 + Math.floor(rng() * 21) // 30-50 pendientes
    const seenExtra = ranked.slice(0, Math.max(0, nSeen - forced.size))
    const seenIds = new Set(seenExtra.map(([i]) => i.id))
    const pendPool = ranked.filter(([i]) => !seenIds.has(i.id)).slice(0, 100)
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

  // 7. Guardar seed.json final
  const seed = { version: 1, items: allItems, friends }
  writeFileSync(SEED_FILE, JSON.stringify(seed))
  const withPoster = allItems.filter((i) => i.posterUrl).length
  console.log(`\n¡seed.json generado con éxito!`)
  console.log(`  Items: ${allItems.length} (${movies.length} pelis, ${series.length} series, ${books.length} libros)`)
  console.log(`  Con portada real: ${withPoster}/${allItems.length} (${Math.round((withPoster / allItems.length) * 100)}%)`)
  for (const f of friends) {
    console.log(`  ${f.name}: ${f.entries.filter((e) => e.status === 'seen').length} vistas, ${f.entries.filter((e) => e.status === 'pending').length} pendientes`)
  }
}

run().catch(console.error)
