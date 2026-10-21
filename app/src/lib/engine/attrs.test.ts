import { describe, it, expect } from 'vitest'
import { ATTRS, SOURCE_HIERARCHY, isMoreAuthoritative, validateAttrValue } from '../../../scripts/engine/attrs.mjs'

describe('Motor v2: Registro de Atributos (ATTRS)', () => {
  it('define los atributos base requeridos por MOTOR §2b.2', () => {
    expect(ATTRS).toHaveProperty('originalLanguage')
    expect(ATTRS).toHaveProperty('originCountry')
    expect(ATTRS).toHaveProperty('titles')
    expect(ATTRS).toHaveProperty('popPct')
    expect(ATTRS).toHaveProperty('notoriety')
    expect(ATTRS).toHaveProperty('trend')
    expect(ATTRS).toHaveProperty('isCanon')
    expect(ATTRS).toHaveProperty('schoolReading')
    expect(ATTRS).toHaveProperty('pageviews')
  })

  it('respeta la jerarquía estricta de fuentes de datos', () => {
    expect(isMoreAuthoritative('wikidata', 'llm-infer')).toBe(true)
    expect(isMoreAuthoritative('openlibrary', 'llm-infer')).toBe(true)
    expect(isMoreAuthoritative('wikidata', 'scrape')).toBe(true)
    expect(isMoreAuthoritative('scrape', 'llm-infer')).toBe(true)
    expect(isMoreAuthoritative('llm-search', 'llm-infer')).toBe(true)

    // Un llm-infer nunca pisa una fuente dura
    expect(isMoreAuthoritative('llm-infer', 'wikidata')).toBe(false)
    expect(isMoreAuthoritative('llm-infer', 'openlibrary')).toBe(false)
    expect(isMoreAuthoritative('llm-infer', 'musicbrainz')).toBe(false)
  })

  it('valida tipos y rechaza valores fuera de esquema', () => {
    // QID
    expect(validateAttrValue('wikidataId', 'Q12345', null, 'wikidata').valid).toBe(true)
    expect(validateAttrValue('wikidataId', '12345', null, 'wikidata').valid).toBe(false)

    // ISO Lang
    expect(validateAttrValue('originalLanguage', 'es', null, 'wikidata').valid).toBe(true)
    expect(validateAttrValue('originalLanguage', 'castellano', null, 'wikidata').valid).toBe(false)

    // ISO Country list
    expect(validateAttrValue('originCountry', ['ES', 'FR'], null, 'wikidata').valid).toBe(true)
    expect(validateAttrValue('originCountry', 'ES', null, 'wikidata').valid).toBe(false)

    // Percentile
    expect(validateAttrValue('popPct', 85.5, null, 'computed').valid).toBe(true)
    expect(validateAttrValue('popPct', 150, null, 'computed').valid).toBe(false)
  })

  it('exige prueba (evidence) cuando needsEvidence es true para llm-search', () => {
    // titles tiene needsEvidence: true
    const sinPrueba = validateAttrValue('titles', { 'es-ES': 'El padrino' }, null, 'llm-search')
    expect(sinPrueba.valid).toBe(false)
    expect(sinPrueba.error).toContain('requiere \'evidence\'')

    const conPrueba = validateAttrValue('titles', { 'es-ES': 'El padrino' }, 'https://es.wikipedia.org/wiki/El_padrino', 'llm-search')
    expect(conPrueba.valid).toBe(true)
  })
})
