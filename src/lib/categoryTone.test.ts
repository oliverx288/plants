import { describe, expect, it } from 'vitest'
import { CATEGORY_TONES, categoryTone } from './categories'

describe('categoryTone (color de la etiqueta de categoría)', () => {
  it('las categorías conocidas siguen el orden y las contiguas tienen colores distintos', () => {
    const known = [
      'Primera configuración', 'GPS y ubicación', 'Batería y carga', 'Botón SOS', 'Llamadas',
      'App del familiar', 'Notificaciones', 'Suscripción', 'Actualizaciones',
    ]
    const tones = known.map(categoryTone)
    expect(tones.slice(0, 6)).toEqual([...CATEGORY_TONES])
    for (let i = 1; i < tones.length; i++) expect(tones[i]).not.toBe(tones[i - 1])
  })

  it('una categoría nueva tiene siempre el mismo color (hash estable) y es uno de los tonos definidos', () => {
    expect(categoryTone('Garantía')).toBe(categoryTone('Garantía'))
    for (const name of ['Garantía', 'Envíos', 'ñandú', '', '🙂']) expect(CATEGORY_TONES).toContain(categoryTone(name))
  })

  it('distintas categorías nuevas no caen todas en el mismo tono', () => {
    const tones = new Set(['Garantía', 'Envíos', 'Devoluciones', 'Facturas', 'Idiomas', 'Accesorios'].map(categoryTone))
    expect(tones.size).toBeGreaterThan(1)
  })
})
