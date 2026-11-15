// Banco repetible de Decidir (PLAN_DECIDIR B0). Solo con BENCH=1:
//   cd packages/core && BENCH=1 npx vitest run src/lib/engine/decide2.bench.test.ts
// Semillas fijas: dos ejecuciones seguidas dan exactamente los mismos números.
// BENCH_NO_DOC=1 no añade la sección a docs/DECIDIR_MEDIDAS.md (para comprobar repetibilidad); BENCH_OUT=ruta
// vuelca además las tablas a un archivo.
import { appendFileSync, existsSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { items, itemsById } from '../../data/catalog'
import * as v2 from './decide2'
import { loadShelfEngine } from '../../testing/engineData'
import { gauss, rngOf, seenSetFor, tasteFor, type Taste } from '../../testing/simUsers'
import type { Item, Profile, ShelfType, UserEntry } from '../../types'

const ALL_SHELVES: ShelfType[] = ['movie', 'series', 'book', 'boardgame', 'artist']
// BENCH_SHELVES=movie,book limita las estanterías (para depurar); por defecto, las cinco
const SHELVES: ShelfType[] = process.env.BENCH_SHELVES ? (process.env.BENCH_SHELVES.split(',') as ShelfType[]) : ALL_SHELVES
const KSEED = Number(process.env.BENCH_KSEED ?? 0)
const NAME: Record<string, string> = { movie: 'Pelis', series: 'Series', book: 'Libros', boardgame: 'Juegos', artist: 'Artistas' }
const MODES = ['sabe', 'azar', 'pasa', 'ruido'] as const
type Mode = (typeof MODES)[number]
const CENSUS_SESSIONS = 40
const CENSUS_OWN = 30
const CURVE_USERS = 60
const CURVE_DUELS = 6

const profile: Profile = { name: 'Sim', avatarColor: '#fff', platforms: [], country: 'ES', lang: 'es' }
const emptyRankings = (): Record<string, string[]> => ({ movie: [], series: [], book: [], artist: [], boardgame: [], song: [] })

function makeInput(shelf: ShelfType, own: string[] = []) {
  const entries: Record<string, UserEntry> = {}
  for (const id of own) entries[id] = { itemId: id, shelf, status: 'seen', ranked: true, updatedAt: 0 }
  const rankings = emptyRankings()
  rankings[shelf] = [...own]
  return {
    shelf, items, entries, rankings, profile, friends: [], answers: { seen: 'nueva', source: 'igual', platforms: [] },
    affinity: () => null, friendPct: () => null, recentOrienters: [], userVec: null, doubtfulItems: {},
  } as unknown as Parameters<typeof v2.initDecideSession>[0]
}

const pct1 = (x: number) => `${(x * 100).toFixed(0)} %`
const f2 = (x: number) => x.toFixed(2)
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN)
const shelfPool = (shelf: ShelfType) => items.filter((x) => x.type === shelf && !x.hidden)

/* ------------------------------------------------------------------------------------------ censo */

interface CensusRow { n: number; rs: number[]; prod: number[]; tiers: Record<string, number> }

