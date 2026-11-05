// Tipos comunes de «Conectar»: cada servicio devuelve filas ImportRow[] y entran por el flujo de emparejar y revisar.
import type { ImportRow } from '../import/types'
import type { ShelfType } from '../../types'

export type ConnectMethod = 'oauth' | 'username' | 'file' | 'soon'

export interface Connection {
  service: string
  /** usuario público (o id numérico en Goodreads) */
  handle?: string
}

export interface Connector {
  id: string
  method: ConnectMethod
  shelves: ShelfType[]
  fetchRows(conn: Connection): Promise<ImportRow[]>
  /** El contenido del archivo ya leído por la app (texto o bytes): el motor no toca `File` ni `FileReader`. */
  parseFile?(content: string | Uint8Array): Promise<ImportRow[]>
}

/** El servicio (o nuestra función de servidor) todavía no está disponible: se enseña «Disponible muy pronto». */
export class ConnectorUnavailable extends Error {
  constructor(message = 'Disponible muy pronto') {
    super(message)
    this.name = 'ConnectorUnavailable'
  }
}

/** Error con un mensaje que se puede enseñar tal cual al usuario (usuario inexistente, perfil privado…). */
export class ConnectorUserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConnectorUserError'
  }
}
