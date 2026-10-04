import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

const LUCIA = '00000000-0000-4000-8000-000000000001' // agente
const PEDRO = '00000000-0000-4000-8000-000000000004' // otro agente
const NURIA = '00000000-0000-4000-8000-000000000002' // editora
const GHOST = '00000000-0000-4000-8000-000000000003' // sin perfil
const ART = '10000000-0000-4000-8000-000000000001'

type Actor = 'anon' | typeof LUCIA | typeof PEDRO | typeof NURIA | typeof GHOST
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
const rate = (actor: Actor, question: string | null, article: string | null, helpful: boolean | null) =>
  as(actor, 'select public.submit_answer_feedback($1, $2, $3)', [question, article, helpful])
const all = async () =>
  (await db.query<{ user_id: string; question: string; article_id: string | null; article_title: string; helpful: boolean }>(
    'select user_id, question, article_id, article_title, helpful from public.answer_feedback order by created_at, question',
  )).rows

beforeAll(async () => {
  db = await createTestDb()
  await db.exec(`
    insert into auth.users (id) values ('${LUCIA}'), ('${PEDRO}'), ('${NURIA}'), ('${GHOST}');
    insert into public.profiles (id, role, display_name) values
      ('${LUCIA}', 'agent', 'Lucía'), ('${PEDRO}', 'agent', 'Pedro'), ('${NURIA}', 'editor', 'Nuria');
    insert into public.articles (id, title, category) values ('${ART}', 'La ubicación no se actualiza', 'GPS y ubicación');
  `)
})
afterAll(async () => {
  await db.close()
})

describe('valorar una respuesta', () => {
  it('el agente valora y el servidor pone su user_id y el título del artículo', async () => {
    await rate(LUCIA, '  ¿La ubicación no se actualiza?  ', ART, true)
    expect(await all()).toEqual([
      { user_id: LUCIA, question: '¿La ubicación no se actualiza?', article_id: ART, article_title: 'La ubicación no se actualiza', helpful: true },
    ])
  })

  it('si cambia de opinión se ACTUALIZA (no se duplica), aunque cambien mayúsculas o espacios', async () => {
    await rate(LUCIA, '¿LA   ubicación no se actualiza?', ART, false)
    const rows = await all()
    expect(rows).toHaveLength(1)
    expect(rows[0].helpful).toBe(false)
  })

  it('otra persona puede valorar lo mismo: cuenta aparte', async () => {
    await rate(PEDRO, '¿La ubicación no se actualiza?', ART, true)
    expect(await all()).toHaveLength(2)
  })

  it('un artículo inexistente da error y no guarda nada', async () => {
    await expect(rate(LUCIA, 'otra pregunta', '99999999-0000-4000-8000-000000000009', true)).rejects.toMatchObject({ code: 'P0002' })
    expect(await all()).toHaveLength(2)
  })

  it('valida la longitud de la pregunta y los nulos en la base de datos', async () => {
    await expect(rate(LUCIA, 'ab', ART, true)).rejects.toMatchObject({ code: '23514' })
    await expect(rate(LUCIA, 'x'.repeat(301), ART, true)).rejects.toMatchObject({ code: '23514' })
    await expect(rate(LUCIA, null, ART, true)).rejects.toMatchObject({ code: '23502' })
    await expect(rate(LUCIA, 'pregunta válida', ART, null)).rejects.toMatchObject({ code: '23502' })
  })

  it('si se borra el artículo, la valoración se conserva con su título', async () => {
    await db.exec(`insert into public.articles (id, title, category) values ('10000000-0000-4000-8000-000000000009', 'Artículo temporal', 'Pruebas')`)
    await rate(LUCIA, 'pregunta del temporal', '10000000-0000-4000-8000-000000000009', true)
    await db.exec(`delete from public.articles where id = '10000000-0000-4000-8000-000000000009'`)
    const rows = (await all()).filter((r) => r.question === 'pregunta del temporal')
    expect(rows).toEqual([expect.objectContaining({ article_id: null, article_title: 'Artículo temporal' })])
  })
})

