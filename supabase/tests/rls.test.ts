import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

/*
 * Pruebas de esquema y RLS sobre un Postgres real (PGlite) en local.
 * Se simula lo mínimo de Supabase: roles anon/authenticated, auth.users, auth.uid()
 * y los privilegios por defecto que Supabase concede a esos roles en 'public'.
 * Complementa (no sustituye) las pruebas contra la API real de la fase de seguridad.
 */

const LUCIA = '00000000-0000-4000-8000-000000000001' // agente
const NURIA = '00000000-0000-4000-8000-000000000002' // editora
const GHOST = '00000000-0000-4000-8000-000000000003' // existe en Auth pero sin perfil
const ARTICLE = '10000000-0000-4000-8000-000000000001'
const SECTION = '20000000-0000-4000-8000-000000000001'

let db: PGlite

type Actor = 'anon' | typeof LUCIA | typeof NURIA | typeof GHOST

/** Ejecuta SQL con la identidad de un actor (como lo haría PostgREST) y vuelve a superusuario. */
async function as<T = Record<string, unknown>>(actor: Actor, sql: string) {
  if (actor === 'anon') {
    await db.exec(`set role anon; select set_config('request.jwt.claim.sub', '', false);`)
  } else {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${actor}', false);`)
  }
  try {
    return await db.query<T>(sql)
  } finally {
    await db.exec('reset role')
  }
}

/** Comprueba que la consulta falla con un código SQLSTATE concreto. */
async function expectFail(actor: Actor, sql: string, code: string) {
  await expect(as(actor, sql)).rejects.toMatchObject({ code })
}

const RLS_VIOLATION = '42501' // insufficient_privilege (RLS y GRANT usan el mismo código)
const CHECK_VIOLATION = '23514'
const UNIQUE_VIOLATION = '23505'

beforeAll(async () => {
  db = await createTestDb()
  await db.exec(`
    insert into auth.users (id) values ('${LUCIA}'), ('${NURIA}'), ('${GHOST}');
    insert into public.profiles (id, role, display_name) values
      ('${LUCIA}', 'agent', 'Lucía'), ('${NURIA}', 'editor', 'Nuria');
    insert into public.articles (id, title, category)
      values ('${ARTICLE}', 'La ubicación no se actualiza', 'GPS y ubicación');
    insert into public.article_sections (id, article_id, position, heading, steps)
      values ('${SECTION}', '${ARTICLE}', 0, 'Pasos', array['Activa el GPS']);
  `)
})

afterAll(async () => {
  await db.close()
})

