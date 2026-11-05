/**
 * Analizador CSV compatible con comas dentro de comillas,
 * saltos de línea y comillas dobles escapadas ("").
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  let i = 0

  // Eliminar BOM de UTF-8 si está presente
  const cleaned = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  while (i < cleaned.length) {
    const char = cleaned[i]
    const nextChar = cleaned[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"'
        i += 2
      } else if (char === '"') {
        inQuotes = false
        i++
      } else {
        currentField += char
        i++
      }
    } else {
      if (char === '"') {
        inQuotes = true
        i++
      } else if (char === ',') {
        currentRow.push(currentField)
        currentField = ''
        i++
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField)
        rows.push(currentRow)
        currentRow = []
        currentField = ''
        i += 2
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentField)
        rows.push(currentRow)
        currentRow = []
        currentField = ''
        i++
      } else {
        currentField += char
        i++
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }

  if (rows.length < 2) return []

  const headers = rows[0].map((h) => h.trim())
  const result: Record<string, string>[] = []

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (row.length === 1 && !row[0].trim()) continue
    const obj: Record<string, string> = {}
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c] !== undefined ? row[c].trim() : ''
    }
    result.push(obj)
  }

  return result
}
