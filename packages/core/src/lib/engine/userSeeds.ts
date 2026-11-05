/**
 * userSeeds.ts — Anclas que aporta el propio usuario (T22 §22.3, esqueleto; lo implementa T25).
 *
 * `decide.ts` llama a `userSeedAnchors(ctx)` y mezcla lo que devuelva con las anclas de la estantería
 * (como candidatas a sustituir un hueco del guion de los 3 primeros duelos). Hoy no devuelve nada.
 */

import type { Friend, Profile, ShelfType, UserEntry } from '../../types'
import type { Anchor } from './anchors'

export interface UserSeedContext {
  shelf: ShelfType
  profile?: Partial<Profile>
  entries?: Record<string, UserEntry>
  friends?: Friend[]
}

/** T25 lo rellena: obras del top del amigo que invitó y adaptaciones de otras estanterías. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function userSeedAnchors(_ctx: UserSeedContext): Anchor[] {
  return []
}