function census(shelf: ShelfType, withOwn: boolean) {
  const pool = shelfPool(shelf)
  // 30 obras propias de las 300 más populares, elegidas con semilla (un usuario con 30 obras suele tener las conocidas)
  const popular = [...pool].sort((a, b) => b.popularity - a.popularity || (a.id < b.id ? -1 : 1)).slice(0, 300)
  const rows: CensusRow[] = Array.from({ length: 7 }, (_, i) => ({ n: i + 1, rs: [], prod: [], tiers: { propia: 0, 'nivel 1': 0, 'nivel 2': 0, 'nivel 3': 0, 'nivel 4': 0 } }))
  const early = new Map<string, number>() // sesiones en que sale cada obra en los duelos 1-3
  let sessions = 0
  for (let s = 0; s < CENSUS_SESSIONS; s++) {
    const r = rngOf(5000 + s * 31 + shelf.length)
    let own: string[] = []
    if (withOwn) {
      const copy = [...popular]
      for (let i = 0; i < Math.min(CENSUS_OWN, copy.length); i++) { const j = i + Math.floor(r() * (copy.length - i)); [copy[i], copy[j]] = [copy[j], copy[i]] }
      own = copy.slice(0, CENSUS_OWN).map((x) => x.id)
    }
    const answer = rngOf(900 + s)
    let st = v2.initDecideSession(makeInput(shelf, own))
    const seen = new Set<string>()
    for (let n = 0; n < 8; n++) {
      if (n > 0 && v2.shouldPropose(st)) break
      const d = v2.nextDuel(st, items, new Set(), answer)
      if (!d) break
      if (n < 7) {
        const row = rows[n]
        const rA = d.rA ?? 0, rB = d.rB ?? 0
        row.rs.push(rA, rB)
        row.prod.push(rA * rB)
        for (const [own1, tier] of [[d.isOwnA, d.tierA], [d.isOwnB, d.tierB]] as const) row.tiers[own1 ? 'propia' : `nivel ${tier}`]++
      }
      if (n < 3) for (const it of [d.a, d.b]) seen.add(it.id)
      st = answer() < 0.5 ? v2.applyDuelChoice(st, d.a, d.b) : v2.applyDuelChoice(st, d.b, d.a)
    }
    for (const id of seen) early.set(id, (early.get(id) ?? 0) + 1)
    sessions++
  }
  const top = [...early.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 15)
  return { rows, top: top.map(([id, c]) => ({ title: itemsById.get(id)?.title ?? id, share: c / sessions })), sessions }
}

function censusTables(c: ReturnType<typeof census>): string {
  const lines: string[] = []
  lines.push(`| Duelo | Duelos medidos | R media | R mínima | Media de rA·rB | Propia | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |`)
  lines.push(`|---|---|---|---|---|---|---|---|---|---|`)
  for (const row of c.rows) {
    const tot = Object.values(row.tiers).reduce((s, x) => s + x, 0) || 1
    const t = (k: string) => pct1(row.tiers[k] / tot)
    lines.push(`| ${row.n} | ${row.prod.length} | ${row.rs.length ? f2(mean(row.rs)) : '—'} | ${row.rs.length ? f2(Math.min(...row.rs)) : '—'} | ${row.prod.length ? f2(mean(row.prod)) : '—'} | ${t('propia')} | ${t('nivel 1')} | ${t('nivel 2')} | ${t('nivel 3')} | ${t('nivel 4')} |`)
  }
  const late = c.rows.slice(3, 6).flatMap((r) => r.prod)
  lines.push('')
  lines.push(`Media de rA·rB en los duelos 4-6: **${f2(mean(late))}**. Obras más repetidas en los duelos 1-3 (% de sesiones en que salen): ` +
    c.top.map((t) => `${t.title} ${pct1(t.share)}`).join('; ') + '.')
  lines.push('')
  lines.push(`Orientador más repetido en los duelos 1-3: **${pct1(c.top[0]?.share ?? 0)}** de las sesiones.`)
  return lines.join('\n')
}

/* ------------------------------------------------------------------------------------------ curva */

interface Point { hit: number; hit3: number; pct: number }
interface CurveResult { hitNew: number[]; seenProp: number[]; points: Point[]; orienterShare: number; propR: number; quality: number; qualityN: number }

