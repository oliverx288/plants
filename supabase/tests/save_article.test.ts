import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

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

const section = (heading: string, body = '', steps: string[] = []) => ({ heading, body, steps })
const save = (
  actor: Actor,
  id: string | null,
  title: string,
  sections: unknown,
  category = 'Batería y carga',
  date: string | null = '2026-09-01',
) =>
  as<{ id: string }>(actor, 'select public.save_article($1, $2, $3, $4, $5::jsonb) as id', [
    id, title, category, date, JSON.stringify(sections),
  ])

const countArticles = async () => (await db.query<{ n: number }>('select count(*)::int as n from public.articles')).rows[0].n
const sectionsOf = async (id: string) =>
  (await db.query<{ position: number; heading: string; body: string; steps: string[] }>(
    'select position, heading, body, steps from public.article_sections where article_id = $1 order by position',
    [id],
  )).rows

beforeAll(async () => {
  db = await createTestDb()
  await db.exec(`
    insert into auth.users (id) values ('${LUCIA}'), ('${NURIA}'), ('${GHOST}');
    insert into public.profiles (id, role, display_name) values
      ('${LUCIA}', 'agent', 'Lucía'), ('${NURIA}', 'editor', 'Nuria');
  `)
})
afterAll(async () => {
  await db.close()
})

describe('save_article: crear', () => {
  it('el editor crea un artículo con sus secciones, en orden', async () => {
    const { rows } = await save(NURIA, null, 'Cómo cargar el reloj', [
      section('Qué ocurre', 'Texto explicativo'),
      section('Pasos', '', ['Conecta la base', 'Coloca el reloj']),
    ])
    const id = rows[0].id
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(await sectionsOf(id)).toEqual([
      { position: 0, heading: 'Qué ocurre', body: 'Texto explicativo', steps: [] },
      { position: 1, heading: 'Pasos', body: '', steps: ['Conecta la base', 'Coloca el reloj'] },
    ])
    const art = await db.query<{ category: string; last_reviewed_at: Date }>('select category, last_reviewed_at from public.articles where id = $1', [id])
    expect(art.rows[0].category).toBe('Batería y carga')
  })

  it('recorta espacios sobrantes en título, categoría, encabezados, textos y pasos', async () => {
    const { rows } = await save(
      NURIA, null, '  Título con espacios  ',
      [section('  Encabezado  ', '  cuerpo  ', ['  paso uno  '])], '  Categoría  ',
    )
    const art = await db.query<{ title: string; category: string }>('select title, category from public.articles where id = $1', [rows[0].id])
    expect(art.rows[0]).toEqual({ title: 'Título con espacios', category: 'Categoría' })
    expect(await sectionsOf(rows[0].id)).toEqual([{ position: 0, heading: 'Encabezado', body: 'cuerpo', steps: ['paso uno'] }])
  })

  it('sin fecha usa la de hoy', async () => {
    const { rows } = await save(NURIA, null, 'Artículo sin fecha', [section('Pasos', 'x')], 'Categoría', null)
    const art = await db.query<{ ok: boolean }>('select last_reviewed_at = current_date as ok from public.articles where id = $1', [rows[0].id])
    expect(art.rows[0].ok).toBe(true)
  })

  it('lo que crea el editor lo encuentra el buscador del asistente (de extremo a extremo)', async () => {
    await save(NURIA, null, 'Resistencia al agua del reloj', [
      section('Qué debes saber', 'El reloj Velia Brisa resiste salpicaduras pero no la inmersión.'),
    ], 'Uso diario')
    const hits = await as<{ article_title: string }>(LUCIA, `select article_title from public.search_knowledge('¿Es resistente al agua?', 3)`)
    expect(hits.rows[0].article_title).toBe('Resistencia al agua del reloj')
  })
})

describe('save_article: editar', () => {
  it('reemplaza título, categoría, fecha y todas las secciones', async () => {
    const id = (await save(NURIA, null, 'Título original largo', [section('Una', 'a'), section('Dos', 'b'), section('Tres', 'c')])).rows[0].id
    await save(NURIA, id, 'Título nuevo largo', [section('Única', '', ['Solo un paso'])], 'Otra categoría', '2026-10-01')

    const art = await db.query<{ title: string; category: string; last_reviewed_at: Date }>(
      'select title, category, last_reviewed_at from public.articles where id = $1', [id])
    expect(art.rows[0]).toMatchObject({ title: 'Título nuevo largo', category: 'Otra categoría' })
    expect(await sectionsOf(id)).toEqual([{ position: 0, heading: 'Única', body: '', steps: ['Solo un paso'] }])
  })

  it('permite reordenar secciones (la restricción de posición es diferible)', async () => {
    const id = (await save(NURIA, null, 'Artículo reordenable', [section('A', 'a'), section('B', 'b')])).rows[0].id
    await save(NURIA, id, 'Artículo reordenable', [section('B', 'b'), section('A', 'a')])
    expect((await sectionsOf(id)).map((s) => s.heading)).toEqual(['B', 'A'])
  })

  it('actualiza updated_at', async () => {
    const id = (await save(NURIA, null, 'Artículo con fecha de cambio', [section('A', 'a')])).rows[0].id
    const before = (await db.query<{ updated_at: Date }>('select updated_at from public.articles where id = $1', [id])).rows[0].updated_at
    await db.exec('select pg_sleep(0.01)')
    await save(NURIA, id, 'Artículo con fecha de cambio v2', [section('A', 'a')])
    const after = (await db.query<{ updated_at: Date }>('select updated_at from public.articles where id = $1', [id])).rows[0].updated_at
    expect(after.getTime()).toBeGreaterThan(before.getTime())
  })

  it('un id que no existe da error "no encontrado"', async () => {
    await expect(save(NURIA, '99999999-0000-4000-8000-000000000009', 'Título válido', [section('A', 'a')])).rejects.toMatchObject({ code: 'P0002' })
  })
})

