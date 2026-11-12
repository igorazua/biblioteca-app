import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { isZipName } from './readFile'

export interface PickedFile {
  name: string
  /** Bytes si es un ZIP, texto en cualquier otro caso (lo que `rowsFromContent` espera). */
  content: string | Uint8Array
}

/**
 * Sustituye al `<input type="file">` de la PWA: abre el selector del sistema, copia el archivo a la caché de la app y lo lee.
 * Devuelve `null` si la persona cancela. El selector no filtra por extensión (en Android los CSV llegan con varios tipos distintos).
 */
export async function pickAndReadFile(): Promise<PickedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false })
  if (res.canceled || !res.assets?.[0]) return null
  const asset = res.assets[0]
  const file = new File(asset.uri)
  const content = isZipName(asset.name) ? await file.bytes() : await file.text()
  return { name: asset.name, content }
}
