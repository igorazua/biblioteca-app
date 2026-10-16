import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SEED_FILE = join(here, '..', 'src', 'data', 'seed.json')

const slugify = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function cleanText(text) {
  if (!text) return ''
  return text
    .replace(/&#10;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function fetchTopBoardGames(targetCount = 1000) {
  console.log(`\n--- Descargando Top ${targetCount} Juegos de Mesa desde BGG (recommend.games API) ---`)
  const games = []
  const seenIds = new Set()
  const seenTitles = new Set()

  // 1. Fetch by BGG Rank
  let page = 1
  while (games.length < targetCount && page <= 45) {
    try {
      const url = `https://recommend.games/api/games/?bgg_rank__isnull=false&ordering=bgg_rank&page=${page}`
      console.log(`[BGG Rank] Descargando página ${page}...`)
      const res = await fetch(url, { headers: { 'User-Agent': 'BibliotecaApp/1.0' } })
      if (!res.ok) {
        console.warn(`Página ${page} devolvió status ${res.status}`)
        break
      }
      const data = await res.json()
      const results = data.results || []
      if (!results.length) break

      for (const g of results) {
        if (!g.name || !g.year) continue
        const titleLower = g.name.toLowerCase().trim()
        if (seenTitles.has(titleLower)) continue

        let slug = `boardgame:${slugify(g.name)}-${g.year}`
        if (seenIds.has(slug)) slug = `boardgame:${slugify(g.name)}-${g.year}-${g.bgg_id || games.length}`

        const designer = (g.designer_name || []).slice(0, 2).join(', ') || 'Varios autores'
        const minP = g.min_players || 2
        const maxP = g.max_players || 4
        const players = minP === maxP ? `${minP}` : `${minP}-${maxP}`
        const duration = g.min_time || g.max_time || 60
        const categories = (g.category_name || []).slice(0, 3)
        if (!categories.length) categories.push('Estrategia')

        const synopsis = g.description
          ? cleanText(g.description).slice(0, 280) + '...'
          : `Juego de mesa creado por ${designer} (${players} jugadores, ~${duration} min).`

        const posterUrl = g.image_url?.[0] || null
        const pop = Math.min(99, Math.max(50, Math.round((g.bayes_rating || 7.0) * 10)))

        games.push({
          id: slug,
          type: 'boardgame',
          title: g.name,
          year: g.year,
          creator: designer,
          durationMin: duration,
          players,
          genres: categories,
          synopsis,
          posterUrl,
          popularity: pop,
        })

        seenIds.add(slug)
        seenTitles.add(titleLower)
        if (games.length >= targetCount) break
      }

      page++
      await sleep(150)
    } catch (err) {
      console.error(`Error en página ${page}:`, err.message)
      await sleep(500)
      page++
    }
  }

  // 2. Fetch popular classics by num_votes to ensure Catan, Carcassonne, Risk, Monopoly, Chess, etc. are included
  console.log(`\nDescargando clásicos populares por número de votos...`)
  let votesPage = 1
  while (votesPage <= 8) {
    try {
      const url = `https://recommend.games/api/games/?ordering=-num_votes&page=${votesPage}`
      const res = await fetch(url, { headers: { 'User-Agent': 'BibliotecaApp/1.0' } })
      if (!res.ok) break
      const data = await res.json()
      const results = data.results || []

      for (const g of results) {
        if (!g.name || !g.year) continue
        const titleLower = g.name.toLowerCase().trim()
        if (seenTitles.has(titleLower)) continue

        let slug = `boardgame:${slugify(g.name)}-${g.year}`
        if (seenIds.has(slug)) slug = `boardgame:${slugify(g.name)}-${g.year}-${g.bgg_id || games.length}`

        const designer = (g.designer_name || []).slice(0, 2).join(', ') || 'Varios autores'
        const minP = g.min_players || 2
        const maxP = g.max_players || 4
        const players = minP === maxP ? `${minP}` : `${minP}-${maxP}`
        const duration = g.min_time || g.max_time || 60
        const categories = (g.category_name || []).slice(0, 3)
        if (!categories.length) categories.push('Clásico')

        const synopsis = g.description
          ? cleanText(g.description).slice(0, 280) + '...'
          : `Juego de mesa clásico (${players} jugadores, ~${duration} min).`

        const posterUrl = g.image_url?.[0] || null
        const pop = Math.min(99, Math.max(50, Math.round((g.bayes_rating || 7.0) * 10)))

        games.push({
          id: slug,
          type: 'boardgame',
          title: g.name,
          year: g.year,
          creator: designer,
          durationMin: duration,
          players,
          genres: categories,
          synopsis,
          posterUrl,
          popularity: pop,
        })

        seenIds.add(slug)
        seenTitles.add(titleLower)
      }

      votesPage++
      await sleep(150)
    } catch (err) {
      break
    }
  }

  console.log(`Total juegos de mesa importados: ${games.length} (${games.filter((g) => g.posterUrl).length} con portada real)`)
  return games
}

async function run() {
  const games = await fetchTopBoardGames(1000)
  const currentSeed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const otherItems = (currentSeed.items || []).filter((i) => i.type !== 'boardgame')
  currentSeed.items = [...otherItems, ...games]
  writeFileSync(SEED_FILE, JSON.stringify(currentSeed))
  console.log(`seed.json actualizado con ${games.length} juegos de mesa!`)
}

run().catch(console.error)
