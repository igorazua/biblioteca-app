/**
 * anchors.ts — Anclas y guion de los 3 primeros duelos de Decidir (T22).
 *
 * Para un usuario nuevo, los 3 primeros duelos deciden si la app «le entiende»: tienen que salir obras que conozca
 * seguro y que separen gustos de verdad. Eso no lo garantiza una fórmula: hay una lista de anclas elegida a mano
 * (`data/anchors/<shelf>.json`) y un árbol de 3 niveles generado por `buildTree` (`data/anchors/<shelf>.tree.json`).
 *
 * - `buildTree` es una función pura: depende solo de los `sides` de las anclas, de las etiquetas del catálogo visible
 *   (si existen) y de los metadatos de las obras (creador, título) para no emparejar obras de la misma familia.
 * - `nextScriptPair` recorre el árbol según los duelos ya respondidos y elige, en cada hueco, la mejor de las
 *   parejas alternativas para ese usuario (R_a · R_b, con rotación entre sesiones).
 */

import type { Item, ShelfType } from '../../types'
import type { Dimension } from './dimensions'
import { getDimensionsForShelf } from './dimensions'

import movieFile from '../../data/anchors/movie.json'
import seriesFile from '../../data/anchors/series.json'
import bookFile from '../../data/anchors/book.json'
import boardgameFile from '../../data/anchors/boardgame.json'
import artistFile from '../../data/anchors/artist.json'
import movieTree from '../../data/anchors/movie.tree.json'
import seriesTree from '../../data/anchors/series.tree.json'
import bookTree from '../../data/anchors/book.tree.json'
import boardgameTree from '../../data/anchors/boardgame.tree.json'
import artistTree from '../../data/anchors/artist.tree.json'

// ───────────────────────────── Tipos ─────────────────────────────

export type EraBand = '<1980' | '1980-1994' | '1995-2004' | '2005-2014' | '2015+'
export const ERA_BANDS: EraBand[] = ['<1980', '1980-1994', '1995-2004', '2005-2014', '2015+']

export interface Anchor {
  id: string
  /** solo las dimensiones en las que la obra está claramente en un extremo (clave del extremo) */
  sides: Record<string, string>
  era: EraBand
  why: string
}

export interface AnchorFile {
  shelf: ShelfType
  country: string
  anchors: Anchor[]
}

export interface TreePair {
  /** ancla del lado A de la dimensión del duelo */
  a: string
  /** ancla del lado B */
  b: string
  /** true si no se pudo exigir el lado ganador en todas las dimensiones anteriores (estantería escasa) */
  relaxed?: true
}

export interface TreeNode {
  dim: string
  /** reparto del catálogo (o de las anclas) en esta dimensión: min(A, B) / total; 0,5 = perfecto */
  balance: number
  /** hasta 3 parejas alternativas, sin anclas compartidas entre sí */
  pairs: TreePair[]
  A: TreeNode | null
  B: TreeNode | null
}

export interface AnchorTree {
  shelf: ShelfType
  version: 1
  /** de dónde sale el reparto del catálogo al elegir dimensión: las propias anclas o las etiquetas del catálogo (T21) */
  population?: 'anchors' | 'catalog'
  root: TreeNode | null
}

/** Etiquetas del catálogo visible: id de la obra → dimensión → clave del extremo (T21 las produce). */
export type CatalogLabels = Record<string, Record<string, string>>

// ───────────────────────────── Extremos ─────────────────────────────

/**
 * Las dos puntas de cada dimensión, [lado A, lado B]. PROVISIONAL: claves neutras alineadas con la tabla de
 * T21 §A.1 hasta que exista `labels.mjs`. El orden A/B coincide con `dimensions.ts` (p. ej. realismo: A = fantasía).
 */
const SCREEN_EXTREMES = {
  tono: ['light', 'dark'],
  humor: ['comedy', 'none'],
  intensidad: ['calm', 'tension'],
  realismo: ['fantasy', 'realistic'],
  exigencia: ['light', 'demanding'],
  publico: ['all', 'adults'],
} as const