describe('seguridad', () => {
  it('un anónimo y un usuario sin perfil no pueden valorar ni leer', async () => {
    const before = (await all()).length
    await expect(rate('anon', 'pregunta válida', ART, true)).rejects.toMatchObject({ code: '42501' })
    // Sin perfil, RLS no le deja ni ver el artículo: la función falla (como "no encontrado") y no guarda nada.
    await expect(rate(GHOST, 'pregunta válida', ART, true)).rejects.toThrow()
    await expect(
      as(GHOST, `insert into public.answer_feedback (question, article_id, article_title, helpful) values ('pregunta válida', '${ART}', 'x', true)`),
    ).rejects.toMatchObject({ code: '42501' })
    await expect(as('anon', 'select * from public.answer_feedback')).rejects.toMatchObject({ code: '42501' })
    expect((await as(GHOST, 'select * from public.answer_feedback')).rows).toHaveLength(0)
    expect(await all()).toHaveLength(before)
  })

  it('NO se puede valorar a nombre de otra persona (user_id falso)', async () => {
    await expect(
      as(LUCIA, `insert into public.answer_feedback (question, article_id, article_title, helpful, user_id) values ('pregunta falsa', '${ART}', 'x', true, '${PEDRO}')`),
    ).rejects.toMatchObject({ code: '42501' })
  })

  it('cada agente solo ve las suyas; el editor ve todas', async () => {
    const lucia = (await as<{ user_id: string }>(LUCIA, 'select user_id from public.answer_feedback')).rows
    expect(lucia.length).toBeGreaterThan(0)
    expect(new Set(lucia.map((r) => r.user_id))).toEqual(new Set([LUCIA]))
    const pedro = (await as<{ user_id: string }>(PEDRO, 'select user_id from public.answer_feedback')).rows
    expect(new Set(pedro.map((r) => r.user_id))).toEqual(new Set([PEDRO]))
    const nuria = (await as<{ user_id: string }>(NURIA, 'select user_id from public.answer_feedback')).rows
    expect(new Set(nuria.map((r) => r.user_id))).toEqual(new Set([LUCIA, PEDRO]))
  })

  it('el agente NO puede cambiar la valoración de otro, ni la pregunta, el artículo o el autor de la suya', async () => {
    const before = await all()
    // Valoración ajena: RLS filtra la fila (0 filas, sin error).
    const other = await as(LUCIA, `update public.answer_feedback set helpful = false where user_id = '${PEDRO}'`)
    expect(other.affectedRows).toBe(0)
    // Columnas no permitidas en las suyas: sin privilegio de UPDATE.
    for (const col of [`question = 'manipulada'`, `article_title = 'manipulado'`, `user_id = '${PEDRO}'`]) {
      await expect(as(LUCIA, `update public.answer_feedback set ${col}`)).rejects.toMatchObject({ code: '42501' })
    }
    expect(await all()).toEqual(before)
  })

  it('el agente NO puede borrar valoraciones; el editor sí', async () => {
    const before = (await all()).length
    expect((await as(LUCIA, 'delete from public.answer_feedback')).affectedRows).toBe(0)
    expect(await all()).toHaveLength(before)
    expect((await as(NURIA, `delete from public.answer_feedback where question = 'pregunta del temporal'`)).affectedRows).toBe(1)
  })

  it('anon no tiene permiso de ejecución sobre la función', async () => {
    const { rows } = await db.query<{ anon: boolean; authenticated: boolean }>(
      `select has_function_privilege('anon', 'public.submit_answer_feedback(text, uuid, boolean)', 'execute') as anon,
              has_function_privilege('authenticated', 'public.submit_answer_feedback(text, uuid, boolean)', 'execute') as authenticated`,
    )
    expect(rows[0]).toEqual({ anon: false, authenticated: true })
  })

  it('el título guardado es el de la base de datos, no uno elegido por el cliente', async () => {
    // La función no recibe título: no hay forma de que el cliente lo falsee.
    const { rows } = await db.query<{ args: string }>(
      `select pg_get_function_arguments('public.submit_answer_feedback(text, uuid, boolean)'::regprocedure) as args`,
    )
    expect(rows[0].args).not.toMatch(/title/i)
  })

  it('RLS está activa en la tabla nueva', async () => {
    const { rows } = await db.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    )
    expect(rows).toEqual([])
  })
})
