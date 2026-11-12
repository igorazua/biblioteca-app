// Muestra compacta de los datos del catálogo y del motor, para revisar los motores sin abrir JSON de varios megas.
// Uso: node packages/core/scripts/muestra-datos.mjs [estantería] [n]   (estantería: movie|series|book|boardgame|artist; n: obras de ejemplo, 3 por defecto)
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA = join(dirname(fileURLToPath(import.meta.url)), '../../../app/src/data')
const [only, nArg] = process.argv.slice(2)
const n = Number(nArg) || 3
const short = (v) => {
  const s = JSON.stringify(v)
  return s && s.length > 140 ? s.slice(0, 137) + '…' : s
}

for (const f of readdirSync(join(DATA, 'shelves'))) {
  const shelf = f.replace('.json', '')
  if (only && only !== shelf) continue
  const items = JSON.parse(readFileSync(join(DATA, 'shelves', f), 'utf8'))
  console.log(`\n=== ${shelf}: ${items.length} obras`)
  // cobertura de cada campo (porcentaje de obras que lo tienen con valor)
  const count = {}
  for (const it of items) for (const [k, v] of Object.entries(it)) if (v != null && v !== '' && !(Array.isArray(v) && !v.length)) count[k] = (count[k] ?? 0) + 1
  console.log('Campos (% de obras con valor):', Object.entries(count).sort((a, b) => b[1] - a[1]).map(([k, c]) => `${k} ${Math.round((100 * c) / items.length)}%`).join(' · '))
  // obras de ejemplo: la más famosa, una del medio y la menos conocida
  const byPop = [...items].sort((a, b) => (b.popPct ?? 0) - (a.popPct ?? 0))
  const picks = n <= 3 ? [byPop[0], byPop[Math.floor(byPop.length / 2)], byPop[byPop.length - 1]].slice(0, n) : byPop.filter((_, i) => i % Math.ceil(byPop.length / n) === 0).slice(0, n)
  for (const it of picks) {
    console.log(`\n· ${it.title} (${it.year ?? '?'}) — ${it.id}`)
    for (const [k, v] of Object.entries(it)) if (!['id', 'title', 'year'].includes(k)) console.log(`    ${k}: ${short(v)}`)
  }
  // datos del motor de esa estantería: claves y tamaños, sin volcar vectores
  try {
    const eng = JSON.parse(readFileSync(join(DATA, 'engine', f), 'utf8'))
    console.log('\nMotor (engine/' + f + '):', Object.entries(eng).map(([k, v]) => `${k}${Array.isArray(v) ? `[${v.length}]` : typeof v === 'object' && v ? `{${Object.keys(v).length}}` : `=${short(v)}`}`).join(' · '))
    if (Array.isArray(eng.vec) && eng.vec[0]) console.log('  dimensión de vec:', Array.isArray(eng.vec[0]) ? eng.vec[0].length : typeof eng.vec[0])
  } catch {
    console.log('\nMotor: sin archivo engine/' + f)
  }
}