function curve(shelf: ShelfType, mode: Mode): CurveResult {
  const pool = shelfPool(shelf)
  const hitSum = new Array(CURVE_DUELS + 1).fill(0)
  const hit3Sum = new Array(CURVE_DUELS + 1).fill(0)
  const pctSum = new Array(CURVE_DUELS + 1).fill(0)
  const hitNewSum = new Array(CURVE_DUELS + 1).fill(0)
  const seenSum = new Array(CURVE_DUELS + 1).fill(0)
  let orienter = 0, rSum = 0
  const qual: number[] = []
  const voteSorted = pool.filter((x) => x.voteAvg != null).map((x) => x.voteAvg as number).sort((a, b) => a - b)
  const quality = (it: Item) => {
    if (it.voteAvg == null || !voteSorted.length) return null
    let lo = 0, hi = voteSorted.length
    while (lo < hi) { const m = (lo + hi) >> 1; if (voteSorted[m] < it.voteAvg) lo = m + 1; else hi = m }
    return lo / voteSorted.length
  }
  for (let u = 0; u < CURVE_USERS; u++) {
    const r = rngOf(1000 + u * 17 + shelf.length)
    const taste: Taste = tasteFor(shelf, u, r)
    const answer = rngOf(77 + u)
    const know = rngOf(4242 + KSEED + u) // quién conoce qué obra: flujo aparte para que el resto no cambie entre modos
    const tv = new Map(pool.map((x) => [x.id, taste(x)]))
    const sorted = [...tv.values()].sort((a, b) => b - a)
    const pct = (it: Item) => {
      const v = tv.get(it.id) ?? taste(it)
      let lo = 0, hi = sorted.length // nº de valores estrictamente mayores
      while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] > v) lo = m + 1; else hi = m }
      return lo / sorted.length
    }
    // lo que ya ha visto (solo se mide en `sabe`; flujo de azar propio: no cambia nada de lo demás)
    const seen = mode === 'sabe' ? seenSetFor(shelf, taste, rngOf(31000 + u * 13 + shelf.length)) : new Set<string>()
    const unseenSorted = pool.filter((x) => !seen.has(x.id)).map((x) => tv.get(x.id) as number).sort((a, b) => b - a)
    const pctNew = (it: Item) => {
      const v = tv.get(it.id) ?? taste(it)
      let lo = 0, hi = unseenSorted.length
      while (lo < hi) { const m = (lo + hi) >> 1; if (unseenSorted[m] > v) lo = m + 1; else hi = m }
      return lo / (unseenSorted.length || 1)
    }
    let st = v2.initDecideSession(makeInput(shelf))
    const score = (k: number) => {
      const prop = v2.getProposal(st, null, [])!
      if (mode === 'sabe') {
        if (seen.has(prop.item.id)) seenSum[k]++
        else if (pctNew(prop.item) <= 0.1) hitNewSum[k]++
      }
      const p = pct(prop.item)
      hitSum[k] += p <= 0.1 ? 1 : 0
      hit3Sum[k] += [prop.item, ...(prop.alternatives ?? []).slice(0, 2)].some((x) => pct(x) <= 0.1) ? 1 : 0
      pctSum[k] += p
      return prop
    }
    let prop = score(0)
    for (let n = 1; n <= CURVE_DUELS; n++) {
      const d = v2.nextDuel(st, items, new Set(), answer)
      if (d) {
        const knowsBoth = know() < (d.rA ?? 0) && know() < (d.rB ?? 0)
        const sabe = () => taste(d.a) - taste(d.b) + gauss(answer) > 0
        let aWins: boolean | null
        if (mode === 'sabe') aWins = sabe()
        else if (mode === 'ruido') aWins = answer() < 0.5
        else if (knowsBoth) aWins = sabe()
        else aWins = mode === 'azar' ? answer() < 0.5 : null
        if (aWins === null) st = v2.skipDuelUnknown(st, d.a, d.b)
        else st = aWins ? v2.applyDuelChoice(st, d.a, d.b) : v2.applyDuelChoice(st, d.b, d.a)
      }
      prop = score(n)
    }
    if (mode === 'sabe') {
      if (st.shown.includes(prop.item.id)) orienter++
      rSum += st.recogMap[prop.item.id] ?? 0
      const q = quality(prop.item)
      if (q != null) qual.push(q)
    }
  }
  return {
    hitNew: hitNewSum.map((x) => x / CURVE_USERS), seenProp: seenSum.map((x) => x / CURVE_USERS),
    points: hitSum.map((_, k) => ({ hit: hitSum[k] / CURVE_USERS, hit3: hit3Sum[k] / CURVE_USERS, pct: pctSum[k] / CURVE_USERS })),
    orienterShare: orienter / CURVE_USERS, propR: rSum / CURVE_USERS, quality: mean(qual), qualityN: qual.length,
  }
}

