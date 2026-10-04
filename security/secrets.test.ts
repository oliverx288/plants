import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/* Ningún secreto en el repositorio ni en el JavaScript que descarga el navegador. */

const root = new URL('..', import.meta.url).pathname
const tracked = () => execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean)

// Un JWT (eyJ…) con el rol service_role, o una clave secreta nueva de Supabase.
const SECRET_PATTERNS: [string, RegExp][] = [
  ['clave sb_secret_', /sb_secret_[A-Za-z0-9_-]{8,}/],
  ['JWT largo (posible clave)', /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/],
]

describe('el repositorio no contiene secretos', () => {
  it('.env no está versionado y .gitignore lo excluye (pero no .env.example)', () => {
    const files = tracked()
    expect(files).not.toContain('.env')
    expect(files.filter((f) => /^\.env\..+/.test(f) && f !== '.env.example')).toEqual([])
    expect(files).toContain('.env.example')

    const ignore = readFileSync(join(root, '.gitignore'), 'utf8').split('\n').map((l) => l.trim())
    expect(ignore).toContain('.env')
    expect(ignore).toContain('!.env.example')
  })

  it('ningún archivo versionado contiene claves reales', () => {
    const offenders: string[] = []
    for (const file of tracked()) {
      if (/(package-lock\.json|\.png|\.ico)$/.test(file) || file.endsWith('security/secrets.test.ts')) continue
      const path = join(root, file)
      if (!existsSync(path) || statSync(path).isDirectory()) continue
      const text = readFileSync(path, 'utf8')
      for (const [name, pattern] of SECRET_PATTERNS) if (pattern.test(text)) offenders.push(`${file}: ${name}`)
    }
    expect(offenders).toEqual([])
  })

  it('.env.example no trae valores en las claves secretas', () => {
    const example = readFileSync(join(root, '.env.example'), 'utf8')
    expect(example).toMatch(/^SUPABASE_SERVICE_ROLE_KEY=\s*$/m)
    expect(example).toMatch(/^SEED_AGENT_PASSWORD=\s*$/m)
    expect(example).toMatch(/^SEED_EDITOR_PASSWORD=\s*$/m)
  })

  it('el código del frontend (src/) nunca menciona la service role como variable', () => {
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) walk(path)
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) {
          if (/SUPABASE_SERVICE_ROLE_KEY/.test(readFileSync(path, 'utf8'))) offenders.push(path.replace(root, ''))
        }
      }
    }
    walk(join(root, 'src'))
    expect(offenders).toEqual([])
  })
})

describe('el JavaScript que se despliega no contiene secretos', () => {
  it('un secreto sin prefijo VITE_ presente en el entorno NO acaba en el bundle', () => {
    const out = mkdtempSync(join(tmpdir(), 'faro-build-'))
    const SENTINEL = 'sb_secret_CENTINELA_NO_DEBE_APARECER_1234567890'
    try {
      execFileSync('npx', ['vite', 'build', '--outDir', out, '--emptyOutDir'], {
        cwd: root,
        stdio: 'pipe',
        env: {
          ...process.env,
          VITE_SUPABASE_URL: 'https://ejemplo.supabase.co',
          VITE_SUPABASE_ANON_KEY: 'sb_publishable_ejemplo',
          SUPABASE_SERVICE_ROLE_KEY: SENTINEL, // sin VITE_: Vite no debe incrustarlo
          SEED_AGENT_PASSWORD: 'contrasena-centinela-agente',
          SEED_EDITOR_PASSWORD: 'contrasena-centinela-editor',
        },
      })
      const assets = join(out, 'assets')
      const bundle = readdirSync(assets).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n')
      expect(bundle).not.toContain(SENTINEL)
      expect(bundle).not.toContain('contrasena-centinela')
      expect(bundle).toContain('sb_publishable_ejemplo') // la clave pública SÍ va (es pública por diseño)
    } finally {
      rmSync(out, { recursive: true, force: true })
    }
  }, 120_000)

  it('el build FALLA si se intenta publicar una service role como clave pública', () => {
    const out = mkdtempSync(join(tmpdir(), 'faro-build-'))
    try {
      expect(() =>
        execFileSync('npx', ['vite', 'build', '--outDir', out], {
          cwd: root,
          stdio: 'pipe',
          env: { ...process.env, VITE_SUPABASE_URL: 'https://ejemplo.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_secret_oops12345' },
        }),
      ).toThrow()
    } finally {
      rmSync(out, { recursive: true, force: true })
    }
  }, 120_000)
})
