/** Prefijo telefónico por país del perfil (ISO-3166). Si falta, España. */
const DIAL: Record<string, string> = {
  ES: '34', MX: '52', AR: '54', CO: '57', CL: '56', PE: '51', VE: '58', EC: '593', UY: '598', PY: '595', BO: '591',
  CR: '506', PA: '507', GT: '502', DO: '1', US: '1', GB: '44', FR: '33', PT: '351', IT: '39', DE: '49',
}

/**
 * Número en formato E.164 («+34600111222») o null si no parece un teléfono.
 * Acepta espacios, guiones, paréntesis, «00» como «+» y números sin prefijo (se añade el del país del perfil).
 */
export function normalizePhone(raw: string, country = 'ES'): string | null {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return null
  let digits = trimmed.replace(/[^\d+]/g, '')
  if (digits.startsWith('00')) digits = '+' + digits.slice(2)
  if (digits.lastIndexOf('+') > 0) return null // un «+» en medio: no es un número
  if (!digits.startsWith('+')) {
    const local = digits.replace(/^0+/, '') // prefijo troncal (0 en UK, FR…)
    if (local.length < 8) return null
    digits = `+${DIAL[country] ?? DIAL.ES}${local}`
  }
  const n = digits.slice(1)
  return /^\d{8,15}$/.test(n) ? `+${n}` : null
}

/** wa.me solo admite cifras, sin «+». */
export const waNumber = (e164: string) => e164.replace(/\D/g, '')

/** Normaliza y quita repetidos manteniendo el orden. */
export function uniquePhones(raws: string[], country = 'ES'): string[] {
  const out: string[] = []
  for (const r of raws) {
    const p = normalizePhone(r, country)
    if (p && !out.includes(p)) out.push(p)
  }
  return out
}