export const ANCHOR_EXTREMES: Record<ShelfType, Record<string, readonly [string, string]>> = {
  movie: SCREEN_EXTREMES,
  series: SCREEN_EXTREMES,
  book: {
    tono: ['light', 'dark'],
    ritmo: ['fast', 'slow'],
    realismo: ['fantasy', 'realistic'],
    densidad: ['light', 'demanding'],
    humor: ['comedy', 'none'],
  },
  boardgame: {
    peso: ['light', 'heavy'],
    ambiente: ['laughs', 'serious'],
    interaccion: ['solo', 'interactive'],
    azar: ['none', 'lots'],
    tematico: ['abstract', 'thematic'],
  },
  artist: {
    energia: ['calm', 'energetic'],
    animo: ['melancholic', 'cheerful'],
    bailable: ['no', 'dance'],
    sonido: ['electronic', 'acoustic'],
  },
  song: {},
}

/** Textos por idioma (solo `es` por ahora): nombre de la dimensión y de cada extremo, y el motivo (T17 §C.5). */
const DIM_TEXT_ES: Record<string, { name: string; A: { label: string; reason: string }; B: { label: string; reason: string } }> = {
  'movie:tono': { name: 'Tono', A: { label: 'luminoso', reason: 'Porque elegiste las más luminosas' }, B: { label: 'oscuro', reason: 'Porque elegiste las más oscuras' } },
  'book:tono': { name: 'Tono', A: { label: 'luminoso', reason: 'Porque elegiste las más luminosas' }, B: { label: 'oscuro', reason: 'Porque elegiste las más oscuras' } },
  humor: { name: 'Humor', A: { label: 'comedia', reason: 'Porque elegiste las que hacen reír' }, B: { label: 'sin humor', reason: 'Porque elegiste las serias' } },
  intensidad: { name: 'Intensidad', A: { label: 'tranquila', reason: 'Porque elegiste las tranquilas' }, B: { label: 'de tensión', reason: 'Porque elegiste las de tensión' } },
  realismo: { name: 'Realismo', A: { label: 'fantasía', reason: 'Porque elegiste las de fantasía' }, B: { label: 'realista', reason: 'Porque elegiste las realistas' } },
  exigencia: { name: 'Exigencia', A: { label: 'ligera', reason: 'Porque elegiste las ligeras' }, B: { label: 'exigente', reason: 'Porque elegiste las exigentes' } },
  publico: { name: 'Público', A: { label: 'para todos', reason: 'Porque elegiste las aptas para todos' }, B: { label: 'adultos', reason: 'Porque elegiste las para adultos' } },
  ritmo: { name: 'Ritmo', A: { label: 'trepidante', reason: 'Porque elegiste las trepidantes' }, B: { label: 'pausado', reason: 'Porque elegiste las pausadas' } },
  densidad: { name: 'Densidad', A: { label: 'ligera', reason: 'Porque elegiste las de lectura ligera' }, B: { label: 'exigente', reason: 'Porque elegiste las de lectura exigente' } },
  peso: { name: 'Peso', A: { label: 'ligero', reason: 'Porque elegiste los ligeros' }, B: { label: 'de pensar', reason: 'Porque elegiste los de pensar' } },
  ambiente: { name: 'Ambiente', A: { label: 'de risas', reason: 'Porque elegiste los de risas' }, B: { label: 'serio', reason: 'Porque elegiste los serios' } },
  interaccion: { name: 'Interacción', A: { label: 'cada uno a lo suyo', reason: 'Porque elegiste los de jugar cada uno a lo suyo' }, B: { label: 'todo el rato con los demás', reason: 'Porque elegiste los de estar todo el rato con los demás' } },
  azar: { name: 'Azar', A: { label: 'sin azar', reason: 'Porque elegiste los sin azar' }, B: { label: 'mucho azar', reason: 'Porque elegiste los de mucho azar' } },
  tematico: { name: 'Temática', A: { label: 'abstracto', reason: 'Porque elegiste los abstractos' }, B: { label: 'muy temático', reason: 'Porque elegiste los muy temáticos' } },
  energia: { name: 'Energía', A: { label: 'tranquilo', reason: 'Porque elegiste la música tranquila' }, B: { label: 'de energía', reason: 'Porque elegiste la música con energía' } },
  animo: { name: 'Ánimo', A: { label: 'melancólico', reason: 'Porque elegiste la música melancólica' }, B: { label: 'alegre', reason: 'Porque elegiste la música alegre' } },
  bailable: { name: 'Baile', A: { label: 'nada bailable', reason: 'Porque elegiste la música para escuchar' }, B: { label: 'para bailar', reason: 'Porque elegiste la música para bailar' } },
  sonido: { name: 'Sonido', A: { label: 'electrónico', reason: 'Porque elegiste el sonido electrónico' }, B: { label: 'acústico', reason: 'Porque elegiste el sonido acústico' } },
}

