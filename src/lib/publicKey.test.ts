import { describe, expect, it } from 'vitest'
import { checkPublicKey } from './publicKey'

const jwt = (payload: object) => {
  const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.firma`
}

describe('checkPublicKey', () => {
  it('acepta una clave anon (JWT)', () => {
    expect(checkPublicKey(jwt({ role: 'anon', ref: 'abc' }))).toBeNull()
  })

  it('acepta una clave publishable nueva', () => {
    expect(checkPublicKey('sb_publishable_abc123')).toBeNull()
  })

  it('RECHAZA una service role en formato JWT', () => {
    expect(checkPublicKey(jwt({ role: 'service_role' }))).toMatch(/service role/)
  })

  it('RECHAZA una clave secreta en formato nuevo', () => {
    expect(checkPublicKey('sb_secret_abc123')).toMatch(/service role/)
  })

  it('no falla con valores que no son JWT', () => {
    expect(checkPublicKey('cualquier-cosa')).toBeNull()
    expect(checkPublicKey('a.b.c')).toBeNull()
  })
})
