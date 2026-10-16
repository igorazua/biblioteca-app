/** Entradas en percentil 0-100 (D25). afinidad = 100 − media(|tu percentil − su percentil|) sobre items comunes (mínimo 3). */
export function affinity(mine: Record<string, number>, theirs: Record<string, number>): number | null {
  const common = Object.keys(mine).filter((id) => theirs[id] !== undefined)
  if (common.length < 3) return null
  const mean = common.reduce((a, id) => a + Math.abs(mine[id] - theirs[id]), 0) / common.length
  return Math.max(0, Math.min(100, Math.round(100 - mean)))
}
