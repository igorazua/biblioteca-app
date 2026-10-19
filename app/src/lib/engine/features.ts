/**
 * Cargador perezoso y utilidades del motor de enriquecimiento (MOTOR.md §6.4, ENRIQUECIMIENTO.md E10).
 *
 * Expone acceso a ejes, vectores, similitud, vecinos y cruces entre estanterías.
 * Si el archivo engine/<shelf>.json no existe o falla, degrada elegantemente
 * a géneros y no rompe la experiencia de usuario.
 */

import type { ShelfType } from '../../types'
import { canonicalId } from '../../data/aliases'

export interface ShelfEngine {
  v: string
  axisIds: string[]
  ids: string[]
  axes: string // base64 de Uint8Array [n × nAxes]
  vec: string // base64 de Int8Array [n × 48]
  nn: number[][] // 20 vecinos por índice de fila
  macro: number[]
  micro: number[]
  clusterNames: { macro: string[]; micro: string[] }
  meta: Record<string, { themes: string[]; moments: string[]; conf: number }>
}

export interface CrossRecommendation {
  id: string
  kind: string
  w: number
  reason: string
}

const engineCache = new Map<ShelfType, ShelfEngine>()
let crossCache: Record<string, CrossRecommendation[]> | null = null

// Estructuras decodificadas en memoria
const decodedCache = new Map<
  ShelfType,
  {
    idToIndex: Map<string, number>
    axesMatrix: Uint8Array
    vecMatrix: Int8Array
    nAxes: number
    dim: number
  }
>()

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function base64ToInt8(b64: string): Int8Array {
  const u8 = base64ToUint8(b64)
  return new Int8Array(u8.buffer, u8.byteOffset, u8.byteLength)
}

/**
 * Carga de forma perezosa el archivo engine/<shelf>.json
 */
export async function loadShelfEngine(shelf: ShelfType): Promise<ShelfEngine | null> {
  if (engineCache.has(shelf)) return engineCache.get(shelf)!

  try {
    const mod = await import(`../../data/engine/${shelf}.json`)
    const data: ShelfEngine = mod.default || mod
    engineCache.set(shelf, data)

    // Decodificar matrices
    const idToIndex = new Map<string, number>()
    data.ids.forEach((id, idx) => idToIndex.set(id, idx))

    const axesMatrix = base64ToUint8(data.axes)
    const vecMatrix = base64ToInt8(data.vec)

    decodedCache.set(shelf, {
      idToIndex,
      axesMatrix,
      vecMatrix,
      nAxes: data.axisIds.length,
      dim: 48,
    })

    return data
  } catch {
    // Modo degradado: el archivo aún no existe o no se pudo cargar
    return null
  }
}

/** cross.json aún tiene claves y destinos con ids de gemelas fusionadas: se pasan a la obra conservada, sin repetir. */
function canonicalCross(raw: Record<string, CrossRecommendation[]>): Record<string, CrossRecommendation[]> {
  const out: Record<string, CrossRecommendation[]> = {}
  for (const [key, recs] of Object.entries(raw)) {
    const cid = canonicalId(key)
    const list = (out[cid] ??= [])
    for (const r of recs) {
      const rid = canonicalId(r.id)
      if (rid !== cid && !list.some((x) => x.id === rid)) list.push({ ...r, id: rid })
    }
  }
  return out
}

/**
 * Carga el mapa de recomendaciones entre categorías cross.json
 */
export async function loadCrossEngine(): Promise<Record<string, CrossRecommendation[]>> {
  if (crossCache) return crossCache

  try {
    const mod = await import('../../data/engine/cross.json')
    crossCache = canonicalCross(mod.default || mod)
    return crossCache!
  } catch {
    crossCache = {}
    return crossCache
  }
}

/**
 * Retorna los ejes 1-5 de una obra
 */
export function axesOf(shelf: ShelfType, id: string): Record<string, number> | null {
  const engine = engineCache.get(shelf)
  const dec = decodedCache.get(shelf)
  if (!engine || !dec) return null

  const idx = dec.idToIndex.get(id)
  if (idx == null) return null

  const res: Record<string, number> = {}
  engine.axisIds.forEach((axisId, aIdx) => {
    res[axisId] = dec.axesMatrix[idx * dec.nAxes + aIdx]
  })
  return res
}

/**
 * Retorna el vector cuantizado Int8Array [48]
 */
