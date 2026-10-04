import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatAttempts, responseOf, runSecurityAttempts } from './attempts'
import type { Env } from './attempts'

/*
 * Pruebas del propio arnés de intrusión, con un Supabase simulado que puede "romperse" a propósito:
 * si se quita una protección, el arnés debe marcar FALLO exactamente en el intento correspondiente.
 */

type Row = Record<string, unknown>
type Role = 'anon' | 'agent' | 'editor'
const IDS: Record<Role, string> = { anon: '', agent: 'u-agent', editor: 'u-editor' }

interface Db {
  articles: Row[]
  article_sections: Row[]
  profiles: Row[]
  unanswered_questions: Row[]
  nextId: number
}

/** `breach`: operaciones que el agente puede hacer indebidamente, p. ej. 'delete:articles'. 'all' = sin RLS. */
function makeEnv(breach: string[] = []) {
  const db: Db = {
    articles: [], article_sections: [], nextId: 1,
    profiles: [{ id: 'u-agent', role: 'agent' }, { id: 'u-editor', role: 'editor' }],
    unanswered_questions: [],
  }
  const allowed = (role: Role, op: string, table: string) => {
    if (breach.includes('all') || (role !== 'editor' && breach.includes(`${op}:${table}`))) return true
    switch (table) {
      case 'articles':
      case 'article_sections':
        return op === 'select' ? role !== 'anon' : role === 'editor'
      case 'profiles':
        return op === 'select' && role !== 'anon'
      case 'unanswered_questions':
        return op === 'insert' ? role !== 'anon' : role === 'editor'
      default:
        return false
    }
  }
  const denied = { code: '42501', message: 'new row violates row-level security policy' }

  const withSections = (a: Row) => ({ ...a, article_sections: db.article_sections.filter((s) => s.article_id === a.id) })

  function client(role: Role): SupabaseClient {
    const from = (table: keyof Db & string) => {
      let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
      let payload: Row = {}
      let cols = ''
      const filters: ((r: Row) => boolean)[] = []
      let single = false
      const rows = () => db[table] as Row[]
      const visible = (r: Row) => {
        if (table === 'profiles' && role === 'agent' && !breach.includes('all')) return r.id === IDS.agent
        return true
      }

      const run = (): { data: unknown; error: unknown } => {
        const matching = rows().filter((r) => filters.every((f) => f(r)) && visible(r))
        if (op === 'select') {
          if (!allowed(role, 'select', table)) return { data: null, error: { code: '42501', message: 'permission denied' } }
          const out = table === 'articles' && cols.includes('article_sections') ? matching.map(withSections) : matching
          return { data: single ? (out[0] ?? null) : out, error: null }
        }
        if (op === 'insert') {
          if (!allowed(role, 'insert', table)) return { data: null, error: denied }
          if (table === 'unanswered_questions' && payload.user_id && payload.user_id !== IDS[role] && !breach.includes('all')) {
            return { data: null, error: denied }
          }
          const row = { id: `id-${db.nextId++}`, ...payload }
          rows().push(row)
          return { data: [row], error: null }
        }
        // update / delete: sin permiso NO hay error, simplemente 0 filas (como hace RLS)
        if (!allowed(role, op, table)) return { data: [], error: null }
        if (op === 'update') {
          matching.forEach((r) => Object.assign(r, payload))
          return { data: matching, error: null }
        }
        const ids = new Set(matching.map((r) => r.id))
        db[table] = rows().filter((r) => !ids.has(r.id)) as never
        if (table === 'articles') db.article_sections = db.article_sections.filter((s) => !ids.has(s.article_id))
        return { data: matching, error: null }
      }

      const api: Record<string, unknown> = {
        select: (c?: string) => ((cols = c ?? ''), api),
        insert: (p: Row) => ((op = 'insert'), (payload = p), api),
        upsert: (p: Row) => ((op = 'update'), (payload = p), filters.push((r) => r.id === p.id), api),
        update: (p: Row) => ((op = 'update'), (payload = p), api),
        delete: () => ((op = 'delete'), api),
        eq: (col: string, v: unknown) => (filters.push((r) => r[col] === v), api),
        ilike: (col: string, pattern: string) => {
          const needle = pattern.replace(/%/g, '').toLowerCase()
          filters.push((r) => String(r[col] ?? '').toLowerCase().includes(needle))
          return api
        },
        limit: () => api,
        maybeSingle: async () => ((single = true), run()),
        then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
      }
      return api
    }

    const rpc = async (name: string, params: Row) => {
      if (name === 'save_article') {
        if (!(role === 'editor' || breach.includes('rpc:save_article') || breach.includes('all'))) {
          return { data: null, error: { code: '42501', message: 'Solo el editor puede guardar artículos' } }
        }
        let id = params.p_id as string | null
        if (id) {
          const a = db.articles.find((x) => x.id === id)
          if (!a) return { data: null, error: { code: 'P0002', message: 'Artículo no encontrado' } }
          Object.assign(a, { title: params.p_title, category: params.p_category })
          db.article_sections = db.article_sections.filter((s) => s.article_id !== id)
        } else {
          id = `art-${db.nextId++}`
          db.articles.push({ id, title: params.p_title, category: params.p_category })
        }
        ;(params.p_sections as Row[]).forEach((s, i) => db.article_sections.push({ id: `s-${db.nextId++}`, article_id: id, position: i, ...s }))
        return { data: id, error: null }
      }
      if (name === 'log_unanswered_question') {
        if (role === 'anon') return { data: null, error: { code: '42501', message: 'permission denied' } }
        const text = String(params.question_text).trim()
        if (text.length < 3 || text.length > 300) return { data: null, error: { code: '23514', message: 'check constraint' } }
        db.unanswered_questions.push({ id: `q-${db.nextId++}`, question: text, user_id: IDS[role], resolved: false })
        return { data: null, error: null }
      }
      if (name === 'search_knowledge') {
        return role === 'anon' ? { data: null, error: { code: '42501', message: 'permission denied' } } : { data: [], error: null }
      }
      throw new Error(`rpc inesperada ${name}`)
    }

    return {
      from,
      rpc,
      auth: {
        getUser: async () => ({ data: { user: { id: IDS[role] } } }),
        getSession: async () => ({ data: { session: { access_token: `token-${role}` } } }),
        admin: {
          listUsers: async () =>
            breach.includes('all') ? { data: { users: [] }, error: null } : { data: null, error: { code: 'not_admin', message: 'User not allowed' } },
        },
      },
    } as unknown as SupabaseClient
  }

  const env: Env = {
    anon: client('anon'),
    agent: client('agent'),
    editor: client('editor'),
    rawPost: async (table, body, token) => {
      const role = token.replace('token-', '') as Role
      if (!allowed(role, 'insert', table)) return { status: 401, body: denied }
      db.articles.push({ id: `raw-${db.nextId++}`, ...(body as Row) })
      return { status: 201, body: null }
    },
  }
  return { env, db }
}

