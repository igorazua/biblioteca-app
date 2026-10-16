// Prueba de ingesta masiva
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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

async function testFetch() {
  console.log('1. Probando CSV IMDb Top 1000...')
  const csvRes = await fetch('https://raw.githubusercontent.com/krishna-koly/IMDB_TOP_1000/main/imdb_top_1000.csv')
  const csvText = await csvRes.text()
  const rows = parseCSV(csvText)
  console.log(`  Filas parseadas: ${rows.length}`)
  const header = rows[0]
  console.log(`  Cabecera:`, header)
  const first = rows[1]
  console.log(`  Primera peli:`, first[1], first[2], first[9], first[0].slice(0, 50))

  console.log('2. Probando TVMaze...')
  const tvRes = await fetch('https://api.tvmaze.com/shows?page=0')
  const shows = await tvRes.json()
  console.log(`  Shows en página 0: ${shows.length}, Primer show: ${shows[0].name}`)

  console.log('3. Probando Open Library trending...')
  const olRes = await fetch('https://openlibrary.org/trending/yearly.json?limit=20')
  const olData = await olRes.json()
  console.log(`  Libros trending: ${olData.works?.length}, Primer libro: ${olData.works?.[0]?.title}`)
}

testFetch().catch(console.error)
