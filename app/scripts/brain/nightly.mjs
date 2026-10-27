/**
 * nightly.mjs — Automejora del cerebro (Igor, 27/10/2026): cada noche aprende de los usuarios reales de la app.
 *
 * 1. Usuarios reales → fuente de comportamiento `users`: de Supabase salen SOLO recuentos agregados de «a quien le
 *    gustó A también le gustó B» (el SQL agrega dentro de la base de datos; ningún dato por usuario sale de ella).
 *    Su peso crece con el volumen: min(1, aportantes / 200). Con pocos amigos en la beta pesa casi nada.
 * 2. Reconstruye el espacio (build_space.py) con todas las fuentes y la evaluación: solo escribe engine/<shelf>.json
 *    donde mejora.
 * 3. Pasa los tests del motor.
 * 4. Deja un informe en scripts/cache/eval/nightly-<fecha>.md. NO hace commit ni push (Igor decide, 27/10/2026).
 *
 * Token: SUPABASE_ACCESS_TOKEN del entorno, o leído (solo esa línea) de SUPABASE_TOKEN_FILE
 * (por defecto el .env de riftbound-web, donde lo guarda Igor). Nunca se copia ni se imprime.
 *
 * Uso: node scripts/brain/nightly.mjs [--skip-users] [--no-write]
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const APP = join(here, '..', '..')
const CACHE = join(APP, 'scripts', 'cache')
const PROJECT = 'pvewnpemlwmvaduzhjso'
const PARAMS = join(here, 'space-params.json')
const args = process.argv.slice(2)
const today = new Date().toISOString().slice(0, 10)
const log = []
const say = (s) => { console.log(s); log.push(s) }

function token() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN
  const file = process.env.SUPABASE_TOKEN_FILE ?? join(APP, '..', '..', 'riftbound-web', '.env')
  if (!existsSync(file)) return null
  const line = readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SUPABASE_ACCESS_TOKEN='))
  return line ? line.slice('SUPABASE_ACCESS_TOKEN='.length).trim().replace(/^["']|["']$/g, '') : null
}

async function sql(query) {
  const t = token()
  if (!t) throw new Error('sin SUPABASE_ACCESS_TOKEN')
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

// «Le gustó»: (a) con cuenta, completada y con nota ≥ 4 o en el tercio de arriba de su ranking; (b) sin cuenta (hoy,
// casi todo), lo que se marcó como visto en la misma sesión de la app. Todo se agrega en el SQL.
const CO_LIKES = `
with ranked as (
  select user_id::text as who, item_id, shelf, score, rank_position,
         count(*) filter (where rank_position is not null) over (partition by user_id, shelf) as n_ranked
  from public.biblio_entries
  where status in ('completed', 'seen')
), liked as (
  select who, item_id, shelf from ranked
  where coalesce(score, 0) >= 4
     or (rank_position is not null and rank_position <= greatest(3, ceil(n_ranked / 3.0)))
  union
  select 's:' || sid as who, item_id, shelf from public.biblio_events
  where item_id is not null and shelf is not null
    and ((type = 'entry_status' and data->>'to' = 'seen') or (type = 'deck_swipe' and data->>'dir' = 'right'))
)
select a.item_id as a, b.item_id as b, a.shelf, count(*)::int as n
from liked a join liked b on a.who = b.who and a.shelf = b.shelf and a.item_id < b.item_id
group by a.item_id, b.item_id, a.shelf`
// Cuántas personas (o sesiones sin cuenta) aportan: con al menos 3 obras que le gustan
const USERS = `
with liked as (
  select user_id::text as who from public.biblio_entries where status in ('completed', 'seen')
  union all
  select 's:' || sid from public.biblio_events
  where item_id is not null and ((type = 'entry_status' and data->>'to' = 'seen') or (type = 'deck_swipe' and data->>'dir' = 'right'))
)
select count(*)::int as users from (select who from liked group by who having count(*) >= 3) x`

async function usersSource() {
  const [{ users }] = await sql(USERS)
  const rows = await sql(CO_LIKES)
  const out = rows.map((r) => JSON.stringify({ a: r.a, b: r.b, source: 'users', n: r.n })).join('\n')
  writeFileSync(join(CACHE, 'graph', 'cooc-users.jsonl'), out ? out + '\n' : '')
  const params = existsSync(PARAMS) ? JSON.parse(readFileSync(PARAMS, 'utf8')) : {}
  const weight = Math.min(1, users / 200) // sesiones sueltas pesan menos que personas: hace falta más volumen
  params.sources = { ...(params.sources ?? {}), users: Math.round(weight * 100) / 100 }
  writeFileSync(PARAMS, JSON.stringify(params, null, 2) + '\n')
  say(`- Datos reales: ${users} personas o sesiones con ≥ 3 obras que les gustan → ${rows.length} pares de co-gusto (peso de la fuente ${weight.toFixed(2)})`)
}

async function main() {
  mkdirSync(join(CACHE, 'eval'), { recursive: true })
  say(`# Automejora del cerebro — ${today}`)
  if (!args.includes('--skip-users')) {
    try { await usersSource() } catch (e) { say(`- ⚠️ Usuarios reales: no se pudo leer Supabase (${e.message}); sigo sin esa fuente`) }
  }
  const py = ['scripts/brain/build_space.py', '--eval', ...(args.includes('--no-write') ? [] : ['--write'])]
  const out = execFileSync('python', py, { cwd: APP, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, maxBuffer: 64 * 1024 * 1024 })
  say(out.trim())
  try {
    execFileSync('npx', ['vitest', 'run', 'src/lib/engine'], { cwd: APP, encoding: 'utf8', shell: true, stdio: 'pipe' })
    say('- ✅ Tests del motor en verde')
  } catch (e) {
    say(`- ❌ Tests del motor fallan: revisa antes de subir nada\n${String(e.stdout ?? '').slice(-1500)}`)
  }
  const changed = execFileSync('git', ['status', '--short', 'src/data/engine'], { cwd: APP, encoding: 'utf8' }).trim()
  say(changed ? `- Cambios listos para revisar (sin commit):\n${changed}` : '- Sin cambios en los motores')
  writeFileSync(join(CACHE, 'eval', `nightly-${today}.md`), log.join('\n') + '\n')
}

main().catch((e) => { console.error(e); process.exit(1) })
