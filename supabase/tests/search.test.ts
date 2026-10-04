import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { articles } from '../seed/articles'
import { articleId } from '../seed/ids'
import { createTestDb } from './helpers'

/*
 * Búsqueda (search_knowledge) y registro de preguntas sin respuesta (log_unanswered_question)
 * sobre un Postgres real con el contenido real del seed.
 * La calidad de la recuperación (porcentaje de aciertos) se mide en la fase de fiabilidad.
 */

const LUCIA = '00000000-0000-4000-8000-000000000001' // agente
const NURIA = '00000000-0000-4000-8000-000000000002' // editora
const GHOST = '00000000-0000-4000-8000-000000000003' // sin perfil

type Actor = 'anon' | typeof LUCIA | typeof NURIA | typeof GHOST
let db: PGlite

async function as<T = Record<string, unknown>>(actor: Actor, sql: string, params: unknown[] = []) {
  if (actor === 'anon') await db.exec(`set role anon; select set_config('request.jwt.claim.sub', '', false);`)
  else await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${actor}', false);`)
  try {
    return await db.query<T>(sql, params)
  } finally {
    await db.exec('reset role')
  }
}

interface Hit {
  article_id: string
  article_title: string
  heading: string
  score: number
  matched_weight: number
}
const search = async (actor: Actor, question: string | null, max?: number) =>
  (await as<Hit>(actor, 'select * from public.search_knowledge($1, $2)', [question, max ?? 3])).rows

beforeAll(async () => {
  db = await createTestDb()
  await db.exec(`
    insert into auth.users (id) values ('${LUCIA}'), ('${NURIA}'), ('${GHOST}');
    insert into public.profiles (id, role, display_name) values
      ('${LUCIA}', 'agent', 'Lucía'), ('${NURIA}', 'editor', 'Nuria');
  `)
  for (const a of articles) {
    await db.query('insert into public.articles (id, title, category, last_reviewed_at) values ($1,$2,$3,$4)', [
      articleId(a.slug), a.title, a.category, a.lastReviewed,
    ])
    for (const [position, s] of a.sections.entries()) {
      await db.query(
        'insert into public.article_sections (article_id, position, heading, body, steps) values ($1,$2,$3,$4,$5)',
        [articleId(a.slug), position, s.heading, s.body ?? '', s.steps ?? []],
      )
    }
  }
})
afterAll(async () => {
  await db.close()
})

describe('search_knowledge: recuperación', () => {
  it('encuentra el artículo de la pregunta de ejemplo del proyecto', async () => {
    const [top] = await search(LUCIA, 'El reloj no envía la ubicación a la app del familiar')
    expect(top.article_title).toBe('La ubicación no se actualiza')
    expect(top.score).toBeGreaterThan(0.5)
  })

  it('ignora acentos y mayúsculas', async () => {
    const [a] = await search(LUCIA, 'La ubicación no se actualiza')
    const [b] = await search(LUCIA, 'LA UBICACION NO SE ACTUALIZA')
    expect(b.article_id).toBe(a.article_id)
    expect(b.score).toBeCloseTo(a.score, 10)
  })

  it('entiende variantes de la misma palabra (raíces en español)', async () => {
    const [top] = await search(LUCIA, 'cómo cancelo mi suscripción')
    expect(top.article_title).toBe('Cómo cancelar la suscripción o cambiar de plan')
  })

  it('devuelve como mucho un fragmento por artículo, de más a menos relevante', async () => {
    const hits = await search(LUCIA, 'el reloj no carga la batería', 10)
    expect(new Set(hits.map((h) => h.article_id)).size).toBe(hits.length)
    const scores = hits.map((h) => h.score)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })

  it('las puntuaciones están entre 0 y 1', async () => {
    for (const hit of await search(LUCIA, 'la batería dura poco y el reloj no carga', 10)) {
      expect(hit.score).toBeGreaterThan(0)
      expect(hit.score).toBeLessThanOrEqual(1)
    }
  })

  it('una pregunta sin ningún término del dominio no devuelve nada', async () => {
    expect(await search(LUCIA, '¿Es resistente al agua?')).toEqual([])
    expect(await search(LUCIA, '¿Cuál es la capital de Francia?')).toEqual([])
  })

  it('una palabra genérica del dominio aporta poca evidencia (matched_weight bajo)', async () => {
    const [generic] = await search(LUCIA, 'reloj')
    const [specific] = await search(LUCIA, 'la batería dura poco')
    expect(generic.matched_weight).toBeLessThan(specific.matched_weight / 2)
  })

  it('limita max_results entre 1 y 10', async () => {
    expect((await search(LUCIA, 'reloj app llamada batería', 1)).length).toBe(1)
    expect((await search(LUCIA, 'reloj app llamada batería', 0)).length).toBe(1)
    expect((await search(LUCIA, 'reloj app llamada batería', 1000)).length).toBeLessThanOrEqual(10)
  })
})