describe('save_article: es atómico (todo o nada)', () => {
  it('si una sección es inválida al CREAR, no queda ningún artículo huérfano', async () => {
    const before = await countArticles()
    await expect(
      save(NURIA, null, 'Artículo que fallará', [section('Buena', 'ok'), section('Mala', '', ['x'.repeat(301)])]),
    ).rejects.toMatchObject({ code: '23514' })
    expect(await countArticles()).toBe(before)
  })

  it('si una sección es inválida al EDITAR, el artículo y sus secciones quedan intactos', async () => {
    const id = (await save(NURIA, null, 'Artículo que se conserva', [section('Original', 'texto', ['paso'])])).rows[0].id
    await expect(
      save(NURIA, id, 'Título que no debe aplicarse', [section('Nueva', 'ok'), section('Mala', '', ['  '])]),
    ).rejects.toMatchObject({ code: '23514' })

    const art = await db.query<{ title: string }>('select title from public.articles where id = $1', [id])
    expect(art.rows[0].title).toBe('Artículo que se conserva')
    expect(await sectionsOf(id)).toEqual([{ position: 0, heading: 'Original', body: 'texto', steps: ['paso'] }])
  })
})

describe('save_article: seguridad', () => {
  const ok = [section('A', 'a')]

  it('el agente NO puede crear ni editar', async () => {
    const id = (await save(NURIA, null, 'Artículo protegido', ok)).rows[0].id
    await expect(save(LUCIA, null, 'Intento del agente', ok)).rejects.toMatchObject({ code: '42501' })
    await expect(save(LUCIA, id, 'Intento de editar', ok)).rejects.toMatchObject({ code: '42501' })
    const art = await db.query<{ title: string }>('select title from public.articles where id = $1', [id])
    expect(art.rows[0].title).toBe('Artículo protegido')
  })

  it('un usuario sin perfil NO puede', async () => {
    await expect(save(GHOST, null, 'Intento sin perfil', ok)).rejects.toMatchObject({ code: '42501' })
  })

  it('un anónimo NO puede ejecutarla (sin permiso de ejecución)', async () => {
    await expect(save('anon', null, 'Intento anónimo', ok)).rejects.toMatchObject({ code: '42501' })
    const { rows } = await db.query<{ anon: boolean; authenticated: boolean }>(
      `select has_function_privilege('anon', 'public.save_article(uuid, text, text, date, jsonb)', 'execute') as anon,
              has_function_privilege('authenticated', 'public.save_article(uuid, text, text, date, jsonb)', 'execute') as authenticated`,
    )
    expect(rows[0]).toEqual({ anon: false, authenticated: true })
  })

  it('un SQL malicioso en los textos se guarda como texto, sin efecto', async () => {
    const before = await countArticles()
    const evil = "'); drop table public.articles; --"
    const { rows } = await save(NURIA, null, `Título ${evil}`, [section(evil, evil, [evil])], evil)
    expect(await countArticles()).toBe(before + 1)
    expect((await sectionsOf(rows[0].id))[0].steps).toEqual([evil])
  })
})

describe('save_article: validación del JSON', () => {
  const ok = section('A', 'a')
  it.each([
    ['no es un array', { heading: 'A' }],
    ['array vacío', []],
    ['más de 15 secciones', Array.from({ length: 16 }, () => ok)],
    ['una sección que no es un objeto', ['texto']],
    ['sección sin heading', [{ body: 'a', steps: [] }]],
    ['heading que no es texto', [{ heading: 5, body: 'a', steps: [] }]],
    ['body que no es texto', [{ heading: 'A', body: 5, steps: [] }]],
    ['steps que no es un array', [{ heading: 'A', body: '', steps: 'paso' }]],
    ['un paso que no es texto', [{ heading: 'A', body: '', steps: [1] }]],
  ])('rechaza: %s', async (_name, sections) => {
    const before = await countArticles()
    await expect(save(NURIA, null, 'Título válido', sections)).rejects.toMatchObject({ code: '22023' })
    expect(await countArticles()).toBe(before)
  })

  it('rechaza una sección sin texto ni pasos y títulos fuera de rango (CHECK)', async () => {
    await expect(save(NURIA, null, 'Título válido', [section('Vacía')])).rejects.toMatchObject({ code: '23514' })
    await expect(save(NURIA, null, 'abc', [ok])).rejects.toMatchObject({ code: '23514' })
    await expect(save(NURIA, null, 'x'.repeat(121), [ok])).rejects.toMatchObject({ code: '23514' })
    await expect(save(NURIA, null, 'Título válido', [ok], 'x')).rejects.toMatchObject({ code: '23514' })
  })
})