// ───────────────────────────── Datos ─────────────────────────────

const FILES: Record<ShelfType, AnchorFile> = {
  movie: movieFile as unknown as AnchorFile,
  series: seriesFile as unknown as AnchorFile,
  book: bookFile as unknown as AnchorFile,
  boardgame: boardgameFile as unknown as AnchorFile,
  artist: artistFile as unknown as AnchorFile,
  song: { version: 1, shelf: 'song', country: 'ES', anchors: [] } as AnchorFile,
}

const TREES: Record<ShelfType, AnchorTree> = {
  movie: movieTree as unknown as AnchorTree,
  series: seriesTree as unknown as AnchorTree,
  book: bookTree as unknown as AnchorTree,
  boardgame: boardgameTree as unknown as AnchorTree,
  artist: artistTree as unknown as AnchorTree,
  song: { version: 1, shelf: 'song', root: null, pairs: [] } as AnchorTree,
}

export function getAnchors(shelf: ShelfType): Anchor[] {
  return FILES[shelf]?.anchors ?? []
}
export function getAnchorFile(shelf: ShelfType): AnchorFile {
  return FILES[shelf]
}
export function getTree(shelf: ShelfType): AnchorTree {
  return TREES[shelf]
}

// ───────────────────────────── Lados ─────────────────────────────

type Side = 'A' | 'B'

/** Lado (A/B) de unos `sides` en una dimensión, o null si no está en un extremo. */
export function sideOfSides(shelf: ShelfType, sides: Record<string, string> | undefined, dim: string): Side | null {
  const ex = ANCHOR_EXTREMES[shelf]?.[dim]
  const v = sides?.[dim]
  if (!ex || !v) return null
  return v === ex[0] ? 'A' : v === ex[1] ? 'B' : null
}

let catalogLabels: Partial<Record<ShelfType, CatalogLabels>> = {}
/** T21 llama a esto cuando existan las etiquetas del catálogo (pasa `null` para quitarlas). */
export function setCatalogLabels(shelf: ShelfType, labels: CatalogLabels | null): void {
  if (labels) catalogLabels[shelf] = labels
  else delete catalogLabels[shelf]
}
export function resetCatalogLabels(): void {
  catalogLabels = {}
}

const anchorSidesCache = new Map<ShelfType, Map<string, Record<string, string>>>()
function anchorSides(shelf: ShelfType): Map<string, Record<string, string>> {
  let m = anchorSidesCache.get(shelf)
  if (!m) {
    m = new Map(getAnchors(shelf).map((a) => [a.id, a.sides]))
    anchorSidesCache.set(shelf, m)
  }
  return m
}

/** Dimensión de `dimensions.ts` equivalente a una dimensión del guion (mismo orden A/B), para inferir lados. */
const LEGACY_DIM: Record<ShelfType, Record<string, string>> = {
  movie: { humor: 'tono_comedia_drama', intensidad: 'intensidad_tension', realismo: 'realismo_fantasia' },
  series: { humor: 'tono_comedia_drama', intensidad: 'intensidad_tension', realismo: 'realismo_fantasia' },
  book: { realismo: 'realismo_fantasia', ritmo: 'libros_ritmo_trepidante_pausado' },
  boardgame: { peso: 'juegos_peso_reglas', ambiente: 'juegos_ambiente_fiesta_estrategia' },
  artist: { energia: 'artistas_energia', sonido: 'artistas_sonido_acustico_electronico' },
  song: {},
}

export const ANCHOR_DIM_PREFIX = 'anc:'
export const ancDimId = (dim: string) => `${ANCHOR_DIM_PREFIX}${dim}`
export const isAnchorDimId = (id?: string | null): id is string => typeof id === 'string' && id.startsWith(ANCHOR_DIM_PREFIX)

/** Id de la dimensión de `dimensions.ts` que refleja una dimensión del guion (para copiar la preferencia). */
export function legacyDimensionFor(shelf: ShelfType, dimId: string): string | undefined {
  return isAnchorDimId(dimId) ? LEGACY_DIM[shelf]?.[dimId.slice(ANCHOR_DIM_PREFIX.length)] : undefined
}

/**
 * Lado de una obra en una dimensión del guion. Orden de fiabilidad:
 * 1. los `sides` escritos a mano de las anclas (y de las `extra` que se pasen);
 * 2. las etiquetas del catálogo (T21), si existen;
 * 3. (solo si `inferred`) la dimensión equivalente de `dimensions.ts`, que se basa en géneros y ejes: es una estimación.
 */