describe('responseOf', () => {
  it('clasifica error, 0 filas, filas y ok', () => {
    expect(responseOf({ data: null, error: { code: '42501', message: 'x' } }).kind).toBe('error')
    expect(responseOf({ data: [], error: null }).kind).toBe('zero-rows')
    expect(responseOf({ data: [1, 2], error: null })).toMatchObject({ kind: 'rows', text: '2 fila(s)' })
    expect(responseOf({ data: 'id', error: null }).kind).toBe('ok')
  })
})

describe('arnés de intrusión con las protecciones activas', () => {
  it('todos los intentos quedan bloqueados, los controles positivos pasan y se limpia todo', async () => {
    const { env, db } = makeEnv()
    const { results, cleanup } = await runSecurityAttempts(env)

    expect(results.filter((r) => !r.pass)).toEqual([])
    expect(results.filter((r) => r.expected === 'bloqueado').length).toBeGreaterThanOrEqual(24)
    expect(results.filter((r) => r.expected === 'permitido').map((r) => r.id)).toEqual(['A1', 'E1'])
    expect(cleanup).toMatch(/Limpieza completa/)
    expect(db.articles).toEqual([])
    expect(db.unanswered_questions).toEqual([])
  })

  it('el informe resume los intentos y los marca con ✓', async () => {
    const { env } = makeEnv()
    const { results } = await runSecurityAttempts(env)
    const text = formatAttempts(results)
    expect(text).toContain('✓ A8')
    expect(text).not.toContain('✗ FALLO')
    expect(text).toMatch(/Intentos de intrusión: \d+ · bloqueados correctamente: \d+/)
  })
})

