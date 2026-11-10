import type { Item } from '@biblioteca/core'
import { titleOf } from '../../lib/item'
import { Poster } from '../Poster'
import type { Side } from '../DuelFan'

/** Lado de un duelo para una obra: título, «año · creador» y póster a sangre (sin relleno difuminado dentro del duelo). */
export const sideOf = (it: Item): Side => ({
  key: it.id,
  title: titleOf(it),
  subtitle: `${it.year} · ${it.creator}`,
  bg: <Poster item={it} noBlur showTitle={false} style={{ flex: 1 }} />,
  type: it.type,
  ratio: it.type === 'boardgame' ? it.posterRatio : undefined,
})
