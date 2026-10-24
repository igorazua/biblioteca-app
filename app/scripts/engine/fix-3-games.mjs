import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const ORIGINAL_FILE = join(ROOT, 'scripts', 'cache', 'posters', 'original.json')
const ATTRS_POSTER_FILE = join(ROOT, 'scripts', 'cache', 'attrs', 'posterUrl.jsonl')
const COVERS_CACHE = join(ROOT, 'scripts', 'cache', 'covers', 'boardgame')

// Cargar .env.local
const envFile = join(ROOT, '.env.local')
if (existsSync(envFile)) {
  const envContent = readFileSync(envFile, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx !== -1) {
      const k = trimmed.slice(0, idx).trim()
      const v = trimmed.slice(idx + 1).trim()
      if (!process.env[k]) process.env[k] = v
    }
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan variables de entorno Supabase.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const BUCKET = 'biblio-covers'

const FIXES = [
  {
    id: 'boardgame:cluedo-1949',
    slug: 'cluedo-1949',
    bggId: 1293,
    wikidataId: 'Q172460',
    title: 'Cluedo',
    synopsis: 'Cluedo es un célebre juego de mesa de misterio y deducción donde los jugadores investigan quién mató al Dr. Black (o Mr. Boddy), en qué habitación y con qué arma.',
    bggImageUrl: 'https://cf.geekdo-images.com/jR4zuBwYotmqMHJonOBGDw__large/img/y9DV_80z6RkuvWzgcClNYkgk0AM=/fit-in/1024x1024/filters:no_upscale():strip_icc()/pic9849426.png'
  },
  {
    id: 'boardgame:trivial-pursuit-1981',
    slug: 'trivial-pursuit-1981',
    bggId: 2950,
    wikidataId: 'Q172440',
    title: 'Trivial Pursuit',
    synopsis: 'Trivial Pursuit es el clásico juego de preguntas y respuestas donde los jugadores compiten por rellenar su ficha con los seis quesitos de colores respondiendo preguntas de cultura general.',
    bggImageUrl: 'https://cf.geekdo-images.com/Oh-I6SK5WnAuc9CHfYfGOw__large/img/vGJ0lmTR524fzRArLCeSwETN_2E=/fit-in/1024x1024/filters:no_upscale():strip_icc()/pic5063488.jpg'
  },
  {
    id: 'boardgame:parchis-1900',
    slug: 'parchis-1900',
    bggId: 2139,
    wikidataId: 'Q1139414',
    title: 'Parchís',
    synopsis: 'El parchís es un clásico juego de carreras derivado del pachisi. Muy popular en España e Hispanoamérica, se juega con un dado y cuatro fichas por jugador con el objetivo de llevarlas todas a la casilla final.',
    bggImageUrl: 'https://cf.geekdo-images.com/6v2je4z9SK-3do_zttpZJw__large/img/WU0YIbMZj-74kKqJvZ8MY5ihfsg=/fit-in/1024x1024/filters:no_upscale():strip_icc()/pic7633465.jpg'
  }
]

async function processBoardgameBuffer(buf) {
  const meta = await sharp(buf).metadata()
  if (!meta || !meta.width || !meta.height) return null
  const initialRatio = meta.height / meta.width

  let pipeline = sharp(buf)
  if (initialRatio < 0.70 && initialRatio >= 0.40) {
    const targetRatio = 0.705
    const targetWidth = Math.floor(meta.height / targetRatio)
    const cropX = Math.max(0, Math.floor((meta.width - targetWidth) / 2))
    pipeline = pipeline.extract({ left: cropX, top: 0, width: targetWidth, height: meta.height })
  } else if (initialRatio > 1.50 && initialRatio <= 2.50) {
    const targetRatio = 1.495
    const targetHeight = Math.floor(meta.width * targetRatio)
    const cropY = Math.max(0, Math.floor((meta.height - targetHeight) / 2))
    pipeline = pipeline.extract({ left: 0, top: cropY, width: meta.width, height: targetHeight })
  }

  return await pipeline.resize({ width: 600, fit: 'inside' }).webp({ quality: 82 }).toBuffer()
}

async function main() {
  console.log('--- Corrigiendo Cluedo, Trivial Pursuit y Parchís ---')
  mkdirSync(COVERS_CACHE, { recursive: true })

  const orig = existsSync(ORIGINAL_FILE) ? JSON.parse(readFileSync(ORIGINAL_FILE, 'utf8')) : {}
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const itemMap = new Map(seed.items.map(i => [i.id, i]))

  for (const item of FIXES) {
    console.log(`\nProcesando ${item.title} (${item.id})...`)
    const res = await fetch(item.bggImageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) {
      console.error(`Error ${res.status} al descargar imagen de ${item.title}`)
      continue
    }

    const rawBuf = Buffer.from(await res.arrayBuffer())
    const webpBuf = await processBoardgameBuffer(rawBuf)
    if (!webpBuf) {
      console.error(`Error procesando buffer de ${item.title}`)
      continue
    }

    // Guardar en cache local
    const localPath = join(COVERS_CACHE, `${item.slug}.webp`)
    writeFileSync(localPath, webpBuf)
    console.log(`✓ Guardado localmente en ${localPath}`)

    // Subir a Supabase Storage
    const storagePath = `boardgame/${item.slug}.webp`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, webpBuf, {
        contentType: 'image/webp',
        upsert: true
      })

    if (uploadError) {
      console.error(`Error subiendo a Supabase:`, uploadError)
      continue
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}?v=2`
    console.log(`✓ Subido a Supabase: ${publicUrl}`)

    // Actualizar original.json
    orig[item.id] = item.bggImageUrl

    // Actualizar attrs/posterUrl.jsonl
    const posterEntry = {
      id: item.id,
      attr: 'posterUrl',
      value: publicUrl,
      src: 'bgg',
      imageSrc: 'cf.geekdo-images.com',
      imageCredit: 'BoardGameGeek',
      conf: 0.99,
      updatedAt: new Date().toISOString()
    }
    appendFileSync(ATTRS_POSTER_FILE, JSON.stringify(posterEntry) + '\n', 'utf8')

    // Actualizar seed.json en memoria
    const it = itemMap.get(item.id)
    if (it) {
      it.posterUrl = publicUrl
      it.imageSrc = 'cf.geekdo-images.com'
      it.imageCredit = 'BoardGameGeek'
      it.bggId = item.bggId
      it.wikidataId = item.wikidataId
      it.synopsis = item.synopsis
      it.src = {
        ...(it.src || {}),
        posterUrl: 'bgg',
        synopsis: 'curated',
        wikidataId: 'wikidata',
        bggId: 'bgg'
      }
      it.conf = {
        ...(it.conf || {}),
        posterUrl: 0.99,
        wikidataId: 1
      }
    }
  }

  // Guardar original.json
  writeFileSync(ORIGINAL_FILE, JSON.stringify(orig, null, 2), 'utf8')
  console.log('\n✓ original.json actualizado.')

  // Guardar seed.json
  writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), 'utf8')
  console.log('✓ seed.json actualizado con las portadas y datos corregidos.')
}

main().catch(console.error)
