import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
const items = seed.items || []
const itemMap = new Map(items.map((i) => [i.id, i]))

// 1. Corregir QIDs existentes
const titanic = itemMap.get('movie:titanic-1997')
if (titanic) {
  titanic.wikidataId = 'Q44578'
  titanic.src = titanic.src || {}
  titanic.src.wikidataId = 'wikidata'
  console.log('✓ Titanic QID corregido a Q44578')
}

const friends = itemMap.get('series:friends-1994')
if (friends) {
  friends.wikidataId = 'Q79784'
  friends.src = friends.src || {}
  friends.src.wikidataId = 'wikidata'
  console.log('✓ Friends QID corregido a Q79784')
}

const catan = itemMap.get('boardgame:catan-1995')
if (catan) {
  catan.wikidataId = 'Q17271'
  catan.src = catan.src || {}
  catan.src.wikidataId = 'wikidata'
  console.log('✓ Catan QID corregido a Q17271')
}

const chess = itemMap.get('boardgame:chess-1475')
if (chess) {
  chess.titles = chess.titles || {}
  chess.titles['es-ES'] = 'Ajedrez'
  chess.title = 'Ajedrez'
  console.log('✓ Ajedrez títulos actualizados')
}

// 2. Añadir obras Tier 1 faltantes
const toAdd = [
  {
    id: 'movie:harry-potter-and-the-philosopher-s-stone-2001',
    type: 'movie',
    title: 'Harry Potter y la piedra filosofal',
    year: 2001,
    creator: 'Chris Columbus',
    durationMin: 152,
    genres: ['Fantasía', 'Aventura', 'Familiar'],
    synopsis: 'Harry Potter y la piedra filosofal es una película británica-estadounidense de fantasía y aventuras dirigida por Chris Columbus.',
    posterUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Harry-potter-and-the-sorcerers-stone-logo_%28cropped%29.svg/330px-Harry-potter-and-the-sorcerers-stone-logo_%28cropped%29.svg.png',
    wikidataId: 'Q102438',
    originCountry: ['GB', 'US'],
    originalLanguage: 'en',
    titles: { 'es-ES': 'Harry Potter y la piedra filosofal' },
    isCanon: true,
    src: { wikidataId: 'wikidata', originCountry: 'wikidata', originalLanguage: 'wikidata', isCanon: 'computed', titles: 'localized' },
    conf: { originCountry: 0.99, originalLanguage: 0.99, isCanon: 0.95 },
  },
  {
    id: 'boardgame:parchis-1900',
    type: 'boardgame',
    title: 'Parchís',
    year: 1900,
    creator: 'Tradicional',
    durationMin: 45,
    players: '2-4',
    genres: ['Clásico', 'Familiar', 'Carreras'],
    synopsis: 'El parchís es la adaptación española del juego de mesa de origen indio pachisi, similar al ludo. Es inmensamente popular en España y otros países hispanohablantes.',
    posterUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Parch%C3%ADs.svg/330px-Parch%C3%ADs.svg.png',
    wikidataId: 'Q945556',
    originCountry: ['ES'],
    originalLanguage: 'es',
    titles: { 'es-ES': 'Parchís' },
    isCanon: true,
    weight: 1.2,
    minAge: 6,
    cooperative: false,
    mechanics: ['Carreras', 'Tirada de dados'],
    src: { wikidataId: 'wikidata', originCountry: 'wikidata', originalLanguage: 'wikidata', isCanon: 'computed', titles: 'localized' },
    conf: { originCountry: 0.99, originalLanguage: 0.99, isCanon: 0.95 },
  },
  {
    id: 'boardgame:trivial-pursuit-1981',
    type: 'boardgame',
    title: 'Trivial Pursuit',
    year: 1981,
    creator: 'Scott Abbott y Chris Haney',
    durationMin: 90,
    players: '2-6',
    genres: ['Preguntas', 'Familiar', 'Cultura'],
    synopsis: 'El Trivial Pursuit es un juego de mesa clásico de preguntas y respuestas sobre cultura general y conocimientos específicos dividido en 6 categorías.',
    posterUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Trivial_Pursuit_icon.png',
    wikidataId: 'Q17250',
    originCountry: ['CA'],
    originalLanguage: 'en',
    titles: { 'es-ES': 'Trivial Pursuit' },
    isCanon: true,
    weight: 1.6,
    minAge: 12,
    cooperative: false,
    mechanics: ['Preguntas y respuestas', 'Tirada y movimiento'],
    src: { wikidataId: 'wikidata', originCountry: 'wikidata', originalLanguage: 'wikidata', isCanon: 'computed', titles: 'localized' },
    conf: { originCountry: 0.99, originalLanguage: 0.99, isCanon: 0.95 },
  },
  {
    id: 'boardgame:cluedo-1949',
    type: 'boardgame',
    title: 'Cluedo',
    year: 1949,
    creator: 'Anthony E. Pratt',
    durationMin: 45,
    players: '3-6',
    genres: ['Misterio', 'Deducción', 'Familiar'],
    synopsis: 'Cluedo es un célebre juego de mesa de misterio y deducción donde los jugadores investigan quién mató al Dr. Black (o Mr. Boddy), en qué habitación y con qué arma.',
    posterUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Cluedo_Clue_pack_logo.png/330px-Cluedo_Clue_pack_logo.png',
    wikidataId: 'Q17245',
    originCountry: ['GB'],
    originalLanguage: 'en',
    titles: { 'es-ES': 'Cluedo' },
    isCanon: true,
    weight: 1.7,
    minAge: 8,
    cooperative: false,
    mechanics: ['Deducción', 'Movimiento'],
    src: { wikidataId: 'wikidata', originCountry: 'wikidata', originalLanguage: 'wikidata', isCanon: 'computed', titles: 'localized' },
    conf: { originCountry: 0.99, originalLanguage: 0.99, isCanon: 0.95 },
  },
]

for (const add of toAdd) {
  if (!itemMap.has(add.id)) {
    seed.items.push(add)
    itemMap.set(add.id, add)
    console.log(`✓ Añadido al catálogo: ${add.id} (${add.title})`)
  } else {
    // Si ya existe, asegurar wikidataId
    const existing = itemMap.get(add.id)
    existing.wikidataId = add.wikidataId
    console.log(`✓ Actualizado existente: ${add.id}`)
  }
}

writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), 'utf8')
console.log('✓ seed.json guardado con éxito.')
