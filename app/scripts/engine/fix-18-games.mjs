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

const GAMES = [
  {
    id: 'boardgame:scout-2019',
    slug: 'scout-2019',
    bggId: 291453,
    title: 'SCOUT',
    imageUrl: 'https://cf.geekdo-images.com/cf0xxkevbwTGF3VUZymKjg__original/img/vkElrRCPJxy7Q3TH9olpq20egA4=/0x0/filters:format(png)/pic6398727.png'
  },
  {
    id: 'boardgame:ark-nova-2021',
    slug: 'ark-nova-2021',
    bggId: 342942,
    title: 'Ark Nova',
    imageUrl: 'https://cf.geekdo-images.com/SoU8p28Sk1s8MSvoM4N8pQ__original/img/g4S18szTdrXCdIwVKzMKrZrYAcM=/0x0/filters:format(jpeg)/pic6293412.jpg'
  },
  {
    id: 'boardgame:inis-2016',
    slug: 'inis-2016',
    bggId: 155821,
    title: 'Inis',
    imageUrl: 'https://cf.geekdo-images.com/6QE8mnPFmauoj2THsyUYPA__original/img/6bZdn1SNbpIqU7n5pwtncvdNE_U=/0x0/filters:format(jpeg)/pic4739757.jpg'
  },
  {
    id: 'boardgame:kemet-2012',
    slug: 'kemet-2012',
    bggId: 127023,
    title: 'Kemet',
    imageUrl: 'https://cf.geekdo-images.com/RmZjhy7_6REp8IaXh9Zqwg__original/img/kRFfkVnQRsBDcbO46TKS6PcT6aE=/0x0/filters:format(jpeg)/pic3979527.jpg'
  },
  {
    id: 'boardgame:cyclades-2009',
    slug: 'cyclades-2009',
    bggId: 54998,
    title: 'Cyclades',
    imageUrl: 'https://cf.geekdo-images.com/6QbaJOS8acWkJ6gSYI0KaQ__original/img/KOGjizqhVHXlKWxXkuyxkHRCNnA=/0x0/filters:format(jpeg)/pic584779.jpg'
  },
  {
    id: 'boardgame:love-letter-2019',
    slug: 'love-letter-2019',
    bggId: 277085,
    title: 'Love Letter',
    imageUrl: 'https://cf.geekdo-images.com/V7WQjhAh0AatPXTYOrXtCQ__original/img/peOFPtAkzWUSpOSVTJu3pTDv2ck=/0x0/filters:format(png)/pic4766499.png'
  },
  {
    id: 'boardgame:oath-2021',
    slug: 'oath-2021',
    bggId: 291572,
    title: 'Oath',
    imageUrl: 'https://cf.geekdo-images.com/gTxav_KKQK1rDg-XuCjCSA__original/img/lG-iXVzDlfFrD6VPggvg2WQ7228=/0x0/filters:format(jpeg)/pic5164812.jpg'
  },
  {
    id: 'boardgame:through-the-desert-1998',
    slug: 'through-the-desert-1998',
    bggId: 503,
    title: 'Through the Desert',
    imageUrl: 'https://cf.geekdo-images.com/Rq_hJIAO7jDgIpAW943hJA__original/img/9lIQGNwBYmAlsgXOI6Iw2Q2CIkA=/0x0/filters:format(jpeg)/pic7697747.jpg'
  },
  {
    id: 'boardgame:next-station-london-2022',
    slug: 'next-station-london-2022',
    bggId: 353545,
    title: 'Next Station: London',
    imageUrl: 'https://cf.geekdo-images.com/T-eq9Ux4gkmqfEXry8HC1w__original/img/FgPzhjwC0X0-6ZNLhowN8iccREA=/0x0/filters:format(jpeg)/pic9018430.jpg'
  },
  {
    id: 'boardgame:descent-journeys-in-the-dark-2005',
    slug: 'descent-journeys-in-the-dark-2005',
    bggId: 17226,
    title: 'Descent: Journeys in the Dark',
    imageUrl: 'https://cf.geekdo-images.com/915Abv-1k4_f_-__SkXybg__original/img/LEJxK0iifCkmJcX0uytGCk72v8M=/0x0/filters:format(jpeg)/pic249300.jpg'
  },
  {
    id: 'boardgame:villagers-2019',
    slug: 'villagers-2019',
    bggId: 241724,
    title: 'Villagers',
    imageUrl: 'https://cf.geekdo-images.com/rMMSvnXuBPZSihIaVtVT-A__original/img/PivWbEOFSDhHXl2NCHw8xSErORA=/0x0/filters:format(png)/pic4996383.png'
  },
  {
    id: 'boardgame:cards-against-humanity-2009',
    slug: 'cards-against-humanity-2009',
    bggId: 50381,
    title: 'Cards Against Humanity',
    imageUrl: 'https://cf.geekdo-images.com/nYLrPiI9gnvlrwOrKQ4_CA__original/img/EgMpdhoG38LUTApk0kyFFsmoQPk=/0x0/filters:format(jpeg)/pic2909692.jpg'
  },
  {
    id: 'boardgame:risk-1959',
    slug: 'risk-1959',
    bggId: 181,
    title: 'Risk',
    imageUrl: 'https://cf.geekdo-images.com/Oem1TTtSgxOghRFCoyWRPw__original/img/Nu3eXPyOkhtnR3hhpUrtgqRMAfs=/0x0/filters:format(jpeg)/pic4916782.jpg'
  },
  {
    id: 'boardgame:monopoly-1935',
    slug: 'monopoly-1935',
    bggId: 1406,
    title: 'Monopoly',
    imageUrl: 'https://cf.geekdo-images.com/9nGoBZ0MRbi6rdH47sj2Qg__original/img/bA8irydTCNlE38QSzM9EhcUIuNU=/0x0/filters:format(jpeg)/pic5786795.jpg'
  },
  {
    id: 'boardgame:exploding-kittens-2015',
    slug: 'exploding-kittens-2015',
    bggId: 172225,
    title: 'Exploding Kittens',
    imageUrl: 'https://cf.geekdo-images.com/N8bL53-pRU7zaXDTrEaYrw__original/img/0ciN1VZYifUd0qIDO0e8cGXmiss=/0x0/filters:format(png)/pic2691976.png'
  },
  {
    id: 'boardgame:trivial-pursuit-1981',
    slug: 'trivial-pursuit-1981',
    bggId: 2952,
    title: 'Trivial Pursuit',
    imageUrl: 'https://cf.geekdo-images.com/CSILODNknzqhsDxeP8jmgw__original/img/ipoGqNe4Dt7hAF3pzd5bxWnKoEQ=/0x0/filters:format(jpeg)/pic6912883.jpg'
  },
  {
    id: 'boardgame:cluedo-1949',
    slug: 'cluedo-1949',
    bggId: 1294,
    title: 'Cluedo',
    imageUrl: 'https://cf.geekdo-images.com/wNcbhLJGGjakYjjm1gV_kQ__original/img/Ji1MKh8gogtczoDecOi5D5yo9hQ=/0x0/filters:format(png)/pic7563466.png'
  },
  {
    id: 'boardgame:parchis-1900',
    slug: 'parchis-1900',
    bggId: 2136,
    title: 'Parchís',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Parchis.jpg'
  }
]