export function vecOf(shelf: ShelfType, id: string): Int8Array | null {
  const dec = decodedCache.get(shelf)
  if (!dec) return null

  const idx = dec.idToIndex.get(id)
  if (idx == null) return null

  return dec.vecMatrix.subarray(idx * dec.dim, (idx + 1) * dec.dim)
}

/**
 * Calcula la similitud coseno entre dos vectores cuantizados en escala 0 a 1
 */
export function sim(shelf: ShelfType, idA: string, idB: string): number {
  if (idA === idB) return 1.0

  const vA = vecOf(shelf, idA)
  const vB = vecOf(shelf, idB)
  if (!vA || !vB) return 0.5 // Fallback neutro degradado

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vA.length; i++) {
    dot += vA[i] * vB[i]
    normA += vA[i] * vA[i]
    normB += vB[i] * vB[i]
  }

  if (normA === 0 || normB === 0) return 0.5
  const cos = dot / (Math.sqrt(normA) * Math.sqrt(normB))
  // Re-escalar de [-1, 1] a [0, 1]
  return Math.max(0, Math.min(1, (cos + 1) / 2))
}

/**
 * Devuelve los K vecinos más cercanos de una obra
 */
export function neighbors(shelf: ShelfType, id: string, k: number = 10): string[] {
  const engine = engineCache.get(shelf)
  const dec = decodedCache.get(shelf)
  if (!engine || !dec) return []

  const idx = dec.idToIndex.get(id)
  if (idx == null) return []

  // los datos del motor aún incluyen gemelas fusionadas: se traducen y se quitan repetidas
  const self = canonicalId(id)
  const out: string[] = []
  for (const i of engine.nn[idx] || []) {
    const nid = canonicalId(engine.ids[i])
    if (nid !== self && !out.includes(nid)) out.push(nid)
    if (out.length >= k) break
  }
  return out
}

/**
 * Clúster grueso de una obra
 */
export function macroOf(shelf: ShelfType, id: string): number | null {
  const engine = engineCache.get(shelf)
  const dec = decodedCache.get(shelf)
  if (!engine || !dec) return null

  const idx = dec.idToIndex.get(id)
  return idx != null ? engine.macro[idx] : null
}

/**
 * Clúster fino de una obra
 */
export function microOf(shelf: ShelfType, id: string): number | null {
  const engine = engineCache.get(shelf)
  const dec = decodedCache.get(shelf)
  if (!engine || !dec) return null

  const idx = dec.idToIndex.get(id)
  return idx != null ? engine.micro[idx] : null
}

/**
 * Calcula el centroide (promedio ponderado) de un conjunto de obras
 */
export function centroid(
  shelf: ShelfType,
  ids: string[],
  weights?: number[]
): Float32Array | null {
  const dec = decodedCache.get(shelf)
  if (!dec || !ids.length) return null

  const dim = dec.dim
  const result = new Float32Array(dim)
  let totalW = 0

  ids.forEach((id, i) => {
    const v = vecOf(shelf, id)
    if (!v) return

    const w = weights && weights[i] != null ? weights[i] : 1.0
    totalW += w
    for (let d = 0; d < dim; d++) {
      result[d] += (v[d] / 127) * w
    }
  })

  if (totalW === 0) return null
  for (let d = 0; d < dim; d++) {
    result[d] /= totalW
  }

  return result
}

/**
 * Similitud entre un vector Float32Array (e.g. centroide de gustos) y una obra
 */
export function simWithCentroid(
  shelf: ShelfType,
  targetCentroid: Float32Array,
  id: string
): number {
  const v = vecOf(shelf, id)
  if (!v) return 0.5

  let dot = 0
  let normC = 0
  let normV = 0

  for (let i = 0; i < targetCentroid.length; i++) {
    const vFloat = v[i] / 127
    dot += targetCentroid[i] * vFloat
    normC += targetCentroid[i] * targetCentroid[i]
    normV += vFloat * vFloat
  }

  if (normC === 0 || normV === 0) return 0.5
  const cos = dot / (Math.sqrt(normC) * Math.sqrt(normV))
  return Math.max(0, Math.min(1, (cos + 1) / 2))
}

/**
 * Retorna las recomendaciones de otras categorías para una obra
 */
export function crossOf(id: string): CrossRecommendation[] {
  if (!crossCache) return []
  return crossCache[canonicalId(id)] || []
}
