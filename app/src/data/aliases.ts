import aliasesJson from './aliases.json'
import type { List, ShelfType, UserEntry } from '../types'

/**
 * Ids que dejaron de existir porque eran la misma obra dos veces (título en inglés y en español; ver
 * scripts/dedupe-twins.mjs) → id de la obra que se conserva. Las entradas, listas, links y datos de la nube
 * antiguos siguen funcionando pasando por aquí.
 */
const ALIASES: Record<string, string> = aliasesJson

export const canonicalId = (id: string): string => ALIASES[id] ?? id
export const isAlias = (id: string): boolean => id in ALIASES

/** Más fiable primero: con estrellas, luego ordenada, luego la más reciente. */
function better(a: UserEntry, b: UserEntry): UserEntry {
  if (Boolean(a.stars) !== Boolean(b.stars)) return a.stars ? a : b
  if (a.ranked !== b.ranked) return a.ranked ? a : b
  return (b.updatedAt ?? 0) > (a.updatedAt ?? 0) ? b : a
}

/**
 * Pasa los datos del usuario a los ids canónicos. Si tenía las dos gemelas, se queda una entrada (la mejor, con el
 * comentario de la otra si le faltaba) y el ranking conserva el puesto más alto de las dos.
 */
export function canonicalizeUserData(data: {
  entries: Record<string, UserEntry>
  rankings: Record<ShelfType, string[]>
  lists: List[]
}): { entries: Record<string, UserEntry>; rankings: Record<ShelfType, string[]>; lists: List[]; changed: boolean } {
  let changed = false
  const entries: Record<string, UserEntry> = {}
  for (const [id, e] of Object.entries(data.entries)) {
    const cid = canonicalId(id)
    const moved = cid === id ? e : { ...e, itemId: cid }
    if (cid !== id) changed = true
    const prev = entries[cid]
    if (!prev) {
      entries[cid] = moved
      continue
    }
    const win = better(prev, moved)
    const lose = win === prev ? moved : prev
    entries[cid] = { ...win, itemId: cid, ranked: win.ranked || lose.ranked, comment: win.comment ?? lose.comment, cmp: Math.max(win.cmp ?? 0, lose.cmp ?? 0) || undefined }
  }

  const rankings = {} as Record<ShelfType, string[]>
  for (const [shelf, list] of Object.entries(data.rankings) as [ShelfType, string[]][]) {
    const seen = new Set<string>()
    rankings[shelf] = []
    for (const id of list ?? []) {
      const cid = canonicalId(id)
      if (cid !== id) changed = true
      if (seen.has(cid)) continue
      seen.add(cid)
      rankings[shelf].push(cid)
    }
  }

  const lists = data.lists.map((l) => {
    if (!l.items.some((i) => isAlias(i.itemId))) return l
    changed = true
    const seen = new Set<string>()
    const items = []
    for (const i of l.items) {
      const cid = canonicalId(i.itemId)
      if (seen.has(cid)) continue
      seen.add(cid)
      items.push({ ...i, itemId: cid })
    }
    return { ...l, items }
  })

  return { entries, rankings, lists, changed }
}