describe('el arnés DETECTA protecciones rotas (si no, no serviría de nada)', () => {
  const failing = async (breach: string[]) => {
    const { env } = makeEnv(breach)
    return (await runSecurityAttempts(env)).results.filter((r) => !r.pass).map((r) => r.id)
  }

  it('si el agente pudiera borrar artículos, falla A8', async () => {
    expect(await failing(['delete:articles'])).toContain('A8')
  })

  it('si el agente pudiera editar artículos, falla A5', async () => {
    const ids = await failing(['update:articles'])
    expect(ids).toContain('A5')
    expect(ids).not.toContain('A2') // y no acusa a intentos que sí siguen bloqueados
  })

  it('si el agente pudiera ascenderse a editor, falla A11', async () => {
    expect(await failing(['update:profiles'])).toContain('A11')
  })

  it('si el agente pudiera leer las preguntas, falla A15', async () => {
    expect(await failing(['select:unanswered_questions'])).toContain('A15')
  })

  it('si el agente pudiera usar save_article, fallan A9 y A10', async () => {
    const ids = await failing(['rpc:save_article'])
    expect(ids).toEqual(expect.arrayContaining(['A9', 'A10']))
  })

  it('si el agente pudiera insertar artículos con fetch directo, falla A3', async () => {
    expect(await failing(['insert:articles'])).toEqual(expect.arrayContaining(['A2', 'A3']))
  })

  it('sin RLS en absoluto, fallan casi todos los intentos del agente y de quien no tiene sesión', async () => {
    const ids = await failing(['all'])
    for (const id of ['S1', 'S3', 'A2', 'A5', 'A8', 'A11', 'A15', 'A16', 'A20']) expect(ids, id).toContain(id)
    expect(ids).not.toContain('A1') // los controles positivos siguen en verde
  })

  it('un cambio que ocurre aunque la API conteste "0 filas" se detecta por la verificación posterior', async () => {
    // El agente borra de verdad, pero la API finge 0 filas: solo la lectura posterior lo delata.
    const { env, db } = makeEnv()
    const agent = env.agent as unknown as { from: (table: string) => unknown }
    const honest = agent.from.bind(agent)
    agent.from = (table: string) =>
      table === 'articles'
        ? {
            ...(honest(table) as object),
            delete: () => ({
              eq: () => ({
                select: async () => {
                  db.articles.splice(0, db.articles.length) // borra de verdad…
                  return { data: [], error: null } // …pero responde "0 filas"
                },
              }),
            }),
          }
        : honest(table)

    const { results } = await runSecurityAttempts(env)
    const a8 = results.find((r) => r.id === 'A8')!
    expect(a8.response).toMatch(/0 filas/) // la API dice que no pasó nada…
    expect(a8.pass).toBe(false) // …pero el arnés lo marca como fallo
    expect(a8.verification).toMatch(/YA NO EXISTE/)
  })

  it('una excepción del cliente cuenta como bloqueo con el mensaje registrado', async () => {
    const { env } = makeEnv()
    ;(env.agent as unknown as { auth: { admin: { listUsers: () => Promise<never> } } }).auth.admin.listUsers = async () => {
      throw new Error('boom')
    }
    const { results } = await runSecurityAttempts(env)
    const a14 = results.find((r) => r.id === 'A14')!
    expect(a14.pass).toBe(true)
    expect(a14.response).toMatch(/excepción: boom/)
  })
})
