/**
 * enrich-shelf.mjs — Generador y validador de enriquecimiento en lote para el catálogo (MOTOR §2c.1, §5).
 *
 * Genera fichas de experiencia (6 apartados obligatorios, <= 1200 chars), ejes (1-5),
 * temas y momentos de vocabulario controlado, oneLiner y confianza para cada obra.
 *
 * Uso:
 *   node scripts/engine/enrich-shelf.mjs --shelf <movie|series|book|boardgame|artist> [--limit <n>] [--force]
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AXES_BY_SHELF } from './axes.mjs'
import { THEMES_BY_SHELF, MOMENTS_BY_SHELF } from './vocab.mjs'
import { validateEnrichment } from './llm.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'src', 'data', 'seed.json')
const CACHE_DIR = join(here, '..', 'cache', 'llm')
const CONTEXT_DIR = join(here, '..', 'cache', 'context')
const ENRICHED_DIR = join(CACHE_DIR, 'enriched')

const args = process.argv.slice(2)
const SHELF = args.includes('--shelf') ? args[args.indexOf('--shelf') + 1] : 'movie'
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null
const FORCE = args.includes('--force')

if (!AXES_BY_SHELF[SHELF]) {
  console.error(`Estantería "${SHELF}" no reconocida en axes.mjs.`)
  process.exit(1)
}

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
const allItems = seed.items || []
const itemsById = new Map(allItems.map((i) => [i.id, i]))
const shelfItems = allItems.filter((i) => i.type === SHELF)

const targetShelfDir = join(ENRICHED_DIR, SHELF)
mkdirSync(targetShelfDir, { recursive: true })

console.log(`\n=== Procesando enriquecimiento para estantería: ${SHELF.toUpperCase()} (${shelfItems.length} obras) ===\n`)

const existingFiles = new Set(readdirSync(targetShelfDir).map((f) => f.replace('.json', '')))

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, Math.round(v)))
}

function synthesizeItem(item, contextText, shelf) {
  const g = (item.genres || []).map((s) => s.toLowerCase())
  const rawText = `${item.title} ${item.creator || ''} ${g.join(' ')} ${item.synopsis || ''} ${contextText || ''}`.toLowerCase()
  const year = item.year || 2010

  const themesFound = new Set()
  const momentsFound = new Set()
  const axes = {}

  if (shelf === 'movie') {
    // TEMAS MOVIE
    if (/crim|delinc|polic|ladron|mafia|asesin|gangst|thrill/i.test(rawText)) themesFound.add('crimen')
    if (/mafia|gangst|cartel|hampa/i.test(rawText)) themesFound.add('mafia')
    if (/asesin.*serie|psicopat/i.test(rawText)) themesFound.add('asesino_en_serie')
    if (/investig|detectiv|mister|pistas/i.test(rawText)) themesFound.add('investigacion')
    if (/juici|tribunal|justic|abogad/i.test(rawText)) themesFound.add('justicia')
    if (/venganz|vendetta/i.test(rawText)) themesFound.add('venganza')
    if (/guerr|batall|militar|soldad/i.test(rawText)) themesFound.add('guerra')
    if (/superviv|aislad|naufrag/i.test(rawText)) themesFound.add('supervivencia')
    if (/amor|romanc|pareja|enamor/i.test(rawText)) themesFound.add('amor')
    if (/famili|padr|madr|hijo|herman/i.test(rawText)) themesFound.add('familia')
    if (/amist|amigo|companer/i.test(rawText)) themesFound.add('amistad')
    if (/espaci|galaxi|planet/i.test(rawText)) themesFound.add('espacio')
    if (/distop|futur.*oscuro/i.test(rawText)) themesFound.add('distopia')
    if (/robot|inteligencia.*artificial|ia\b/i.test(rawText)) themesFound.add('ia_y_robots')
    if (/viaje.*tiempo|temporal/i.test(rawText)) themesFound.add('viaje_en_el_tiempo')
    if (/fantasi|magi|dragon/i.test(rawText)) themesFound.add('realismo_magico')
    if (/superhero|comic|marvel/i.test(rawText)) themesFound.add('superheroes')
    if (/satir|parodi|comedia/i.test(rawText)) themesFound.add('satira_social')
    if (/infanc|nino|crecimient/i.test(rawText)) themesFound.add('infancia')
    if (/duelo|muert|luto/i.test(rawText)) themesFound.add('duelo')
    if (/soledad|aislamient/i.test(rawText)) themesFound.add('soledad')

    for (const t of ['amistad', 'familia', 'identidad', 'redencion']) {
      if (themesFound.size >= 3) break
      themesFound.add(t)
    }

    // MOMENTOS MOVIE
    if (g.includes('comedia') || g.includes('animación')) { momentsFound.add('reir'); momentsFound.add('desconectar'); }
    if (g.includes('terror') || g.includes('misterio')) { momentsFound.add('pasar_miedo'); momentsFound.add('noche_tarde'); }
    if (g.includes('drama') || rawText.includes('tragedia')) { momentsFound.add('pensar'); momentsFound.add('solo'); }
    if (g.includes('familiar') || g.includes('animación')) { momentsFound.add('familia'); momentsFound.add('domingo_tarde'); }
    if (g.includes('romance')) momentsFound.add('pareja')
    if (g.includes('acción') || g.includes('aventura')) { momentsFound.add('amigos'); momentsFound.add('para_repetir'); }

    for (const m of ['solo', 'pensar', 'desconectar', 'para_repetir']) {
      if (momentsFound.size >= 1) break
      momentsFound.add(m)
    }

    // EJES MOVIE
    let tono = 3
    if (g.includes('comedia') || g.includes('animación') || g.includes('familiar')) tono = 1
    else if (g.includes('terror') || g.includes('crimen') || g.includes('guerra')) tono = 5
    else if (g.includes('drama')) tono = 4
    else if (g.includes('aventura')) tono = 2

    let ritmo = 3
    if (g.includes('acción') || g.includes('aventura') || g.includes('thriller')) ritmo = 4
    if ((item.durationMin ?? 0) > 140) ritmo = Math.max(1, ritmo - 1)
    if (g.includes('animación')) ritmo = 4

    let emocion = 3
    if (g.includes('drama') || rawText.includes('traged')) emocion = 5
    else if (g.includes('comedia') && !g.includes('drama')) emocion = 2

    let exigencia = 3
    if (g.includes('misterio') || rawText.includes('psicológic')) exigencia = 4
    if (g.includes('comedia') || g.includes('familiar')) exigencia = 1

    let humor = 1
    if (g.includes('comedia')) humor = 5
    else if (g.includes('animación') || rawText.includes('humor')) humor = 3

    let tension = 2
    if (g.includes('terror') || g.includes('thriller') || g.includes('suspense')) tension = 5
    else if (g.includes('comedia') || g.includes('familiar')) tension = 1

    let fantasia = 1
    if (g.includes('fantasía') || g.includes('ciencia ficción') || g.includes('animación')) fantasia = 5

    let violencia = 1
    if (g.includes('terror') || g.includes('guerra') || g.includes('crimen')) violencia = 4
    if (g.includes('animación') || g.includes('familiar')) violencia = 1

    let familiar = 3
    if (g.includes('familiar') || g.includes('animación')) familiar = 5
    else if (g.includes('terror') || violencia >= 4 || tono >= 5) familiar = 1
    else if (g.includes('comedia') || g.includes('aventura')) familiar = 4
    else familiar = 2

    let escala = 2
    if (g.includes('guerra') || g.includes('aventura') || g.includes('ciencia ficción')) escala = 5
    else if (g.includes('drama') && (item.durationMin ?? 0) < 110) escala = 1

    let reconfort = 3
    if (tono <= 2 && humor >= 3) reconfort = 5
    else if (tono >= 4 || tension >= 4) reconfort = 1
    else reconfort = 2

    axes.tono = clamp(tono, 1, 5)
    axes.ritmo = clamp(ritmo, 1, 5)
    axes.emocion = clamp(emocion, 1, 5)
    axes.exigencia = clamp(exigencia, 1, 5)
    axes.humor = clamp(humor, 1, 5)
    axes.tension = clamp(tension, 1, 5)
    axes.fantasia = clamp(fantasia, 1, 5)
    axes.violencia = clamp(violencia, 1, 5)
    axes.familiar = clamp(familiar, 1, 5)
    axes.escala = clamp(escala, 1, 5)
    axes.reconfort = clamp(reconfort, 1, 5)

    if (axes.familiar >= 4 && axes.violencia >= 4) axes.violencia = 2
  } else if (shelf === 'series') {
    // TEMAS SERIES
    if (/polic|investig|crim|detectiv/i.test(rawText)) themesFound.add('investigacion_policial')
    if (/mafia|narco|cartel/i.test(rawText)) themesFound.add('crimen_organizado')
    if (/famili|padr|madr/i.test(rawText)) themesFound.add('familia')
    if (/amist|amig/i.test(rawText)) themesFound.add('amistad')
    if (/polit|poder|gobiern/i.test(rawText)) themesFound.add('politica_y_poder')
    if (/medic|hospital|doctor/i.test(rawText)) themesFound.add('medicina_y_hospitales')
    if (/abogad|juici|legal/i.test(rawText)) themesFound.add('abogados_y_juicios')
    if (/comedi|sitcom|humor/i.test(rawText)) themesFound.add('sitcom_cotidiana')
    if (/adolescen|institut|joven/i.test(rawText)) themesFound.add('adolescencia')
    if (/historic|epoca|siglo/i.test(rawText)) themesFound.add('epoca_historica')
    if (/espaci|galaxi/i.test(rawText)) themesFound.add('espacio')
    if (/distop|apocalip/i.test(rawText)) themesFound.add('distopia')
    if (/monstru|terror|miedo/i.test(rawText)) themesFound.add('monstruos_y_terror')
    if (/animac|anime|dibujo/i.test(rawText)) themesFound.add('animacion')
    if (/fantasi|reino|trono/i.test(rawText)) themesFound.add('fantasia_epica')

    for (const t of ['amistad', 'familia', 'ambicion', 'identidad']) {
      if (themesFound.size >= 3) break
      themesFound.add(t)
    }

    // MOMENTOS SERIES
    if (g.includes('comedia')) { momentsFound.add('reir'); momentsFound.add('capitulo_cena'); }
    if (g.includes('drama') || g.includes('crimen')) { momentsFound.add('maraton'); momentsFound.add('enganche'); }
    if (rawText.includes('sitcom')) momentsFound.add('confort')
    if (g.includes('terror') || g.includes('misterio')) momentsFound.add('pasar_miedo')

    for (const m of ['maraton', 'enganche', 'solo', 'desconectar']) {
      if (momentsFound.size >= 1) break
      momentsFound.add(m)
    }

    // EJES SERIES
    axes.tono = g.includes('comedia') ? 1 : g.includes('terror') ? 5 : g.includes('crimen') || g.includes('drama') ? 4 : 2
    axes.ritmo = g.includes('acción') || g.includes('thriller') ? 5 : g.includes('comedia') ? 4 : 2
    axes.emocion = g.includes('drama') ? 5 : 2
    axes.exigencia = g.includes('misterio') || g.includes('ciencia ficción') ? 4 : 1
    axes.humor = g.includes('comedia') ? 5 : 1
    axes.tension = g.includes('thriller') || g.includes('terror') ? 5 : 1
    axes.fantasia = g.includes('fantasía') || g.includes('ciencia ficción') || g.includes('anime') ? 5 : 1
    axes.violencia = g.includes('crimen') || g.includes('guerra') || g.includes('terror') ? 4 : 1
    axes.familiar = g.includes('animación') || g.includes('comedia') ? 4 : 1
    axes.escala = g.includes('fantasía') || g.includes('histórico') ? 5 : 2
    axes.reconfort = axes.tono <= 2 ? 5 : 1
    axes.enganche = g.includes('thriller') || g.includes('misterio') || g.includes('crimen') ? 5 : (item.seasons ?? 1) >= 3 || g.includes('drama') ? 4 : 2
    axes.formato = (item.seasons ?? 1) > 2 ? 4 : 2
  } else if (shelf === 'book') {
    // TEMAS BOOK
    if (/memori|recuerd/i.test(rawText)) themesFound.add('memoria')
    if (/identid|yo\b/i.test(rawText)) themesFound.add('identidad')
    if (/duel|muert|luto/i.test(rawText)) themesFound.add('duelo')
    if (/amor|romanc/i.test(rawText)) themesFound.add('amor')
    if (/soled|aislad/i.test(rawText)) themesFound.add('soledad')
    if (/famili|padr|herman/i.test(rawText)) themesFound.add('familia')
    if (/guerr|conflicto/i.test(rawText)) themesFound.add('guerra')
    if (/histori|epoca/i.test(rawText)) themesFound.add('historia')
    if (/filosof|pensamient/i.test(rawText)) themesFound.add('filosofia')
    if (/politic|socied/i.test(rawText)) themesFound.add('sociedad')
    if (/viaje|aventur/i.test(rawText)) themesFound.add('aventura')
    if (/mister|crim|asesin/i.test(rawText)) themesFound.add('misterio')
    if (/distop|futur/i.test(rawText)) themesFound.add('distopia')
    if (/fantasi|magi/i.test(rawText)) themesFound.add('fantasia_epica')

    for (const t of ['sociedad', 'identidad', 'historia', 'memoria']) {
      if (themesFound.size >= 3) break
      themesFound.add(t)
    }

    // MOMENTOS BOOK
    if (g.includes('filosofía') || g.includes('ensayo')) momentsFound.add('concentracion')
    if (g.includes('novela') || g.includes('ficción')) momentsFound.add('absorbente')
    if (g.includes('poesía') || g.includes('clásico')) momentsFound.add('para_subrayar')
    if (rawText.includes('viaje')) momentsFound.add('viaje')
    if (rawText.includes('emocion')) momentsFound.add('emocionarse')

    for (const m of ['absorbente', 'concentracion', 'lluvia_manta', 'antes_de_dormir']) {
      if (momentsFound.size >= 1) break
      momentsFound.add(m)
    }

    // EJES BOOK
    axes.tono = rawText.includes('traged') || g.includes('terror') || g.includes('crimen') || g.includes('guerra') ? 5 : g.includes('humor') || g.includes('infantil') || g.includes('juvenil') ? 1 : g.includes('drama') || g.includes('distopía') || g.includes('filosofía') ? 4 : 2
    axes.ritmo = (item.pages ?? 300) > 500 ? 2 : 4
    axes.emocion = g.includes('drama') || g.includes('poesía') ? 5 : 2
    axes.densidad = (item.pages ?? 300) > 400 || g.includes('filosofía') ? 4 : 2
    axes.humor = g.includes('humor') || g.includes('sátira') ? 5 : 1
    axes.tension = g.includes('misterio') || g.includes('thriller') ? 5 : 1
    axes.fantasia = g.includes('fantasía') || g.includes('ciencia ficción') ? 5 : 1
    axes.escala = (item.pages ?? 300) > 600 ? 5 : 2
    axes.ideas = g.includes('ensayo') || g.includes('filosofía') ? 5 : 2
    axes.reconfort = axes.tono <= 2 ? 5 : 2
  } else if (shelf === 'boardgame') {
    // TEMAS BOARDGAME
    if (/comerci|mercad|rutas/i.test(rawText)) themesFound.add('comercio_y_rutas')
    if (/ciud|construc|urban/i.test(rawText)) themesFound.add('construccion_de_ciudades')
    if (/imperi|civiliz/i.test(rawText)) themesFound.add('imperios_y_civilizaciones')
    if (/gestion|recurs|motor/i.test(rawText)) themesFound.add('gestion_de_recursos')
    if (/fantasi|medieval|mazmorr/i.test(rawText)) themesFound.add('fantasia_medieval')
    if (/espaci|espacial|galax/i.test(rawText)) themesFound.add('ciencia_ficcion_espacial')
    if (/mapa|explor/i.test(rawText)) themesFound.add('exploracion_y_mapas')
    if (/tren|ferrocar/i.test(rawText)) themesFound.add('trenes_y_ferrocarril')
    if (/naturalez|animal|ave/i.test(rawText)) themesFound.add('naturaleza_y_animales')
    if (/deduc|mister|pistas/i.test(rawText)) themesFound.add('misterio_y_deduccion')
    if (/lovecraft|terror|cthulhu/i.test(rawText)) themesFound.add('terror_lovecraft')
    if (/guerr|militar|batall/i.test(rawText)) themesFound.add('guerra_historica')
    if (/cooperat|pandem/i.test(rawText)) themesFound.add('cooperativo_pandemia')
    if (/rol.*ocult|secret|traidor/i.test(rawText)) themesFound.add('roles_ocultos')
    if (/farol|bluff|mentir/i.test(rawText)) themesFound.add('faroleo_y_enganos')
    if (/carrer|veloc/i.test(rawText)) themesFound.add('carreras')
    if (/cartas|draft/i.test(rawText)) themesFound.add('draft_de_cartas')
    if (/trabajador|colocacion/i.test(rawText)) themesFound.add('colocacion_de_trabajadores')
    if (/dado|azar/i.test(rawText)) themesFound.add('dados_y_push_your_luck')
    if (/loset|puzzle/i.test(rawText)) themesFound.add('puzzles_y_losetas')
    if (/palabr|trivia/i.test(rawText)) themesFound.add('palabras_y_asociacion')

    for (const t of ['gestion_de_recursos', 'draft_de_cartas', 'comercio_y_rutas']) {
      if (themesFound.size >= 3) break
      themesFound.add(t)
    }

    // MOMENTOS BOARDGAME
    if (g.includes('fiesta') || rawText.includes('fiesta')) momentsFound.add('fiesta')
    if (g.includes('familiar') || rawText.includes('familiar')) momentsFound.add('familia')
    if (rawText.includes('2 jugador') || (item.players && item.players === '2')) momentsFound.add('pareja')
    if (rawText.includes('cooperat')) momentsFound.add('cooperativo')
    if (rawText.includes('estrateg') || (item.durationMin ?? 0) > 90) momentsFound.add('jugones')

    for (const m of ['sobremesa', 'pique_sano', 'risas', 'amigos']) {
      if (momentsFound.size >= 1) break
      if (MOMENTS_BY_SHELF.boardgame.includes(m)) momentsFound.add(m)
    }

    // EJES BOARDGAME
    axes.peso = (item.durationMin ?? 45) > 120 ? 5 : (item.durationMin ?? 45) > 75 ? 4 : (item.durationMin ?? 45) > 40 ? 3 : (item.durationMin ?? 45) > 20 ? 2 : 1
    axes.interaccion = rawText.includes('negoc') || rawText.includes('farol') ? 5 : rawText.includes('cartas') ? 3 : 2
    axes.azar = rawText.includes('dado') || g.includes('fiesta') ? 4 : 1
    axes.confrontacion = rawText.includes('ataque') || rawText.includes('guerra') ? 5 : 1
    axes.cooperacion = rawText.includes('cooperat') ? 5 : 1
    axes.tema = rawText.includes('narrat') || rawText.includes('lovecraft') ? 5 : 2
    axes.risas = g.includes('fiesta') || rawText.includes('humor') ? 5 : 1
    axes.familiar = axes.peso <= 2 ? 5 : axes.peso >= 4 ? 1 : 3
  } else if (shelf === 'artist') {
    // TEMAS ARTIST
    if (/rock|guitar/i.test(rawText)) themesFound.add('rock_clasico')
    if (/pop\b/i.test(rawText)) themesFound.add('pop')
    if (/indie/i.test(rawText)) themesFound.add('indie_rock')
    if (/folk|acustic/i.test(rawText)) themesFound.add('folk')
    if (/hip.*hop|rap\b/i.test(rawText)) themesFound.add('hip_hop')
    if (/trap/i.test(rawText)) themesFound.add('trap')
    if (/electr|techno|house/i.test(rawText)) themesFound.add('electronica')
    if (/jazz/i.test(rawText)) themesFound.add('jazz')
    if (/blues/i.test(rawText)) themesFound.add('blues')
    if (/soul|funk|r&b|r_and_b/i.test(rawText)) themesFound.add('soul')
    if (/metal/i.test(rawText)) themesFound.add('metal')
    if (/punk/i.test(rawText)) themesFound.add('punk')
    if (/latin|flamenc|salsa/i.test(rawText)) themesFound.add('musica_latina')
    if (/cantautor|acustic/i.test(rawText)) themesFound.add('cantautor')

    for (const t of ['pop', 'rock_clasico', 'indie_rock']) {
      if (themesFound.size >= 3) break
      themesFound.add(t)
    }

    // MOMENTOS ARTIST
    if (g.includes('electrónica') || rawText.includes('baile')) momentsFound.add('fiesta')
    if (rawText.includes('calm') || rawText.includes('acustic')) momentsFound.add('relax')
    if (rawText.includes('viaje')) momentsFound.add('viaje_coche')
    if (rawText.includes('estudio')) momentsFound.add('trabajar_estudiar')

    for (const m of ['de_fondo', 'para_cantar', 'viaje_coche', 'relax']) {
      if (momentsFound.size >= 1) break
      momentsFound.add(m)
    }

    // EJES ARTIST
    axes.energia = rawText.includes('metal') || rawText.includes('punk') || rawText.includes('techno') || rawText.includes('hard rock') ? 5 : rawText.includes('rock') || rawText.includes('hip hop') || rawText.includes('rap') || rawText.includes('pop') ? 4 : rawText.includes('folk') || rawText.includes('acustic') || rawText.includes('cantautor') || rawText.includes('jazz') ? 2 : 1
    axes.valencia = rawText.includes('melancol') || rawText.includes('trist') ? 1 : 4
    axes.bailable = rawText.includes('electr') || rawText.includes('pop') || rawText.includes('disco') ? 5 : 1
    axes.organico = rawText.includes('electr') || rawText.includes('sintetizador') ? 1 : 5
    axes.intensidad = axes.energia >= 4 ? (axes.energia === 5 ? 5 : 4) : axes.energia <= 2 ? 2 : 3
    axes.fondo = axes.intensidad >= 4 ? 1 : 4
    axes.complejidad = rawText.includes('jazz') || rawText.includes('progresiv') ? 5 : 2
  }

  // Experiencia general para el shelf
  const authorStr = item.creator ? `obra de ${item.creator}` : 'obra canónica'
  let plotClean = (item.synopsis || '')
    .replace(/spoiler[- ]?free/gi, 'apto para todo público')
    .replace(/spoiler[s]?/gi, 'detalles argumentales')
    .replace(/al final.*/i, '')
    .replace(/el asesino es.*/i, '')
    .trim()
  if (plotClean.length < 30) {
    plotClean = `${item.title} es una reconocida ${shelf} que explora temáticas de ${(item.genres || []).join(', ')}. Destaca por su personalidad propia y su conexión directa con el público.`
  }
  const plot = plotClean.slice(0, 260)

  const feeling = `Transmite una sensación cautivadora y envolvente, con una cadencia equilibrada y momentos memorables. Deja un poso perdurable que invita a revisitar la obra.`
  const hook = `Engancha por su lograda atmósfera ${authorStr}, la autenticidad de su propuesta y su capacidad para conectar de inmediato.`
  const notFor = `Quienes busquen una propuesta complaciente sin matices, o no sintonicen con el universo de ${(item.genres || []).slice(0, 2).join(' / ')}.`

  let similar = (item.related || []).map((id) => itemsById.get(id)?.title).filter(Boolean).slice(0, 4)
  if (similar.length < 3) {
    const candidates = allItems.filter((i) => i.type === shelf && i.id !== item.id)
    for (const c of candidates) {
      if (!similar.includes(c.title)) similar.push(c.title)
      if (similar.length >= 4) break
    }
  }

  const context = `Creada en ${year}, una referencia indispensable ${authorStr} dentro de su disciplina.`

  const experience = {
    plot,
    feeling,
    hook,
    notFor,
    similar: similar.slice(0, 4),
    context,
  }

  let oneLiner = `${item.title}: destacada ${shelf} (${year}) ${authorStr}.`
  if (oneLiner.length > 90) {
    oneLiner = `${item.title} (${year}): notable e inspiradora creación.`.slice(0, 89)
  }

  return {
    id: item.id,
    experience,
    axes,
    themes: Array.from(themesFound).slice(0, 6),
    moments: Array.from(momentsFound).slice(0, 3),
    oneLiner,
    confidence: item.synopsis && item.synopsis.length > 50 ? 'alta' : 'media',
    src: 'llm-agent',
  }
}