describe('search_knowledge: entradas hostiles (se tratan como datos)', () => {
  it.each([
    "'; drop table public.articles; --",
    'a & b | !c ( ) <-> :* \\',
    '" OR 1=1 --',
    'x'.repeat(10_000),
    '',
    '   ',
    'el la de que',
  ])('no falla ni rompe nada con %j', async (q) => {
    await expect(search(LUCIA, q)).resolves.toBeInstanceOf(Array)
    const { rows } = await db.query<{ n: number }>('select count(*)::int as n from public.articles')
    expect(rows[0].n).toBe(articles.length)
  })

  it('una pregunta nula devuelve vacío', async () => {
    expect(await search(LUCIA, null)).toEqual([])
  })
})

describe('search_knowledge: seguridad', () => {
  it('un anónimo no puede ejecutarla', async () => {
    await expect(search('anon', 'la batería')).rejects.toMatchObject({ code: '42501' })
  })

  it('un usuario sin perfil no obtiene nada (RLS sigue aplicando: es SECURITY INVOKER)', async () => {
    expect(await search(GHOST, 'la ubicación no se actualiza')).toEqual([])
  })

  it('anon no tiene permiso de EJECUCIÓN sobre las funciones (barrera independiente de RLS)', async () => {
    for (const fn of ['public.search_knowledge(text, integer)', 'public.log_unanswered_question(text)']) {
      const { rows } = await db.query<{ anon: boolean; authenticated: boolean }>(
        `select has_function_privilege('anon', $1, 'execute') as anon,
                has_function_privilege('authenticated', $1, 'execute') as authenticated`,
        [fn],
      )
      expect(rows[0], fn).toEqual({ anon: false, authenticated: true })
    }
  })

  it('agente y editor sí obtienen resultados', async () => {
    expect((await search(LUCIA, 'la ubicación no se actualiza')).length).toBeGreaterThan(0)
    expect((await search(NURIA, 'la ubicación no se actualiza')).length).toBeGreaterThan(0)
  })
})

describe('log_unanswered_question', () => {
  const log = (actor: Actor, q: string | null) => as(actor, 'select public.log_unanswered_question($1)', [q])
  const rows = async () =>
    (await db.query<{ question: string; user_id: string }>('select question, user_id from public.unanswered_questions')).rows

  it('el agente registra su pregunta, con su user_id y sin espacios sobrantes', async () => {
    await log(LUCIA, '  ¿Cuánto cuesta el reloj?  ')
    expect(await rows()).toEqual([{ question: '¿Cuánto cuesta el reloj?', user_id: LUCIA }])
  })

  it('no duplica la misma pregunta (ignora mayúsculas y espacios) y no da error', async () => {
    await log(LUCIA, '¿CUÁNTO   cuesta el reloj?')
    await log(LUCIA, '¿Cuánto cuesta el reloj?')
    expect(await rows()).toHaveLength(1)
  })

  it('otro usuario sí puede registrar la misma pregunta (la deduplicación es por usuario)', async () => {
    await log(NURIA, '¿Cuánto cuesta el reloj?')
    expect(await rows()).toHaveLength(2)
  })

  it('valida la longitud en la base de datos', async () => {
    await expect(log(LUCIA, 'ab')).rejects.toMatchObject({ code: '23514' })
    await expect(log(LUCIA, 'x'.repeat(301))).rejects.toMatchObject({ code: '23514' })
    await expect(log(LUCIA, null)).rejects.toMatchObject({ code: '23502' })
  })

  it('un anónimo y un usuario sin perfil no pueden registrar', async () => {
    await expect(log('anon', '¿Es resistente al agua?')).rejects.toMatchObject({ code: '42501' })
    await expect(log(GHOST, '¿Es resistente al agua?')).rejects.toMatchObject({ code: '42501' })
  })

  it('el agente no puede leer las preguntas registradas; el editor sí', async () => {
    const asAgent = await as(LUCIA, 'select * from public.unanswered_questions')
    expect(asAgent.rows).toHaveLength(0)
    const asEditor = await as(NURIA, 'select * from public.unanswered_questions')
    expect(asEditor.rows).toHaveLength(2)
  })
})