function priorWeight(shelf: ShelfType) {
  const st = v2.initDecideSession(makeInput(shelf))
  const v = Object.values(st.base).sort((a, b) => a - b)
  return { max: v[v.length - 1], med: v[Math.floor(v.length / 2)], min: v[0], n: v.length }
}

/* ------------------------------------------------------------------------------------------ prueba */

function git(cmd: string): string {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return 'desconocido' }
}

describe.runIf(process.env.BENCH)('Decidir: banco repetible', () => {
  beforeAll(async () => {
    for (const s of SHELVES) if (!(process.env.BENCH_NOENGINE ?? '').split(',').includes(s)) await loadShelfEngine(s)
  }, 120_000)

  it('mide las cinco estanterías', () => {
    const t0 = Date.now()
    const out: string[] = []
    const summary: string[] = []
    summary.push('| Medida | ' + SHELVES.map((s) => NAME[s]).join(' | ') + ' |')
    summary.push('|---|' + SHELVES.map(() => '---').join('|') + '|')
    const sum: Record<string, string[]> = {
      'Acierto tras 6 duelos, modo sabe': [], 'Acierto tras 6 duelos, modo azar': [], 'Acierto tras 6 duelos, modo pasa': [], 'Acierto tras 6 duelos, modo ruido': [],
      'Acierto nuevo tras 6 duelos (sabe, entre lo no visto)': [], 'Propuesta ya vista tras 6 duelos (sabe)': [],
      'Media de rA·rB, duelos 4-6 (usuario nuevo)': [], 'Sesiones con el orientador más repetido en los duelos 1-3 (usuario nuevo)': [],
      'La propuesta es un orientador enseñado (sabe)': [], 'R media de la propuesta (sabe)': [], 'Calidad media de la propuesta (percentil de voteAvg)': [],
      'Peso de la previa: rango de st.base (máx − mín)': [],
    }

    for (const shelf of SHELVES) {
      out.push(`### ${NAME[shelf]} (${shelfPool(shelf).length} obras visibles)\n`)
      out.push(`#### Censo de orientadores, usuario nuevo (${CENSUS_SESSIONS} sesiones, respuestas al azar)\n`)
      const cNew = census(shelf, false)
      out.push(censusTables(cNew) + '\n')
      out.push(`#### Censo de orientadores, usuario con ${CENSUS_OWN} obras propias (${CENSUS_SESSIONS} sesiones)\n`)
      out.push(censusTables(census(shelf, true)) + '\n')

      const res = {} as Record<Mode, CurveResult>
      for (const m of MODES) res[m] = curve(shelf, m)
      out.push(`#### Curva de acierto (${CURVE_USERS} usuarios; acierto = propuesta en su 10 % favorito; «3» = la propuesta o una de sus 2 primeras alternativas)\n`)
      out.push('| Duelos | ' + MODES.map((m) => `${m} acierto | ${m} en 3 | ${m} percentil`).join(' | ') + ' |')
      out.push('|---|' + MODES.map(() => '---|---|---').join('|') + '|')
      for (let k = 0; k <= CURVE_DUELS; k++) out.push(`| ${k} | ` + MODES.map((m) => { const p = res[m].points[k]; return `${pct1(p.hit)} | ${pct1(p.hit3)} | ${pct1(p.pct)}` }).join(' | ') + ' |')
      out.push('')
      out.push('Solo `sabe`, entre lo que el usuario no ha visto: «acierto nuevo» = la propuesta está en su 10 % favorito de las obras que no ha visto y además no la ha visto; «propuesta ya vista» = % de propuestas que ya había visto.\n')
      out.push('| Duelos | acierto | acierto nuevo | propuesta ya vista |')
      out.push('|---|---|---|---|')
      for (let k = 0; k <= CURVE_DUELS; k++) out.push(`| ${k} | ${pct1(res.sabe.points[k].hit)} | ${pct1(res.sabe.hitNew[k])} | ${pct1(res.sabe.seenProp[k])} |`)
      out.push('')
      const sabe = res.sabe
      const pw = priorWeight(shelf)
      out.push(`#### Propuesta = orientador y peso de la previa (modo sabe, tras ${CURVE_DUELS} duelos)\n`)
      out.push(`- La propuesta es una obra enseñada en un duelo de la sesión: **${pct1(sabe.orienterShare)}**; R media de la propuesta: **${f2(sabe.propR)}**.`)
      out.push(`- \`st.base\` al iniciar (log de la previa, ${pw.n} obras): máximo ${f2(pw.max)}, mediana ${f2(pw.med)}, mínimo ${f2(pw.min)}.`)
      out.push(`- Calidad media de la propuesta (percentil de \`voteAvg\` en su estantería, ${sabe.qualityN} de ${CURVE_USERS} propuestas con dato): **${pct1(sabe.quality)}**.\n`)

      sum['Acierto tras 6 duelos, modo sabe'].push(pct1(res.sabe.points[6].hit))
      sum['Acierto tras 6 duelos, modo azar'].push(pct1(res.azar.points[6].hit))
      sum['Acierto tras 6 duelos, modo pasa'].push(pct1(res.pasa.points[6].hit))
      sum['Acierto tras 6 duelos, modo ruido'].push(pct1(res.ruido.points[6].hit))
      sum['Acierto nuevo tras 6 duelos (sabe, entre lo no visto)'].push(pct1(sabe.hitNew[6]))
      sum['Propuesta ya vista tras 6 duelos (sabe)'].push(pct1(sabe.seenProp[6]))
      sum['Media de rA·rB, duelos 4-6 (usuario nuevo)'].push(f2(mean(cNew.rows.slice(3, 6).flatMap((r) => r.prod))))
      sum['Sesiones con el orientador más repetido en los duelos 1-3 (usuario nuevo)'].push(pct1(cNew.top[0]?.share ?? 0))
      sum['La propuesta es un orientador enseñado (sabe)'].push(pct1(sabe.orienterShare))
      sum['R media de la propuesta (sabe)'].push(f2(sabe.propR))
      sum['Calidad media de la propuesta (percentil de voteAvg)'].push(Number.isNaN(sabe.quality) ? '—' : pct1(sabe.quality))
      sum['Peso de la previa: rango de st.base (máx − mín)'].push(f2(pw.max - pw.min))
    }
    for (const [k, v] of Object.entries(sum)) summary.push(`| ${k} | ${v.join(' | ')} |`)

    const elapsed = (Date.now() - t0) / 1000
    const head = `## ${new Date().toISOString().slice(0, 10)} · commit ${git('git rev-parse --short HEAD')}\n\n` +
      `Banco \`decide2.bench.test.ts\` (BENCH=1). Usuario nuevo: ${CENSUS_SESSIONS} sesiones; curvas: ${CURVE_USERS} usuarios simulados; semillas fijas.\n\n` +
      `### Resumen\n\n${summary.join('\n')}\n\n`
    const body = head + out.join('\n') + '\n'
    console.log(`BENCH: ${elapsed.toFixed(0)} s`)
    if (process.env.BENCH_OUT) writeFileSync(process.env.BENCH_OUT, body)
    if (!process.env.BENCH_NO_DOC) {
      const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
      const file = resolve(root, 'docs/DECIDIR_MEDIDAS.md')
      if (!existsSync(file)) writeFileSync(file, '# Medidas de Decidir\n\nCada sección la añade `BENCH=1 npx vitest run src/lib/engine/decide2.bench.test.ts` (en `packages/core`). No se sobrescribe: se añade.\n')
      appendFileSync(file, '\n' + body)
    }
    expect(summary.length).toBeGreaterThan(2)
  }, 600_000)
})
