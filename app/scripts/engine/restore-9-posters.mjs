import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const ORIGINAL_FILE = join(ROOT, 'scripts', 'cache', 'posters', 'original.json')
const ATTRS_POSTER_FILE = join(ROOT, 'scripts', 'cache', 'attrs', 'posterUrl.jsonl')
const COVERS_CACHE = join(ROOT, 'scripts', 'cache', 'covers')

// Cargar variables de entorno de .env.local
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

const POSTERS_TO_ADD = {
  'movie:soorarai-pottru-2020': 'https://m.media-amazon.com/images/M/MV5BZTU5NTNmMjAtODM0Mi00YzU5LTk1OWQtZWU1NzZhMzBjYjY1XkEyXkFqcGc@._V1_.jpg',
  'movie:kami-kodomo-no-ame-to-yuki-2012': 'https://m.media-amazon.com/images/M/MV5BNzk2NjdmODgtZGRkZS00YTQwLThkOGItYTk5NWIyMzg3OWQ1XkEyXkFqcGc@._V1_.jpg',
  'movie:t-ky-goddof-z-zu-2003': 'https://m.media-amazon.com/images/M/MV5BNmEzNDcwYzQtMzM0Zi00YWYxLTkzOWEtY2Y0ZTJiNDVjM2NkXkEyXkFqcGc@._V1_.jpg',
  'series:elite-2018': 'https://static.tvmaze.com/uploads/images/original_untouched/529/1324751.jpg',
  'series:puente-de-resund-2011': 'https://static.tvmaze.com/uploads/images/original_untouched/11/27700.jpg',
  'series:heartstopper-2022': 'https://static.tvmaze.com/uploads/images/original_untouched/632/1580747.jpg',
  'series:misa-de-medianoche-2021': 'https://static.tvmaze.com/uploads/images/original_untouched/354/885283.jpg',
  'book:el-hombre-en-busca-de-sentido-1946': 'https://covers.openlibrary.org/b/isbn/9788425432026-L.jpg',
  'book:el-legado-en-los-huesos-2013': 'https://covers.openlibrary.org/b/isbn/9788423347148-L.jpg',
}

const TARGET_IDS = [
  'movie:soorarai-pottru-2020',
  'movie:kami-kodomo-no-ame-to-yuki-2012',
  'movie:t-ky-goddof-z-zu-2003',
  'series:elite-2018',
  'series:puente-de-resund-2011',
  'series:heartstopper-2022',
  'series:misa-de-medianoche-2021',
  'book:el-hombre-en-busca-de-sentido-1946',
  'book:el-legado-en-los-huesos-2013',
]

async function main() {
  console.log('--- Restaurando las 9 portadas restantes (T20.6) ---')

  const orig = existsSync(ORIGINAL_FILE) ? JSON.parse(readFileSync(ORIGINAL_FILE, 'utf8')) : {}
  for (const [k, v] of Object.entries(POSTERS_TO_ADD)) {
    orig[k] = v
  }
  writeFileSync(ORIGINAL_FILE, JSON.stringify(orig, null, 2), 'utf8')
  console.log('✓ original.json actualizado con las 4 URLs que faltaban.')

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const itemMap = new Map(seed.items.map((i) => [i.id, i]))

  for (const id of TARGET_IDS) {
    const it = itemMap.get(id)
    if (!it) {
      console.warn(`Obra no encontrada en seed: ${id}`)
      continue
    }

    const imgUrl = orig[id]
    if (!imgUrl) {
      console.warn(`No hay URL en original.json para ${id}`)
      continue
    }

    console.log(`Descargando imagen para ${id} desde ${imgUrl}...`)
    const res = await fetch(imgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) {
      console.error(`Error HTTP ${res.status} descargando ${imgUrl}`)
      continue
    }

    const rawBuf = Buffer.from(await res.arrayBuffer())
    const meta = await sharp(rawBuf).metadata()
    const ratio = meta.height / meta.width
    console.log(`  Dimensiones: ${meta.width}x${meta.height}, ratio: ${ratio.toFixed(2)}`)

    let pipeline = sharp(rawBuf)
    if (ratio < 1.30) {
      const targetRatio = 1.45
      const targetWidth = Math.floor(meta.height / targetRatio)
      const cropX = Math.max(0, Math.floor((meta.width - targetWidth) / 2))
      console.log(`  ✂️ Ajustando encuadre horizontal: cropX=${cropX}, targetWidth=${targetWidth}`)
      pipeline = pipeline.extract({ left: cropX, top: 0, width: targetWidth, height: meta.height })
    } else if (ratio > 1.65) {
      const targetRatio = 1.45
      const targetHeight = Math.floor(meta.width * targetRatio)
      const cropY = Math.max(0, Math.floor((meta.height - targetHeight) / 2))
      console.log(`  ✂️ Ajustando encuadre vertical: cropY=${cropY}, targetHeight=${targetHeight}`)
      pipeline = pipeline.extract({ left: 0, top: cropY, width: meta.width, height: targetHeight })
    }

    // Convertir a WebP 600px calidad 82
    const webpBuf = await pipeline
      .resize({ width: 600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()

    const checkMeta = await sharp(webpBuf).metadata()
    const finalRatio = checkMeta.height / checkMeta.width
    console.log(`  Procesado final: ${checkMeta.width}x${checkMeta.height}, ratio: ${finalRatio.toFixed(2)}`)

    const shelf = it.type
    const slug = id.replace(/^[^:]+:/, '')
    const storagePath = `${shelf}/${slug}.webp`

    // Guardar en caché local
    const localDir = join(COVERS_CACHE, shelf)
    mkdirSync(localDir, { recursive: true })
    writeFileSync(join(localDir, `${slug}.webp`), webpBuf)

    // Subir a Supabase Storage
    console.log(`  Subiendo a Supabase Storage: ${BUCKET}/${storagePath}...`)
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(storagePath, webpBuf, {
      contentType: 'image/webp',
      upsert: true,
    })

    if (uploadErr) {
      console.error(`  Error subiendo a Supabase: ${uploadErr.message}`)
      continue
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    const finalPosterUrl = `${publicData.publicUrl}?v=2`
    const domain = new URL(imgUrl).hostname

    // Añadir a posterUrl.jsonl
    const record = {
      id,
      value: finalPosterUrl,
      src: `scrape:${domain}`,
      imageSrc: domain,
      conf: 0.95,
      at: new Date().toISOString().slice(0, 10),
    }

    appendFileSync(ATTRS_POSTER_FILE, JSON.stringify(record) + '\n', 'utf8')
    console.log(`  ✓ Portada restaurada con éxito: ${finalPosterUrl}`)
  }

  console.log('\n✓ Proceso de restauración completado.')
}

main().catch(console.error)
