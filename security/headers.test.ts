import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/* La política de seguridad de cabeceras se fija con tests: si alguien la debilita, falla. */

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as {
  rewrites: { source: string; destination: string }[]
  headers: { source: string; headers: { key: string; value: string }[] }[]
}
const headers = Object.fromEntries(config.headers.find((h) => h.source === '/(.*)')!.headers.map((h) => [h.key, h.value]))
const csp = Object.fromEntries(
  headers['Content-Security-Policy'].split(';').map((d) => {
    const [name, ...values] = d.trim().split(/\s+/)
    return [name, values]
  }),
) as Record<string, string[]>

describe('cabeceras de seguridad (vercel.json)', () => {
  it('se aplican a todas las rutas e incluyen las esenciales', () => {
    for (const key of [
      'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options',
      'Referrer-Policy', 'Permissions-Policy', 'Strict-Transport-Security',
    ]) {
      expect(headers[key], key).toBeTruthy()
    }
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-Frame-Options']).toBe('DENY')
  })

  it('la CSP no permite scripts en línea ni eval', () => {
    expect(csp['script-src']).toEqual(["'self'"])
    for (const directive of Object.values(csp)) {
      expect(directive).not.toContain("'unsafe-inline'")
      expect(directive).not.toContain("'unsafe-eval'")
    }
  })

  it('la CSP limita todo a origen propio y solo permite conectar a Supabase', () => {
    expect(csp['default-src']).toEqual(["'self'"])
    expect(csp['connect-src']).toEqual(["'self'", 'https://*.supabase.co'])
    expect(csp['object-src']).toEqual(["'none'"])
    expect(csp['base-uri']).toEqual(["'self'"])
    expect(csp['form-action']).toEqual(["'self'"])
  })

  it('la app no puede incrustarse en otra web (anti clickjacking)', () => {
    expect(csp['frame-ancestors']).toEqual(["'none'"])
  })

  it('ninguna directiva admite comodines abiertos ni http: plano', () => {
    for (const values of Object.values(csp)) {
      for (const v of values) {
        expect(v).not.toBe('*')
        expect(v).not.toBe('http:')
      }
    }
    // data: solo para imágenes
    for (const [name, values] of Object.entries(csp)) {
      if (name !== 'img-src') expect(values, name).not.toContain('data:')
    }
  })

  it('mantiene la reescritura para la SPA', () => {
    expect(config.rewrites).toContainEqual({ source: '/(.*)', destination: '/index.html' })
  })
})