export function resolveSide(
  item: Item,
  dim: string,
  opts: { inferred?: boolean; extra?: Anchor[] } = {}
): Side | null {
  const shelf = item.type
  const own = anchorSides(shelf).get(item.id)
  if (own) {
    const s = sideOfSides(shelf, own, dim)
    if (s) return s
  }
  const ex = opts.extra?.find((a) => a.id === item.id)
  if (ex) {
    const s = sideOfSides(shelf, ex.sides, dim)
    if (s) return s
  }
  const lab = catalogLabels[shelf]?.[item.id]
  if (lab) {
    const s = sideOfSides(shelf, lab, dim)
    if (s) return s
  }
  if (opts.inferred) {
    const legacyId = LEGACY_DIM[shelf]?.[dim]
    if (legacyId) {
      const d = getDimensionsForShelf(shelf).find((x) => x.id === legacyId)
      if (d) return d.side(item)
    }
  }
  return null
}

const dimsCache = new Map<ShelfType, Dimension[]>()
/** Las dimensiones del guion con la misma forma que las de `dimensions.ts`, para que Decidir las trate igual. */
export function getAnchorDimensions(shelf: ShelfType): Dimension[] {
  let dims = dimsCache.get(shelf)
  if (dims) return dims
  dims = Object.keys(ANCHOR_EXTREMES[shelf] ?? {}).map((dim) => {
    const t = DIM_TEXT_ES[`${shelf === 'series' ? 'movie' : shelf}:${dim}`] ?? DIM_TEXT_ES[dim]
    return {
      id: ancDimId(dim),
      shelves: [shelf],
      name: t?.name ?? dim,
      sideA: t?.A ?? { label: dim, reason: '' },
      sideB: t?.B ?? { label: dim, reason: '' },
      side: (it: Item) => resolveSide(it, dim, { inferred: true }),
      purity: () => 1,
    } satisfies Dimension
  })
  dimsCache.set(shelf, dims)
  return dims
}

// ───────────────────────────── Familia (sin importar decide.ts) ─────────────────────────────