describe('RLS activado en todas las tablas', () => {
  it('ninguna tabla de public queda sin RLS', async () => {
    const { rows } = await db.query<{ relname: string }>(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`)
    expect(rows).toEqual([])
  })
})

describe('anónimo (sin sesión)', () => {
  it.each(['profiles', 'articles', 'article_sections', 'unanswered_questions'])(
    'no puede leer %s',
    (table) => expectFail('anon', `select * from public.${table}`, RLS_VIOLATION),
  )
  it('no puede insertar artículos', () =>
    expectFail('anon', `insert into public.articles (title, category) values ('Título válido', 'GPS')`, RLS_VIOLATION))
})

describe('usuario de Auth sin perfil', () => {
  it('no ve artículos ni secciones', async () => {
    expect((await as(GHOST, 'select * from public.articles')).rows).toHaveLength(0)
    expect((await as(GHOST, 'select * from public.article_sections')).rows).toHaveLength(0)
  })
  it('no puede registrar preguntas', () =>
    expectFail(GHOST, `insert into public.unanswered_questions (question) values ('¿Hola?')`, RLS_VIOLATION))
})

describe('agente (Lucía): solo lectura de artículos', () => {
  it('lee artículos y secciones', async () => {
    expect((await as(LUCIA, 'select * from public.articles')).rows).toHaveLength(1)
    expect((await as(LUCIA, 'select * from public.article_sections')).rows).toHaveLength(1)
  })

  it('NO puede crear un artículo', () =>
    expectFail(LUCIA, `insert into public.articles (title, category) values ('Título válido', 'GPS')`, RLS_VIOLATION))

  it('NO puede crear una sección', () =>
    expectFail(
      LUCIA,
      `insert into public.article_sections (article_id, position, heading, body)
       values ('${ARTICLE}', 5, 'Hack', 'texto')`,
      RLS_VIOLATION,
    ))

  it('NO puede editar un artículo (0 filas afectadas, el título no cambia)', async () => {
    const res = await as(LUCIA, `update public.articles set title = 'Hackeado por agente' where id = '${ARTICLE}'`)
    expect(res.affectedRows).toBe(0)
    const { rows } = await db.query<{ title: string }>('select title from public.articles')
    expect(rows[0].title).toBe('La ubicación no se actualiza')
  })

  it('NO puede editar una sección (0 filas afectadas)', async () => {
    const res = await as(LUCIA, `update public.article_sections set heading = 'Hackeado' where id = '${SECTION}'`)
    expect(res.affectedRows).toBe(0)
  })

  it('NO puede borrar un artículo ni una sección (0 filas afectadas, siguen existiendo)', async () => {
    expect((await as(LUCIA, `delete from public.articles where id = '${ARTICLE}'`)).affectedRows).toBe(0)
    expect((await as(LUCIA, `delete from public.article_sections where id = '${SECTION}'`)).affectedRows).toBe(0)
    const { rows } = await db.query('select 1 from public.articles a join public.article_sections s on s.article_id = a.id')
    expect(rows).toHaveLength(1)
  })
})

describe('perfiles y roles', () => {
  it('el agente solo ve su propio perfil', async () => {
    const { rows } = await as<{ id: string }>(LUCIA, 'select id from public.profiles')
    expect(rows.map((r) => r.id)).toEqual([LUCIA])
  })

  it('el editor ve todos los perfiles', async () => {
    expect((await as(NURIA, 'select * from public.profiles')).rows).toHaveLength(2)
  })

  it('el agente NO puede ascenderse a editor', () =>
    expectFail(LUCIA, `update public.profiles set role = 'editor' where id = '${LUCIA}'`, RLS_VIOLATION))

  it('nadie puede crear perfiles desde la API (ni el editor)', async () => {
    await expectFail(GHOST, `insert into public.profiles (id, role, display_name) values ('${GHOST}', 'editor', 'X')`, RLS_VIOLATION)
    await expectFail(NURIA, `insert into public.profiles (id, role, display_name) values ('${GHOST}', 'editor', 'X')`, RLS_VIOLATION)
  })
})

describe('preguntas sin respuesta', () => {
  it('el agente registra la suya y el servidor fija su user_id', async () => {
    await as(LUCIA, `insert into public.unanswered_questions (question) values ('¿Se puede pagar con Bizum?')`)
    const { rows } = await db.query<{ user_id: string }>('select user_id from public.unanswered_questions')
    expect(rows).toHaveLength(1)
    expect(rows[0].user_id).toBe(LUCIA)
  })

  it('el agente NO puede suplantar a otro usuario', () =>
    expectFail(
      LUCIA,
      `insert into public.unanswered_questions (question, user_id) values ('Pregunta falsa', '${NURIA}')`,
      RLS_VIOLATION,
    ))

  it('el agente NO puede leer las preguntas (ni las suyas)', async () => {
    expect((await as(LUCIA, 'select * from public.unanswered_questions')).rows).toHaveLength(0)
  })

  it('no se duplica la misma pregunta pendiente (ignora mayúsculas y espacios)', () =>
    expectFail(
      LUCIA,
      `insert into public.unanswered_questions (question) values ('  ¿SE PUEDE   pagar con bizum?  ')`,
      UNIQUE_VIOLATION,
    ))

  it('valida la longitud en la base de datos', async () => {
    await expectFail(LUCIA, `insert into public.unanswered_questions (question) values ('ab')`, CHECK_VIOLATION)
    await expectFail(
      LUCIA,
      `insert into public.unanswered_questions (question) values ('${'x'.repeat(301)}')`,
      CHECK_VIOLATION,
    )
  })

  it('el agente NO puede marcarlas como resueltas ni borrarlas', async () => {
    expect((await as(LUCIA, `update public.unanswered_questions set resolved = true`)).affectedRows).toBe(0)
    expect((await as(LUCIA, `delete from public.unanswered_questions`)).affectedRows).toBe(0)
  })

  it('el editor las ve y las marca como resueltas, pero no puede cambiar su texto', async () => {
    expect((await as(NURIA, 'select * from public.unanswered_questions')).rows).toHaveLength(1)
    await expectFail(NURIA, `update public.unanswered_questions set question = 'Manipulada'`, RLS_VIOLATION)
    const res = await as(NURIA, `update public.unanswered_questions set resolved = true, resolved_at = now()`)
    expect(res.affectedRows).toBe(1)
  })

  it('una vez resuelta, la misma pregunta puede volver a registrarse', async () => {
    await as(LUCIA, `insert into public.unanswered_questions (question) values ('¿Se puede pagar con Bizum?')`)
    const { rows } = await db.query('select 1 from public.unanswered_questions')
    expect(rows).toHaveLength(2)
  })
})

describe('validación de datos en la base de datos', () => {
  it('rechaza títulos demasiado cortos', () =>
    expectFail(NURIA, `insert into public.articles (title, category) values ('abc', 'GPS')`, CHECK_VIOLATION))

  it('rechaza pasos de más de 300 caracteres', () =>
    expectFail(
      NURIA,
      `insert into public.article_sections (article_id, position, heading, steps)
       values ('${ARTICLE}', 9, 'Largo', array['${'x'.repeat(301)}'])`,
      CHECK_VIOLATION,
    ))

  it('rechaza pasos vacíos o nulos', async () => {
    await expectFail(
      NURIA,
      `insert into public.article_sections (article_id, position, heading, steps)
       values ('${ARTICLE}', 9, 'Vacío', array['  '])`,
      CHECK_VIOLATION,
    )
    await expectFail(
      NURIA,
      `insert into public.article_sections (article_id, position, heading, steps)
       values ('${ARTICLE}', 9, 'Nulo', array[null]::text[])`,
      CHECK_VIOLATION,
    )
  })

  it('rechaza secciones sin texto ni pasos', () =>
    expectFail(
      NURIA,
      `insert into public.article_sections (article_id, position, heading) values ('${ARTICLE}', 9, 'Vacía')`,
      CHECK_VIOLATION,
    ))

  it('rechaza posiciones repetidas dentro de un artículo', () =>
    expectFail(
      NURIA,
      `insert into public.article_sections (article_id, position, heading, body)
       values ('${ARTICLE}', 0, 'Duplicada', 'texto')`,
      UNIQUE_VIOLATION,
    ))
})

describe('editor (Nuria): gestiona artículos', () => {
  it('crea, edita y borra un artículo; al borrarlo se borran sus secciones', async () => {
    const created = await as<{ id: string }>(
      NURIA,
      `insert into public.articles (title, category) values ('Cómo cargar el reloj', 'Batería y carga') returning id`,
    )
    const id = created.rows[0].id
    await as(
      NURIA,
      `insert into public.article_sections (article_id, position, heading, steps)
       values ('${id}', 0, 'Pasos', array['Conecta la base de carga', 'Coloca el reloj'])`,
    )

    const upd = await as(NURIA, `update public.articles set title = 'Cómo cargar tu reloj Velia' where id = '${id}'`)
    expect(upd.affectedRows).toBe(1)

    const del = await as(NURIA, `delete from public.articles where id = '${id}'`)
    expect(del.affectedRows).toBe(1)
    const { rows } = await db.query(`select 1 from public.article_sections where article_id = '${id}'`)
    expect(rows).toHaveLength(0)
  })

  it('updated_at se actualiza automáticamente al editar', async () => {
    const before = await db.query<{ updated_at: Date }>(`select updated_at from public.articles where id = '${ARTICLE}'`)
    await db.exec(`select pg_sleep(0.01)`)
    await as(NURIA, `update public.articles set category = 'GPS y ubicación' where id = '${ARTICLE}'`)
    const after = await db.query<{ updated_at: Date }>(`select updated_at from public.articles where id = '${ARTICLE}'`)
    expect(after.rows[0].updated_at.getTime()).toBeGreaterThan(before.rows[0].updated_at.getTime())
  })
})
