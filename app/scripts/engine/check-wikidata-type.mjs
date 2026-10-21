// Uso: node scripts/engine/check-wikidata-type.mjs src/data/seed.json scripts/cache/wikidata-tipo-equivocado.json
// Comprueba que el wikidataId de cada obra sea del tipo correcto (P31/P279*) para su categoría.
import { readFileSync, writeFileSync } from 'node:fs'
const seed = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const ROOTS = {
  movie: ['Q11424'],
  series: ['Q5398426', 'Q526877', 'Q1259759'],
  book: ['Q47461344', 'Q7725634', 'Q571'],
  boardgame: ['Q11410'],
  artist: ['Q5', 'Q2088357', 'Q215380'],
}
const out = {}
for (const [type, roots] of Object.entries(ROOTS)) {
  const items = seed.items.filter((i) => i.type === type && i.wikidataId)
  const ok = new Set()
  for (let k = 0; k < items.length; k += 150) {
    const chunk = items.slice(k, k + 150)
    const vals = chunk.map((i) => 'wd:' + i.wikidataId).join(' ')
    const rootVals = roots.map((r) => 'wd:' + r).join(' ')
    const q = `SELECT DISTINCT ?item WHERE { VALUES ?item { ${vals} } VALUES ?root { ${rootVals} } ?item wdt:P31/wdt:P279* ?root . }`
    let j = null
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const r = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), {
          headers: { 'User-Agent': 'biblioteca-app-check/0.2 (igorazua@gmail.com)', Accept: 'application/sparql-results+json' },
        })
        if (r.status === 429 || r.status >= 500) {
          const waitMs = attempt * 3000
          console.warn(`[SPARQL 429/5xx] ${type} chunk ${k}, intento ${attempt}, esperando ${waitMs}ms...`)
          await new Promise((res) => setTimeout(res, waitMs))
          continue
        }
        if (!r.ok) {
          console.error(type, k, r.status)
          break
        }
        j = await r.json()
        break
      } catch (err) {
        if (attempt === 5) console.error(`Error en chunk ${k}:`, err.message)
        await new Promise((res) => setTimeout(res, attempt * 2000))
      }
    }
    if (j?.results?.bindings) {
      for (const b of j.results.bindings) ok.add(b.item.value.split('/').pop())
    }
    await new Promise((res) => setTimeout(res, 2000))
  }
  const bad = items.filter((i) => !ok.has(i.wikidataId))
  out[type] = bad.map((i) => ({ id: i.id, title: i.title, wikidataId: i.wikidataId, synopsis: (i.synopsis || '').slice(0, 90) }))
  console.log(type, `${bad.length}/${items.length} con tipo equivocado`, bad.slice(0, 6).map((i) => i.title + ' ' + i.wikidataId).join(' | '))
}
writeFileSync(process.argv[3], JSON.stringify(out, null, 1))