const normTitle = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^(the|el|la|los|las|le) /, '').trim()
const famKey = (it: Item) => normTitle(it.title.split(/:| - | – |\(/)[0])
const creatorsOf = (it: Item) => (it.type === 'artist' ? [] : (it.creator ?? '').split(',').map((c) => c.trim().toLowerCase()).filter(Boolean))
/** Misma saga o mismo creador (los artistas no tienen «creador» aparte). */
export function sameSagaOrCreator(a: Item, b: Item): boolean {
  const ka = famKey(a)
  const kb = famKey(b)
  if (ka && kb && (ka === kb || ka.startsWith(kb + ' ') || kb.startsWith(ka + ' '))) return true
  const cb = new Set(creatorsOf(b))
  return creatorsOf(a).some((c) => cb.has(c))
}

// ───────────────────────────── buildTree ─────────────────────────────

export interface BuildOptions {
  shelf: ShelfType
  /** para no emparejar obras de la misma saga o creador y para desempatar por fama */
  itemsById?: Map<string, Item> | Record<string, Item>
  /** máximo de parejas alternativas por hueco (3 por defecto) */
  alternatives?: number
  depth?: number
}

export interface PathConstraint {
  dim: string
  side: Side
}


/**
 * Genera el árbol de 3 niveles de una estantería (T22 §22.2). Función pura y determinista.
 *
 * - Duelo 1: la dimensión que mejor reparte (la que deja más cerca de la mitad en cada lado), con dos anclas de
 *   extremos opuestos y lo más neutras en las demás.
 * - Duelos 2 y 3: dentro del lado ganador de las anteriores.
 * - Por hueco, hasta `alternatives` parejas sin anclas compartidas.
 *
 * `labels`: etiquetas del catálogo visible (T21). Si no hay, el reparto se mide sobre las propias anclas.
 */
export function buildTree(anchors: Anchor[], labels: CatalogLabels | null | undefined, opts: BuildOptions): AnchorTree {
  const builder = createTreeBuilder(anchors, labels, opts)
  return {
    shelf: opts.shelf,
    version: 1,
    population: labels ? 'catalog' : 'anchors',
    root: builder.build([], new Set(), 0),
  }
}

export interface TreeBuilder {
  /** nodo (con su subárbol) para un camino de respuestas, sin usar las anclas de `excluded` */
  build: (path: PathConstraint[], excluded: Set<string>, depth: number) => TreeNode | null
}

/** El constructor de nodos de `buildTree`, reutilizable en ejecución para completar ramas que el árbol guardado no tiene. */
export function createTreeBuilder(anchors: Anchor[], labels: CatalogLabels | null | undefined, opts: BuildOptions): TreeBuilder {
  const { shelf } = opts
  const maxAlts = opts.alternatives ?? 3
  const maxDepth = opts.depth ?? 3
  const extremes = ANCHOR_EXTREMES[shelf]
  const dims = Object.keys(extremes)
  const itemsById: Map<string, Item> | undefined = opts.itemsById
    ? opts.itemsById instanceof Map
      ? opts.itemsById
      : new Map(Object.entries(opts.itemsById))
    : undefined

  const anchorById = new Map(anchors.map((a) => [a.id, a]))
  const sideOf = (sides: Record<string, string>, dim: string) => sideOfSides(shelf, sides, dim)

  // Población con la que se mide el reparto: el catálogo visible etiquetado, o las anclas.
  const population: { id: string; sides: Record<string, string> }[] = labels
    ? Object.entries(labels).map(([id, sides]) => ({ id, sides }))
    : anchors.map((a) => ({ id: a.id, sides: a.sides }))

  const sortedAnchors = [...anchors].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))

  const meets = (sides: Record<string, string>, path: PathConstraint[], strict: boolean) =>
    path.every((c) => {
      const s = sideOf(sides, c.dim)
      return s === c.side || (!strict && s === null)
    })

  const pairScore = (a: Anchor, b: Anchor, path: PathConstraint[], dim: string): number => {
    const fixed = new Set([dim, ...path.map((p) => p.dim)])
    let confounds = 0
    let oneSided = 0
    for (const d of dims) {
      if (fixed.has(d)) continue
      const sa = sideOf(a.sides, d)
      const sb = sideOf(b.sides, d)
      if (sa && sb && sa !== sb) confounds++
      else if ((sa && !sb) || (!sa && sb)) oneSided++
    }
    // Solo cuenta la neutralidad en las demás dimensiones. No se usa la fama para desempatar: el árbol guardado no debe
    // cambiar si cambian las notoriedades del catálogo (en ejecución ya se elige por R_a · R_b); los empates se rompen por id.
    return -(confounds * 1.0 + oneSided * 0.25)
  }

  /** parejas válidas para una dimensión y un camino, de mejor a peor; en modo `relaxed` se admiten neutros en el camino */
  const candidatePairs = (dim: string, path: PathConstraint[], excluded: Set<string>, relaxed: boolean) => {
    const pool = sortedAnchors.filter((a) => !excluded.has(a.id) && meets(a.sides, path, !relaxed))
    const sideA = pool.filter((a) => sideOf(a.sides, dim) === 'A')
    const sideB = pool.filter((a) => sideOf(a.sides, dim) === 'B')
    const out: { a: Anchor; b: Anchor; score: number }[] = []
    for (const a of sideA) {
      for (const b of sideB) {
        if (a.id === b.id) continue
        const ia = itemsById?.get(a.id)
        const ib = itemsById?.get(b.id)
        if (ia && ib && sameSagaOrCreator(ia, ib)) continue
        out.push({ a, b, score: pairScore(a, b, path, dim) })
      }
    }
    out.sort((x, y) => y.score - x.score || (x.a.id + x.b.id < y.a.id + y.b.id ? -1 : 1))
    return out
  }

  const disjoint = (pairs: { a: Anchor; b: Anchor }[]) => {
    const used = new Set<string>()
    const chosen: { a: Anchor; b: Anchor }[] = []
    for (const p of pairs) {
      if (used.has(p.a.id) || used.has(p.b.id)) continue
      used.add(p.a.id)
      used.add(p.b.id)
      chosen.push(p)
      if (chosen.length >= maxAlts) break
    }
    return chosen
  }

  const build = (path: PathConstraint[], excluded: Set<string>, depth: number): TreeNode | null => {
    if (depth >= maxDepth) return null
    const used = new Set(path.map((p) => p.dim))
    const pop = population.filter((p) => meets(p.sides, path, true))
    const total = pop.length

    for (const relaxed of [false, true]) {
      const options: { dim: string; balance: number; pairs: { a: Anchor; b: Anchor }[] }[] = []
      for (const dim of dims) {
        if (used.has(dim)) continue
        const pairs = disjoint(candidatePairs(dim, path, excluded, relaxed))
        if (pairs.length === 0) continue
        let nA = 0
        let nB = 0
        for (const p of pop) {
          const s = sideOf(p.sides, dim)
          if (s === 'A') nA++
          else if (s === 'B') nB++
        }
        const balance = total ? Math.min(nA, nB) / total : 0
        options.push({ dim, balance, pairs })
      }
      if (options.length === 0) continue
      const maxA = Math.max(...options.map((o) => o.pairs.length))
      const wanted = Math.min(maxA, 2)
      const eligible = options.filter((o) => o.pairs.length >= wanted)
      eligible.sort((x, y) => y.balance - x.balance || dims.indexOf(x.dim) - dims.indexOf(y.dim))
      const best = eligible[0]
      const node: TreeNode = {
        dim: best.dim,
        balance: Math.round(best.balance * 1000) / 1000,
        pairs: best.pairs.map((p) => ({ a: p.a.id, b: p.b.id, ...(relaxed ? { relaxed: true as const } : {}) })),
        A: null,
        B: null,
      }
      const allIds = new Set([...excluded, ...best.pairs.flatMap((p) => [p.a.id, p.b.id])])
      const firstIds = new Set([...excluded, best.pairs[0].a.id, best.pairs[0].b.id])
      for (const side of ['A', 'B'] as const) {
        const childPath = [...path, { dim: best.dim, side }]
        node[side] = build(childPath, allIds, depth + 1) ?? build(childPath, firstIds, depth + 1)
      }
      return node
    }
    return null
  }

  void anchorById
  return { build }
}