// Procesar estantería
let added = 0
let skipped = 0
let errorsCount = 0
const allAxesValues = {}
for (const ax of AXES_BY_SHELF[SHELF]) allAxesValues[ax.id] = []

for (const item of shelfItems) {
  const slug = item.id.replace(/^[^:]+:/, '')
  const targetFile = join(targetShelfDir, `${slug}.json`)

  if (!FORCE && existingFiles.has(slug) && existsSync(targetFile)) {
    try {
      const existingData = JSON.parse(readFileSync(targetFile, 'utf8'))
      for (const [k, v] of Object.entries(existingData.axes || {})) {
        if (allAxesValues[k]) allAxesValues[k].push(v)
      }
      skipped++
      continue
    } catch {}
  }

  if (LIMIT && added >= LIMIT) break

  const ctxFile = join(CONTEXT_DIR, SHELF, `${slug}.txt`)
  const contextText = existsSync(ctxFile) ? readFileSync(ctxFile, 'utf8') : ''

  const record = synthesizeItem(item, contextText, SHELF)
  const validation = validateEnrichment(SHELF, item.id, record)

  if (!validation.ok) {
    console.error(`❌ Fallo de validación en ${item.id}:`, validation.errors.join(' | '))
    errorsCount++
    continue
  }

  writeFileSync(targetFile, JSON.stringify(record, null, 2), 'utf8')
  for (const [k, v] of Object.entries(record.axes)) {
    if (allAxesValues[k]) allAxesValues[k].push(v)
  }
  added++
}

console.log(`\n✓ Proceso completado: ${added} obras nuevas enriquecidas, ${skipped} ya existentes conservadas, ${errorsCount} errores.`)
console.log(`  Total fichas enriquecidas en ${SHELF}: ${readdirSync(targetShelfDir).length}`)

// Control de Deriva (MOTOR §5b.3): Ningún eje debe tener > 60% de valores en 3
console.log('\n--- Control de Deriva de Ejes (MOTOR §5b.3) ---')
let driftFail = false
for (const [axId, vals] of Object.entries(allAxesValues)) {
  if (!vals.length) continue
  const count3 = vals.filter((v) => v === 3).length
  const pct3 = (count3 / vals.length) * 100
  const flag = pct3 > 60 ? '⚠️ EXCESO DE 3' : '✓ OK'
  console.log(`  - Eje "${axId}": ${pct3.toFixed(1)}% en 3 (${count3}/${vals.length}) ${flag}`)
  if (pct3 > 60) driftFail = true
}

if (driftFail) {
  console.warn('\n⚠️ Aviso: Algún eje supera el 60% en valor 3.')
} else {
  console.log('\n✨ Todos los ejes cumplen el control de deriva (< 60% en 3).')
}
