import { describe, expect, it } from 'vitest'
import { parseProfile } from './profile'

describe('parseProfile', () => {
  it('convierte una fila válida', () => {
    expect(parseProfile({ id: 'u1', role: 'editor', display_name: 'Nuria' })).toEqual({
      id: 'u1',
      role: 'editor',
      displayName: 'Nuria',
    })
  })

  it.each([
    null,
    undefined,
    'texto',
    {},
    { id: 'u1', role: 'admin', display_name: 'X' },
    { id: 'u1', role: 'agent' },
    { id: 1, role: 'agent', display_name: 'X' },
  ])('rechaza %j', (row) => {
    expect(parseProfile(row)).toBeNull()
  })
})