async function processFullBoardgame(buf) {
  // Mantener la caja COMPLETA sin recortes mutilantes.
  // Redimensionar para que encaje dentro de un bounding box de 700x700
  return await sharp(buf)
    .resize({ width: 700, height: 700, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer()
}

async function main() {
  console.log('--- Restaurando y corrigiendo las 18 carátulas canónicas de juegos ---')
  mkdirSync(COVERS_CACHE, { recursive: true })

  const orig = existsSync(ORIGINAL_FILE) ? JSON.parse(readFileSync(ORIGINAL_FILE, 'utf8')) : {}
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const itemMap = new Map(seed.items.map(i => [i.id, i]))

  for (const g of GAMES) {
    console.log(`\nProcesando ${g.title} (${g.id})...`)
    const res = await fetch(g.imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    })
    if (!res.ok) {
      console.error(`Error ${res.status} al descargar de ${g.imageUrl}`)
      continue
    }

    const rawBuf = Buffer.from(await res.arrayBuffer())
    const webpBuf = await processFullBoardgame(rawBuf)

    // Guardar en cache local
    const localPath = join(COVERS_CACHE, `${g.slug}.webp`)
    writeFileSync(localPath, webpBuf)

    // Subir a Supabase Storage
    const storagePath = `boardgame/${g.slug}.webp`
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

    // Usar ?v=3 para forzar refresco de caché
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}?v=3`
    console.log(`✓ ${g.title} actualizado -> ${publicUrl}`)

    orig[g.id] = g.imageUrl

    const posterEntry = {
      id: g.id,
      attr: 'posterUrl',
      value: publicUrl,
      src: g.imageUrl.includes('geekdo') ? 'bgg' : 'wikimedia',
      imageSrc: g.imageUrl.includes('geekdo') ? 'cf.geekdo-images.com' : 'upload.wikimedia.org',
      imageCredit: g.imageUrl.includes('geekdo') ? 'BoardGameGeek' : 'Wikimedia Commons',
      conf: 0.99,
      updatedAt: new Date().toISOString()
    }
    appendFileSync(ATTRS_POSTER_FILE, JSON.stringify(posterEntry) + '\n', 'utf8')

    const it = itemMap.get(g.id)
    if (it) {
      it.posterUrl = publicUrl
      it.imageSrc = posterEntry.imageSrc
      it.imageCredit = posterEntry.imageCredit
      it.bggId = g.bggId
      it.src = { ...(it.src || {}), posterUrl: posterEntry.src, bggId: 'bgg' }
    }
  }

  writeFileSync(ORIGINAL_FILE, JSON.stringify(orig, null, 2), 'utf8')
  writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), 'utf8')
  console.log('\n✓ Todo actualizado en original.json y seed.json con éxito.')
}

main().catch(console.error)
