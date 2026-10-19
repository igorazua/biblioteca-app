/**
 * Quita del seed las obras gemelas: la misma obra dos veces (título en español y en inglés) con el mismo Wikidata ID.
 * Se conserva la primera en el orden del seed (la del título en español) y el id de la otra queda como alias en
 * src/data/aliases.json, para que las entradas, listas y links antiguos sigan apuntando a la obra que queda.
 *
 * Idempotente: los alias ya existentes se mantienen. Se ejecuta al final de `npm run seed`.
 * Uso: node scripts/dedupe-twins.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SEED_FILE = join(here, '..', 'src', 'data', 'seed.json')
const ALIASES_FILE = join(here, '..', 'src', 'data', 'aliases.json')

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf-8'))
const aliases = existsSync(ALIASES_FILE) ? JSON.parse(readFileSync(ALIASES_FILE, 'utf-8')) : {}

const keeperByExt = new Map()
const kept = []
let removed = 0
for (const it of seed.items) {
  const key = it.wikidataId ? `${it.type}|${it.wikidataId}` : null
  const keeper = key ? keeperByExt.get(key) : undefined
  if (keeper) {
    // Mismo Wikidata ID pero distinto año = dos obras distintas con un ID mal puesto (Libertalia 2012 vs Winds of
    // Galecrest 2022): no se fusionan; la segunda pierde el ID, que se queda la primera.
    if (Math.abs((keeper.year ?? 0) - (it.year ?? 0)) > (it.type === 'series' ? 1 : 0)) {
      console.warn(`Wikidata ${it.wikidataId} repetido en obras distintas: ${keeper.id} / ${it.id} → se le quita a ${it.id}`)
      delete it.wikidataId
      if (it.tmdbId && it.tmdbId === keeper.tmdbId) delete it.tmdbId
      kept.push(it)
      continue
    }
    aliases[it.id] = keeper.id
    removed++
    continue
  }
  if (key) keeperByExt.set(key, it)
  kept.push(it)
}

// Segunda pasada: misma obra con distinto Wikidata ID (uno de los dos mal puesto), que tras poner los títulos de España
// coinciden en tipo, título y año («Band of Brothers» y «Hermanos de sangre», 2001). Se queda la que tiene portada y,
// si las dos la tienen, la primera.
const normTitle = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
const byTitle = new Map()
for (const it of kept) {
  const key = `${it.type}|${normTitle(it.title)}|${it.year}`
  const list = byTitle.get(key)
  if (list) list.push(it)
  else byTitle.set(key, [it])
}
const dropped = new Set()
for (const list of byTitle.values()) {
  if (list.length < 2) continue
  const keeper = list.find((it) => it.posterUrl) ?? list[0]
  for (const it of list) {
    if (it === keeper) continue
    // la que se va puede ser la que traía el título original (para casar imports en inglés)
    if (!keeper.originalTitle && it.originalTitle) keeper.originalTitle = it.originalTitle
    aliases[it.id] = keeper.id
    dropped.add(it.id)
    removed++
    console.log(`Misma obra con otro Wikidata ID: ${it.id} → ${keeper.id}`)
  }
}
if (dropped.size) kept.splice(0, kept.length, ...kept.filter((it) => !dropped.has(it.id)))

// un alias nunca apunta a otro alias
const canon = (id) => {
  let cur = id
  for (let i = 0; i < 5 && aliases[cur]; i++) cur = aliases[cur]
  return cur
}
for (const id of Object.keys(aliases)) aliases[id] = canon(id)

// amigos de prueba: sus entradas pasan a la obra que queda (si ya la tenían, se queda la suya)
let remapped = 0
for (const f of seed.friends ?? []) {
  const own = new Set(f.entries.filter((e) => canon(e.itemId) === e.itemId).map((e) => e.itemId))
  const seen = new Set()
  const out = []
  for (const e of f.entries) {
    const id = canon(e.itemId)
    if (id !== e.itemId && own.has(id)) continue
    if (seen.has(id)) continue
    seen.add(id)
    if (id !== e.itemId) remapped++
    out.push({ ...e, itemId: id })
  }
  f.entries = out
}

for (const it of kept) if (Array.isArray(it.related)) it.related = [...new Set(it.related.map(canon))].filter((r) => r !== it.id)

seed.items = kept
writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2))
writeFileSync(ALIASES_FILE, JSON.stringify(Object.fromEntries(Object.entries(aliases).sort()), null, 1) + '\n')
console.log(`Gemelas quitadas: ${removed} · alias totales: ${Object.keys(aliases).length} · entradas de amigos movidas: ${remapped}`)
