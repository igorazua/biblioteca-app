import type { ShelfType } from '../../types'

export interface AxisDefinition {
  id: string
  min: string
  max: string
}

export const AXES_BY_SHELF: Record<ShelfType, AxisDefinition[]> = {
  movie: [
    { id: 'tono', min: 'luminoso, optimista', max: 'oscuro, desolador' },
    { id: 'ritmo', min: 'pausado, contemplativo', max: 'frenético' },
    { id: 'emocion', min: 'ligera, no te remueve', max: 'te deja tocado' },
    { id: 'exigencia', min: 'para desconectar', max: 'pide atención, compleja' },
    { id: 'humor', min: 'nada de humor', max: 'comedia pura' },
    { id: 'tension', min: 'relajada', max: 'suspense o miedo constante' },
    { id: 'fantasia', min: 'realista', max: 'fantástica o imposible' },
    { id: 'violencia', min: 'ninguna', max: 'explícita y dura' },
    { id: 'familiar', min: 'solo adultos', max: 'para toda la familia' },
    { id: 'escala', min: 'íntima, pocos personajes', max: 'épica, gran escala' },
    { id: 'reconfort', min: 'incómoda', max: 'reconfortante, para repetir' },
  ],
  series: [
    { id: 'tono', min: 'luminoso, optimista', max: 'oscuro, desolador' },
    { id: 'ritmo', min: 'pausado, contemplativo', max: 'frenético' },
    { id: 'emocion', min: 'ligera, no te remueve', max: 'te deja tocado' },
    { id: 'exigencia', min: 'para desconectar', max: 'pide atención, compleja' },
    { id: 'humor', min: 'nada de humor', max: 'comedia pura' },
    { id: 'tension', min: 'relajada', max: 'suspense o miedo constante' },
    { id: 'fantasia', min: 'realista', max: 'fantástica o imposible' },
    { id: 'violencia', min: 'ninguna', max: 'explícita y dura' },
    { id: 'familiar', min: 'solo adultos', max: 'para toda la familia' },
    { id: 'escala', min: 'íntima, pocos personajes', max: 'épica, gran escala' },
    { id: 'reconfort', min: 'incómoda', max: 'reconfortante, para repetir' },
    { id: 'enganche', min: 'se deja cuando quieras', max: 'adictiva' },
    { id: 'formato', min: 'capítulos autoconclusivos', max: 'una sola historia continua' },
  ],
  book: [
    { id: 'tono', min: 'luminoso, optimista', max: 'oscuro, desolador' },
    { id: 'ritmo', min: 'pausado', max: 'no puedes soltarlo' },
    { id: 'emocion', min: 'ligera, no te remueve', max: 'te deja tocado' },
    { id: 'densidad', min: 'prosa ligera', max: 'prosa exigente' },
    { id: 'humor', min: 'nada de humor', max: 'comedia pura' },
    { id: 'tension', min: 'relajada', max: 'suspense o miedo constante' },
    { id: 'fantasia', min: 'realista', max: 'fantástica o imposible' },
    { id: 'escala', min: 'íntima, pocos personajes', max: 'épica, gran escala' },
    { id: 'ideas', min: 'pura trama', max: 'lleno de ideas para pensar' },
    { id: 'reconfort', min: 'incómodo', max: 'reconfortante, para repetir' },
  ],
  boardgame: [
    { id: 'peso', min: 'se explica en 2 min', max: 'denso, muchas reglas' },
    { id: 'interaccion', min: 'cada uno a lo suyo', max: 'todo el rato pendiente de los demás' },
    { id: 'azar', min: 'sin azar', max: 'puro azar' },
    { id: 'confrontacion', min: 'nada', max: 'ataque directo' },
    { id: 'cooperacion', min: 'competitivo', max: 'totalmente cooperativo' },
    { id: 'tema', min: 'abstracto', max: 'muy temático o narrativo' },
    { id: 'risas', min: 'serio, silencioso', max: 'risas aseguradas' },
    { id: 'familiar', min: 'jugones', max: 'cualquiera, también niños' },
  ],
  artist: [
    { id: 'energia', min: 'calma', max: 'máxima energía' },
    { id: 'valencia', min: 'melancólico', max: 'alegre' },
    { id: 'bailable', min: 'nada', max: 'para bailar' },
    { id: 'organico', min: 'electrónico o sintético', max: 'acústico u orgánico' },
    { id: 'intensidad', min: 'suave', max: 'intenso o agresivo' },
    { id: 'fondo', min: 'pide escucha atenta', max: 'perfecto de fondo' },
    { id: 'complejidad', min: 'sencillo, pegadizo', max: 'complejo' },
  ],
}