/** Texto del árbol para revisión: «Duelo 1: A o B (dimensión). Si gana A → Duelo 2: …». */
export function describeTree(tree: AnchorTree, titleOf: (id: string) => string): string {
  const lines: string[] = []
  const walk = (node: TreeNode | null, indent: string, label: string, depth: number) => {
    if (!node) return
    const pairs = node.pairs.map((p) => `${titleOf(p.a)} o ${titleOf(p.b)}${p.relaxed ? ' (relajada)' : ''}`)
    lines.push(`${indent}${label}Duelo ${depth + 1} (${node.dim}, reparto ${node.balance}): ${pairs[0]}`)
    for (let i = 1; i < pairs.length; i++) lines.push(`${indent}    alternativa ${i}: ${pairs[i]}`)
    const ex = ANCHOR_EXTREMES[tree.shelf][node.dim]
    walk(node.A, indent + '  ', `Si gana el lado «${ex[0]}» → `, depth + 1)
    walk(node.B, indent + '  ', `Si gana el lado «${ex[1]}» → `, depth + 1)
  }
  walk(tree.root, '', '', 0)
  return lines.join('\n')
}

// ───────────────────────────── Ejecución del guion ─────────────────────────────

export interface ScriptDuelRecord {
  a: string
  b: string
  winner: string | null
  dimension?: string
  unknown?: boolean
}

export interface ScriptInput {
  tree: AnchorTree
  shelf: ShelfType
  itemsById: Map<string, Item>
  duels: ScriptDuelRecord[]
  /** obras ya enseñadas en la sesión */
  shown: Set<string>
  recogOf: (it: Item) => number
  isOwn: (it: Item) => boolean
  /** obras propias de la estantería (para sustituir anclas cuando hay 5 o más) */
  ownItems?: Item[]
  /** ranking propio de la estantería, de mejor a peor (prefiere los extremos al sustituir) */
  ranking?: string[]
  /** orientadores de las últimas sesiones (parejas consecutivas) para rotar */
  recentOrienters?: string[][]
  /** anclas que aporta el usuario (T25); como mucho una por pareja */
  extraAnchors?: Anchor[]
  /** lista de anclas de la estantería (por defecto, la de data/anchors) */
  anchors?: Anchor[]
  /**
   * dimensiones que las preguntas previas ya fijaron (T17 §B.2: «se cuentan como respondidas y no se preguntan»):
   * no se vuelven a preguntar y las parejas tienen que ser de ese lado. Con alguna, el guion se construye en ejecución.
   */
  preAnswered?: { dim: string; side: 'A' | 'B' }[]
  depth?: number
  /** mínimo de obras propias para mezclarlas (5) */
  minOwnToMix?: number
}

export interface ScriptSelection {
  a: Item
  b: Item
  dim: string
  dimensionId: string
  depth: number
  nodePath: string
  rA: number
  rB: number
  substituted: { a: boolean; b: boolean }
}

