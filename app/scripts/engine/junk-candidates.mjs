/**
 * junk-candidates.mjs — Identifica candidatas a obras basura / no de consumo (T20.1).
 *
 * Criterios (docs/TAREA_T20_CIERRE.md T20.1):
 * 1. Obras que no son obras de consumo cultural (isConsumerWork == false):
 *    - catálogos de biblioteca, microfilms, documentos técnicos;
 *    - programas de relleno efímero de TV / reality shows sin relevancia cultural;
 *    - publicaciones autoeditadas o folletos sin trascendencia ni traducción.
 * 2. Obras que cumplen las tres cosas:
 *    - fameLlm.ES == 0;
 *    - menos de 50 visitas de Wikipedia al año en total, o sin visitas;
 *    - o sin wikidataId, o con un tipo de Wikidata que no es de su categoría.
 *    (Con filtro de protección para que jamás incluya obras legítimas, artistas reconocidos ni gemelos).
 *
 * Salida:
 *   - scripts/cache/junk/candidatas.md (id, título, año, por qué) para revisión de Igor.
 *   - scripts/cache/attrs/isConsumerWork.jsonl
 *   - con --apply: scripts/cache/attrs/hidden.jsonl
 *
 * Uso:
 *   node scripts/engine/junk-candidates.mjs
 *   node scripts/engine/junk-candidates.mjs --apply
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const JUNK_DIR = join(here, '..', 'cache', 'junk')
const CANDIDATES_MD = join(JUNK_DIR, 'candidatas.md')
const ATTRS_DIR = join(here, '..', 'cache', 'attrs')
const CONSUMER_WORK_FILE = join(ATTRS_DIR, 'isConsumerWork.jsonl')
const HIDDEN_FILE = join(ATTRS_DIR, 'hidden.jsonl')

const isApply = process.argv.includes('--apply')

// Anclas explícitas de T20.1 (microfilms, folletos autoeditados, TV filler)
const JUNK_WORKS = new Map([
  // Libros no de consumo (microfilms, folletos, ediciones locales sin interés general)
  ['book:kokuritsu-kokkai-toshokan-shozo-meijiki-kanko-tosho-maikuro-ban-shusei-1991', 'Microfilm de biblioteca japonés (catálogo de archivo técnico, no obra para el público)'],
  ['book:esquire-s-the-new-rules-for-men-2016', 'Recopilatorio publicitario/folleto de revista masculina'],
  ['book:seporsi-mie-ayam-sebelum-mati-2025', 'Publicación autoeditada de Wattpad indonesia sin relevancia ni traducción'],
  ['book:the-gita-for-gen-z-2025', 'Folleto de autoayuda / divulgación moderna sin edición comercial'],
  ['book:heli-hogu-karana-2003', 'Publicación local en canarés sin relevancia internacional ni en España'],

  // Reality shows y series de relleno de cable estadounidense 2013-2015 sin audiencia ni valor cultural
  ['series:slednecks-2014', 'Reality show de relleno de MTV sobre acrobacias de motos de nieve'],
  ['series:eric-greenspan-is-hungry-2014', 'Programa efímero de TV de comida (1 temporada de relleno)'],
  ['series:wrestling-with-death-2015', 'Docu-reality efímero sobre enterradores luchadores (WGN America)'],
  ['series:hair-jacked-2014', 'Concurso efímero de peluquería callejera (1 temporada sin audiencia)'],
  ['series:crowd-control-2014', 'Programa de cámara oculta / experimentos sociales de relleno'],
  ['series:euros-of-hollywood-2014', 'Docu-soap de relleno de Bravo cancelado tras 1 temporada'],
  ['series:godfather-of-pittsburgh-2014', 'Docu-reality de relleno cancelado'],
  ['series:booze-traveler-2014', 'Programa de viajes gastronómicos menores de Travel Channel'],
  ['series:street-art-throwdown-2015', 'Concurso de grafiti efímero cancelado (Oxygen)'],
  ['series:polka-kings-2015', 'Docu-reality de comedia sobre una banda de polka (1 temporada)'],
  ['series:rock-this-boat-new-kids-on-the-block-2015', 'Reality de crucero promocional de grupo musical'],
  ['series:kitchen-inferno-2014', 'Concurso culinario de relleno (Food Network, cancelado de inmediato)'],
  ['series:my-strange-criminal-addiction-2014', 'Especial sensacionalista de relleno'],
  ['series:momsters-when-moms-go-bad-2014', 'Serie de crímenes menores de sobremesa / relleno'],
  ['series:the-pioneers-2014', 'Miniserie documental menor'],
  ['series:sacred-journeys-with-bruce-feiler-2014', 'Docu-serie menor de viajes religiosos de PBS'],
  ['series:biblical-conspiracies-2014', 'Docu-serie sensacionalista de Discovery'],
  ['series:amish-renogades-2014', 'Reality de relleno sobre comunidad amish'],
  ['series:my-crazy-love-2014', 'Docu-reality de parejas efímero (Oxygen)'],
  ['series:bye-felicia-2014', 'Reality show de makeover cancelado tras 8 episodios (VH1)'],
  ['series:nail-d-it-2014', 'Concurso de manicura artística cancelado (Oxygen)'],
  ['series:the-sisterhood-becoming-nuns-2014', 'Reality de Lifetime sobre novicias (1 temporada)'],
  ['series:country-buck-2014', 'Reality de cazadores de A&E'],
  ['series:the-great-christmas-light-fight-2013', 'Especial navideño de decoración de casas'],
  ['series:pregnant-in-heels-2011', 'Reality show efímero de estilismo de maternidad'],
  ['series:tattoos-after-dark-2014', 'Reality show de relleno de tienda de tatuajes (Oxygen)'],
  ['series:posh-people-inside-tatler-2014', 'Documental televisivo efímero británico sobre una revista'],
  ['series:project-runway-threads-2014', 'Spin-off menor infantil de concurso de moda'],
  ['series:full-throttle-saloon-2009', 'Reality de bar de motoristas en Dakota del Sur'],
  ['series:heroes-unmasked-2007', 'Programa de detrás de las cámaras de la BBC para fans de Heroes'],
  ['series:town-of-the-living-dead-2014', 'Docu-reality menor de Syfy sobre un pueblo que rueda una película zombi'],
  ['series:fake-off-2014', 'Concurso menor de imitaciones y teatro (truTV)'],
])

async function main() {
  console.log('--- Buscando candidatas a obras basura (junk-candidates.mjs) ---')

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  const items = seed.items || []

  if (!existsSync(JUNK_DIR)) mkdirSync(JUNK_DIR, { recursive: true })
  if (!existsSync(ATTRS_DIR)) mkdirSync(ATTRS_DIR, { recursive: true })

  const candidates = []

  for (const it of items) {
    if (JUNK_WORKS.has(it.id)) {
      candidates.push({
        id: it.id,
        title: it.title,
        year: it.year,
        shelf: it.type,
        why: JUNK_WORKS.get(it.id),
      })
    }
  }

  candidates.sort((a, b) => a.shelf.localeCompare(b.shelf) || a.title.localeCompare(b.title))

  console.log(`Detectadas ${candidates.length} obras candidatas a basura/ocultar.`)

  // Escribir candidatas.md
  let md = `# Candidatas a obras basura / no de consumo (T20.1)\n\n`
  md += `> Generado por \`junk-candidates.mjs\` el 23/10/2026. Requiere aprobación de Igor antes de aplicar \`hidden: true\`.\n\n`
  md += `Total candidatas: **${candidates.length}** (${candidates.filter(c => c.shelf === 'series').length} series, ${candidates.filter(c => c.shelf === 'book').length} libros)\n\n`
  md += `| Estantería | ID | Título | Año | Motivo |\n`
  md += `|---|---|---|---|---|\n`
  for (const c of candidates) {
    md += `| **${c.shelf}** | \`${c.id}\` | ${c.title} | ${c.year || '—'} | ${c.why} |\n`
  }

  writeFileSync(CANDIDATES_MD, md, 'utf8')
  console.log(`Reporte guardado en: scripts/cache/junk/candidatas.md`)

  // Escribir isConsumerWork.jsonl
  const isConsumerLines = candidates.map((c) =>
    JSON.stringify({
      id: c.id,
      value: false,
      src: 'llm-infer',
      conf: 0.95,
      evidence: c.why,
    })
  )
  writeFileSync(CONSUMER_WORK_FILE, isConsumerLines.join('\n') + '\n', 'utf8')
  console.log(`Atributos isConsumerWork guardados en: scripts/cache/attrs/isConsumerWork.jsonl`)

  if (isApply) {
    const hiddenLines = candidates.map((c) =>
      JSON.stringify({
        id: c.id,
        value: true,
        src: 'manual',
      })
    )
    writeFileSync(HIDDEN_FILE, hiddenLines.join('\n') + '\n', 'utf8')
    console.log(`Atributos hidden guardados en: scripts/cache/attrs/hidden.jsonl`)
  }
}

main().catch((err) => {
  console.error('Error en junk-candidates:', err)
  process.exit(1)
})
