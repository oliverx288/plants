import { describe, expect, it } from 'vitest'
import { parseArticle, parseSummary } from './articles'
import { groupByCategory } from './categories'
import { formatDate } from './format'
import { isUuid } from './uuid'

describe('formatDate', () => {
  it('formatea en español sin desplazar el día por la zona horaria', () => {
    expect(formatDate('2026-09-05')).toBe('5 de septiembre de 2026')
    expect(formatDate('2026-01-01')).toBe('1 de enero de 2026')
  })
  it('devuelve el texto original si no es una fecha', () => {
    expect(formatDate('no-es-fecha')).toBe('no-es-fecha')
  })
})

describe('isUuid', () => {
  it('acepta UUID y rechaza todo lo demás', () => {
    expect(isUuid('10000000-0000-4000-8000-000000000001')).toBe(true)
    for (const bad of ['', 'abc', '1; drop table articles', "' or 1=1 --", undefined, null, 42]) {
      expect(isUuid(bad)).toBe(false)
    }
  })
})

describe('groupByCategory', () => {
  const items = [
    { category: 'Suscripción', title: 'b' },
    { category: 'Zona nueva', title: 'x' },
    { category: 'GPS y ubicación', title: 'Ñu' },
    { category: 'GPS y ubicación', title: 'Árbol' },
    { category: 'Primera configuración', title: 'a' },
    { category: 'Categoría A nueva', title: 'y' },
  ]

  it('ordena las categorías conocidas por recorrido y las nuevas al final, por orden alfabético', () => {
    expect(groupByCategory(items).map((g) => g.category)).toEqual([
      'Primera configuración',
      'GPS y ubicación',
      'Suscripción',
      'Categoría A nueva',
      'Zona nueva',
    ])
  })

  it('ordena los artículos por título respetando los acentos del español', () => {
    const gps = groupByCategory(items).find((g) => g.category === 'GPS y ubicación')!
    expect(gps.items.map((i) => i.title)).toEqual(['Árbol', 'Ñu'])
  })
})

describe('parseo de datos de la red', () => {
  const section = { id: 's1', position: 0, heading: 'Pasos', body: '', steps: ['a'] }

  it('ordena las secciones por posición', () => {
    const article = parseArticle({
      id: 'a1', title: 'T', category: 'C', last_reviewed_at: '2026-01-01',
      article_sections: [{ ...section, id: 's2', position: 2 }, section, { ...section, id: 's3', position: 1 }],
    })
    expect(article.sections.map((s) => s.id)).toEqual(['s1', 's3', 's2'])
  })

  it.each([
    [null],
    [{ id: 'a1' }],
    [{ id: 'a1', title: 'T', category: 'C', last_reviewed_at: 5 }],
  ])('rechaza un resumen con forma inesperada: %j', (row) => {
    expect(() => parseSummary(row)).toThrow()
  })

  it('rechaza secciones con pasos que no son texto', () => {
    expect(() =>
      parseArticle({
        id: 'a1', title: 'T', category: 'C', last_reviewed_at: '2026-01-01',
        article_sections: [{ ...section, steps: [{ html: '<b>' }] }],
      }),
    ).toThrow()
  })
})
