import { describe, expect, it } from 'vitest'
import { loginErrorMessage } from './authErrors'

describe('loginErrorMessage', () => {
  it('usa el mismo mensaje para credenciales inválidas (no revela si el correo existe)', () => {
    expect(loginErrorMessage({ status: 400, code: 'invalid_credentials' })).toBe('Correo o contraseña incorrectos.')
  })

  it('avisa de demasiados intentos', () => {
    expect(loginErrorMessage({ status: 429, code: 'over_request_rate_limit' })).toMatch(/Demasiados intentos/)
  })

  it('no filtra detalles internos en errores desconocidos', () => {
    expect(loginErrorMessage({ status: 500, code: 'unexpected_failure' })).toMatch(/No se pudo iniciar sesión/)
  })
})
