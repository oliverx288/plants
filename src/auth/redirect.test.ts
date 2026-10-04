import { describe, expect, it } from 'vitest'
import { getSafeRedirect } from './redirect'

describe('getSafeRedirect', () => {
  it('permite rutas internas', () => {
    expect(getSafeRedirect('/articulos')).toBe('/articulos')
    expect(getSafeRedirect('/articulos?categoria=gps')).toBe('/articulos?categoria=gps')
  })

  it.each([
    'https://sitio-malo.com',
    '//sitio-malo.com',
    '/\\sitio-malo.com',
    'javascript:alert(1)',
    'articulos',
    '/ruta\nconsalto',
    '/ruta\tcontab',
    '/login',
    '',
  ])('rechaza %j y vuelve al inicio', (from) => {
    expect(getSafeRedirect(from)).toBe('/')
  })

  it('rechaza valores que no son texto', () => {
    expect(getSafeRedirect(undefined)).toBe('/')
    expect(getSafeRedirect(42)).toBe('/')
    expect(getSafeRedirect({})).toBe('/')
  })
})
