/** Menú nativo de compartir si existe; si no, copia el link al portapapeles. Devuelve el mensaje para el aviso. */
export async function shareOrCopy(data: { title: string; text: string; url: string }): Promise<string> {
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share(data)
      return 'Compartido'
    }
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return ''
  }
  try {
    await navigator.clipboard.writeText(data.url)
    return 'Link copiado'
  } catch {
    return 'Copia el link de abajo'
  }
}