function remaining(node: TreeNode, shown: Set<string>, itemsById: Map<string, Item>): TreePair[] {
  return node.pairs.filter((p) => {
    if (shown.has(p.a) || shown.has(p.b)) return false
    const ia = itemsById.get(p.a)
    const ib = itemsById.get(p.b)
    return Boolean(ia && ib && !ia.hidden && !ib.hidden)
  })
}

/** Hijo por defecto cuando no hay ganador (se agotó el hueco): el que tiene más alternativas; a igualdad, el lado A. */
function staticChild(node: TreeNode): { child: TreeNode | null; side: Side | null } {
  const a = node.A
  const b = node.B
  if (a && (!b || a.pairs.length >= b.pairs.length)) return { child: a, side: 'A' }
  if (b) return { child: b, side: 'B' }
  return { child: null, side: null }
}

function rotationFactor(recent: string[][] | undefined, a: string, b: string): number {
  if (!recent?.length) return 1
  let f = 1
  for (const sess of recent) {
    let hit = 0
    let pairHit = false
    for (let i = 0; i < sess.length; i += 2) {
      const x = sess[i]
      const y = sess[i + 1]
      if ((x === a && y === b) || (x === b && y === a)) pairHit = true
    }
    if (sess.includes(a)) hit++
    if (sess.includes(b)) hit++
    if (pairHit) f *= 0.1
    else if (hit) f *= 0.7
  }
  return f
}

/**
 * Siguiente pareja del guion para esta sesión, o null si el guion ya terminó (3 duelos respondidos) o no aplica.
 * Reconstruye la posición en el árbol a partir de los duelos de la sesión, así que no necesita estado propio.
 */
