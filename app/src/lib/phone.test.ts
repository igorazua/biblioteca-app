import { describe, it, expect } from 'vitest'
import { normalizePhone, uniquePhones, waNumber } from './phone'

describe('Teléfonos', () => {
  it('normaliza los formatos habituales de la agenda a E.164', () => {
    expect(normalizePhone('600 11 22 33')).toBe('+34600112233')
    expect(normalizePhone('+34 600-11-22-33')).toBe('+34600112233')
    expect(normalizePhone('0034 600112233')).toBe('+34600112233')
    expect(normalizePhone('(+34) 600 112 233')).toBe('+34600112233')
    expect(normalizePhone('55 1234 5678', 'MX')).toBe('+525512345678')
    expect(normalizePhone('07700 900123', 'GB')).toBe('+447700900123')
  })

  it('descarta lo que no es un teléfono', () => {
    expect(normalizePhone('')).toBeNull()
    expect(normalizePhone('112')).toBeNull()
    expect(normalizePhone('ana@correo.com')).toBeNull()
    expect(normalizePhone('+34 600+11')).toBeNull()
    expect(normalizePhone('+1234567890123456')).toBeNull()
  })

  it('quita repetidos tras normalizar y prepara el número para wa.me', () => {
    expect(uniquePhones(['600112233', '+34 600 112 233', 'basura', '611223344'])).toEqual(['+34600112233', '+34611223344'])
    expect(waNumber('+34600112233')).toBe('34600112233')
  })
})
