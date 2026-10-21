/**
 * enrich-boardgames.mjs — Atributos nuevos para juegos de mesa (MOTOR v2 §2b.2, T13).
 *
 * Atributos:
 *   - weight: complejidad / peso en escala 1.0 - 5.0 (BGG)
 *   - minAge: edad mínima recomendada
 *   - cooperative: si es juego cooperativo o competitivo
 *   - mechanics: mecánicas clave (colocación de trabajadores, construcción de mazos, etc.)
 *
 * Uso:
 *   node scripts/engine/enrich-boardgames.mjs [--apply]
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')

const args = process.argv.slice(2)
const DO_APPLY = args.includes('--apply')

// Juegos cooperativos conocidos
const COOPERATIVE_TITLES = new Set([
  'pandemic',
  'pandemic legacy: season 1',
  'pandemic legacy: season 2',
  'pandemic legacy: season 0',
  'gloomhaven',
  'gloomhaven: jaws of the lion',
  'spirit island',
  'arkham horror',
  'arkham horror: the card game',
  'eldritch horror',
  'mansions of madness',
  'the crew: the quest for planet nine',
  'the crew: mission deep sea',
  'la tripulación',
  'hanabi',
  'the mind',
  'micromacro: crime city',
  'paleo',
  'robinson crusoe: adventures on the cursed island',
  'robinson crusoe',
  'just one',
  'la isla prohibida',
  'el desierto prohibido',
  'forbidden island',
  'forbidden desert',
  'flash point: fire rescue',
  'rescate',
  'marvel champions: the card game',
  'el señor de los anillos: viajes por la tierra media',
  'sherlock holmes: detective asesor',
  'sherlock holmes detective asesor',
  'zombicide',
  'dead of winter',
  'mysterium',
  'sub terra',
  'magic maze',
  'so clover!',
  'sprawlopolis',
  'exit: the game',
  'unlock!',
  'time stories',
  'kitchen rush',
  'space alert',
  'mechs vs. minions',
  'too many bones',
  'aeon\'s end',
  'nemesis',
])

// Pesos BGG exactos para los más populares y representativos
const CURATED_WEIGHTS = new Map([
  ['boardgame:brass-birmingham-2018', 3.9],
  ['boardgame:ark-nova-2021', 3.7],
  ['boardgame:gloomhaven-2017', 3.9],
  ['boardgame:pandemic-legacy-season-1-2015', 2.8],
  ['boardgame:terraforming-mars-2016', 3.3],
  ['boardgame:dune-imperium-2020', 3.0],
  ['boardgame:scythe-2016', 3.4],
  ['boardgame:spirit-island-2017', 4.1],
  ['boardgame:root-2018', 3.8],
  ['boardgame:everdell-2018', 2.8],
  ['boardgame:wingspan-2019', 2.5],
  ['boardgame:azul-2017', 1.8],
  ['boardgame:cascadia-2021', 2.0],
  ['boardgame:7-wonders-duel-2015', 2.2],
  ['boardgame:7-wonders-2010', 2.3],
  ['boardgame:catan-1995', 2.3],
  ['boardgame:carcassonne-2000', 1.9],
  ['boardgame:ticket-to-ride-2004', 1.9],
  ['boardgame:aventureros-al-tren-2004', 1.9],
  ['boardgame:dixit-2008', 1.2],
  ['boardgame:codigo-secreto-2015', 1.4],
  ['boardgame:codenames-2015', 1.4],
  ['boardgame:virus-2015', 1.1],
  ['boardgame:dobble-2009', 1.1],
  ['boardgame:jungle-speed-1997', 1.1],
  ['boardgame:exploding-kittens-2015', 1.1],
  ['boardgame:uno-1971', 1.1],
  ['boardgame:monopoly-1935', 1.7],
  ['boardgame:cluedo-1949', 1.7],
  ['boardgame:risk-1959', 2.1],
  ['boardgame:scrabble-1948', 2.1],
  ['boardgame:trivial-pursuit-1981', 1.9],
  ['boardgame:tabu-1989', 1.2],
  ['boardgame:party-co-1989', 1.2],
  ['boardgame:pictionary-1985', 1.1],
  ['boardgame:ajedrez-1475', 3.7],
  ['boardgame:chess-1475', 3.7],
  ['boardgame:parchis-1800', 1.3],
  ['boardgame:domino-1120', 1.7],
  ['boardgame:damas-1100', 1.8],
  ['boardgame:conecta-4-1974', 1.2],
  ['boardgame:hundir-la-flota-1931', 1.2],
  ['boardgame:jenga-1983', 1.1],
])

function normalizeTitle(t) {
  return (t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[«»""''¿?¡!,.:;\-—_()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function calcWeight(item) {
  if (CURATED_WEIGHTS.has(item.id)) {
    return { weight: CURATED_WEIGHTS.get(item.id), src: 'bgg' }
  }

  const d = item.durationMin || 45
  let baseWeight = 2.0
  if (d <= 20) baseWeight = 1.1
  else if (d <= 35) baseWeight = 1.4
  else if (d <= 55) baseWeight = 1.9
  else if (d <= 80) baseWeight = 2.5
  else if (d <= 110) baseWeight = 3.1
  else if (d <= 150) baseWeight = 3.6
  else baseWeight = 4.0

  return { weight: Math.round(baseWeight * 10) / 10, src: 'computed' }
}

function calcMinAge(weight) {
  if (weight < 1.3) return 6
  if (weight < 1.8) return 8
  if (weight < 2.6) return 10
  if (weight < 3.4) return 12
  return 14
}

function isCoop(title) {
  const norm = normalizeTitle(title)
  for (const coop of COOPERATIVE_TITLES) {
    if (norm === coop || norm.includes(coop)) return true
  }
  return false
}

function inferMechanics(item, isCoopVal) {
  const mechs = []
  if (isCoopVal) mechs.push('Cooperativo')

  const gStr = (item.genres || []).join(' ').toLowerCase()
  const syn = (item.synopsis || '').toLowerCase()

  if (gStr.includes('carta') || syn.includes('carta') || syn.includes('mazo')) {
    mechs.push('Gestión de mano')
  }
  if (gStr.includes('económico') || syn.includes('dinero') || syn.includes('comercio') || syn.includes('mercado')) {
    mechs.push('Gestión económica')
  }
  if (gStr.includes('construcción') || syn.includes('loseta') || syn.includes('construir')) {
    mechs.push('Colocación de losetas')
  }
  if (gStr.includes('civilización') || gStr.includes('guerra') || gStr.includes('wargame') || syn.includes('territorio') || syn.includes('control')) {
    mechs.push('Control de área')
  }
  if (gStr.includes('deducción') || gStr.includes('fiesta') || syn.includes('pistas') || syn.includes('identidad') || syn.includes('roles')) {
    mechs.push('Deducción')
  }
  if (syn.includes('dado') || gStr.includes('dice')) {
    mechs.push('Tirada de dados')
  }
  if (syn.includes('trabajador') || syn.includes('colocación')) {
    mechs.push('Colocación de trabajadores')
  }

  if (mechs.length === 0) {
    mechs.push('Estrategia')
  }

  return Array.from(new Set(mechs)).slice(0, 4)
}

async function main() {
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const bgs = seed.items.filter((i) => i.type === 'boardgame')
  console.log(`\n=== ENRIQUECEDOR DE JUEGOS DE MESA (T13) ===`)
  console.log(`Total juegos: ${bgs.length}`)

  let coopCount = 0
  for (const b of bgs) {
    const wInfo = calcWeight(b)
    b.weight = wInfo.weight
    b.minAge = calcMinAge(b.weight)
    b.cooperative = isCoop(b.title)
    b.mechanics = inferMechanics(b, b.cooperative)
    if (b.cooperative) coopCount++

    b.src = b.src || {}
    b.src.weight = wInfo.src
    b.src.minAge = 'computed'
    b.src.cooperative = 'curated'
    b.src.mechanics = 'computed'
  }

  console.log(`Resultados:`)
  console.log(`  - Juegos cooperativos : ${coopCount} (${((coopCount / bgs.length) * 100).toFixed(1)}%)`)
  console.log(`  - Juegos competitivos : ${bgs.length - coopCount}`)
  console.log(`  - Peso, edad mínima y mecánicas asignados al 100% (${bgs.length}/${bgs.length})`)

  if (DO_APPLY) {
    writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), 'utf8')
    console.log(`✓ seed.json actualizado con weight, minAge, cooperative y mechanics en ${bgs.length} juegos`)
  }
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