export function nextScriptPair(inp: ScriptInput): ScriptSelection | null {
  const { tree, shelf, itemsById } = inp
  const maxDepth = inp.depth ?? 3
  const pre = inp.preAnswered ?? []
  if (!tree?.root && pre.length === 0) return null

  // Si el árbol guardado no tiene una rama (estanterías escasas) o un hueco se queda sin parejas libres por culpa de
  // obras de duelos anteriores, se completa con el mismo constructor que usa buildTree. Es determinista.
  let builder: TreeBuilder | null = null
  const getBuilder = () => (builder ??= createTreeBuilder(inp.anchors ?? getAnchors(shelf), null, { shelf, itemsById }))

  let node: TreeNode | null = pre.length > 0 ? null : tree.root
  let depth = 0
  const path: PathConstraint[] = pre.map((p) => ({ dim: p.dim, side: p.side }))
  const nodePath: string[] = []
  const seen = new Set<string>()
  let passesAtNode = 0

  const advance = (dim: string | null, side: Side | null) => {
    if (side === null) {
      if (node) {
        const sc = staticChild(node)
        node = sc.child
        nodePath.push(sc.side ?? '-')
      } else {
        nodePath.push('-')
      }
    } else {
      path.push({ dim: dim!, side })
      nodePath.push(side)
      node = node ? node[side] : null
    }
    depth++
    passesAtNode = 0
  }

  // 1. Reconstruir dónde estamos a partir de los duelos del guion ya jugados
  for (const d of inp.duels) {
    // Un «Pasar» sin dimensión registrada (p. ej. al restaurar una sesión) cuenta como del guion si sus dos obras
    // son una de las parejas del hueco actual.
    const isScriptedPass =
      !isAnchorDimId(d.dimension) &&
      (d.unknown || !d.winner) &&
      Boolean(node?.pairs.some((p) => (p.a === d.a && p.b === d.b) || (p.a === d.b && p.b === d.a)))
    if (!isAnchorDimId(d.dimension) && !isScriptedPass) continue
    seen.add(d.a)
    seen.add(d.b)
    const dim = isAnchorDimId(d.dimension) ? d.dimension.slice(ANCHOR_DIM_PREFIX.length) : (node?.dim ?? '')
    if (d.unknown || !d.winner) {
      passesAtNode++
      if (node && remaining(node, seen, itemsById).length === 0) advance(null, null)
    } else {
      const w = itemsById.get(d.winner)
      const l = itemsById.get(d.winner === d.a ? d.b : d.a)
      let side: Side | null = w ? resolveSide(w, dim, { inferred: true, extra: inp.extraAnchors }) : null
      if (!side && l) {
        const sl = resolveSide(l, dim, { inferred: true, extra: inp.extraAnchors })
        side = sl === 'A' ? 'B' : sl === 'B' ? 'A' : null
      }
      advance(side ? dim : null, side)
    }
    if (depth >= maxDepth) return null
  }

  // 2. Hueco actual: el del árbol; si no existe, uno construido; si se ha agotado, la siguiente rama
  const blocked = new Set([...inp.shown, ...seen])
  for (;;) {
    if (depth >= maxDepth) return null
    if (!node) {
      node = getBuilder().build(path, blocked, depth)
      if (!node) return null
    }
    if (remaining(node, blocked, itemsById).length > 0) break
    if (passesAtNode === 0) {
      // no se ha pasado nada aquí: las parejas están ocupadas por obras de duelos anteriores; se rehace el hueco
      const fresh = getBuilder().build(path, blocked, depth)
      if (fresh && remaining(fresh, blocked, itemsById).length > 0) {
        node = fresh
        break
      }
    }
    advance(null, null)
  }

  // 3. Elegir la alternativa con mayor R_a · R_b para este usuario, rotando respecto a sesiones recientes
  const alts = remaining(node, blocked, itemsById)
  let best: { p: TreePair; a: Item; b: Item; score: number; rA: number; rB: number } | null = null
  for (const p of alts) {
    const a = itemsById.get(p.a)!
    const b = itemsById.get(p.b)!
    const rA = inp.isOwn(a) ? 1 : inp.recogOf(a)
    const rB = inp.isOwn(b) ? 1 : inp.recogOf(b)
    const score = rA * rB * rotationFactor(inp.recentOrienters, p.a, p.b)
    if (!best || score > best.score + 1e-12) best = { p, a, b, score, rA, rB }
  }
  if (!best) return null

  let { a, b, rA, rB } = best
  const substituted = { a: false, b: false }
  const dim = node.dim

  // 4. Mezclar con lo del usuario: obras propias del mismo extremo (con 5 o más), y anclas aportadas (T25), máx. 1 por pareja
  const ownItems = inp.ownItems ?? []
  const okPath = (it: Item) =>
    path.every((c) => {
      const s = resolveSide(it, c.dim, { inferred: true, extra: inp.extraAnchors })
      return s === null || s === c.side
    })
  const pickOwn = (side: Side, other: Item): Item | null => {
    const ranking = inp.ranking ?? []
    const cands = ownItems.filter(
      (o) =>
        !blocked.has(o.id) &&
        !o.hidden &&
        o.id !== other.id &&
        resolveSide(o, dim, { inferred: true, extra: inp.extraAnchors }) === side &&
        okPath(o) &&
        !sameSagaOrCreator(o, other)
    )
    if (!cands.length) return null
    const rankScore = (o: Item) => {
      const i = ranking.indexOf(o.id)
      if (i < 0) return 0.5
      const edge = Math.min(i, ranking.length - 1 - i)
      return 1 / (1 + edge)
    }
    cands.sort((x, y) => rankScore(y) - rankScore(x) || (x.id < y.id ? -1 : 1))
    return cands[0]
  }
  if (ownItems.length >= (inp.minOwnToMix ?? 5)) {
    const ownA = pickOwn('A', b)
    if (ownA) {
      a = ownA
      rA = 1
      substituted.a = true
    }
    const ownB = pickOwn('B', a)
    if (ownB) {
      b = ownB
      rB = 1
      substituted.b = true
    }
  }
  if (inp.extraAnchors?.length && !substituted.a && !substituted.b) {
    for (const [side, slot] of [['A', 'a'], ['B', 'b']] as const) {
      const other = slot === 'a' ? b : a
      const cand = inp.extraAnchors
        .map((x) => itemsById.get(x.id))
        .filter((x): x is Item => Boolean(x) && !blocked.has(x!.id) && !x!.hidden && x!.id !== other.id)
        .filter((x) => resolveSide(x, dim, { extra: inp.extraAnchors }) === side && okPath(x) && !sameSagaOrCreator(x, other))
        .sort((x, y) => inp.recogOf(y) - inp.recogOf(x) || (x.id < y.id ? -1 : 1))[0]
      if (cand) {
        if (slot === 'a') {
          a = cand
          rA = inp.isOwn(cand) ? 1 : inp.recogOf(cand)
          substituted.a = true
        } else {
          b = cand
          rB = inp.isOwn(cand) ? 1 : inp.recogOf(cand)
          substituted.b = true
        }
        break
      }
    }
  }

  return { a, b, dim, dimensionId: ancDimId(dim), depth, nodePath: nodePath.join(''), rA, rB, substituted }
}
