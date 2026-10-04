import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { articles } from '../seed/articles'
import { articleId } from '../seed/ids'
import { createTestDb } from './helpers'

/*
 * Tolerancia a erratas de search_knowledge (migración 7), sobre un Postgres real.
 * Además del contenido real del seed hay dos artículos con palabras inventadas (sin significado en español, para que
 * el stemmer no las toque) que permiten probar casos que el vocabulario real no tiene: empates de candidatas.
 */

const LUCIA = '00000000-0000-4000-8000-000000000001'
const ZORB_X = '90000000-0000-4000-8000-000000000001'
const ZORB_Z = '90000000-0000-4000-8000-000000000002'
let db: PGlite

interface Hit { article_id: string; article_title: string; score: number; matched_terms: number; query_terms: number }

async function search(question: string) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${LUCIA}', false);`)
  try {
    return (await db.query<Hit>('select * from public.search_knowledge($1, 5)', [question])).rows
  } finally {
    await db.exec('reset role')
  }
}
const titles = async (q: string) => (await search(q)).map((h) => h.article_title)

beforeAll(async () => {
  db = await createTestDb()
  await db.exec(`
    insert into auth.users (id) values ('${LUCIA}');
    insert into public.profiles (id, role, display_name) values ('${LUCIA}', 'agent', 'Lucía');
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
  for (const [id, title] of [[ZORB_X, 'Zorbinx'], [ZORB_Z, 'Zorbinz']]) {
    await db.query("insert into public.articles (id, title, category, last_reviewed_at) values ($1,$2,'Prueba','2026-01-01')", [id, title])
    await db.query("insert into public.article_sections (article_id, position, heading, body, steps) values ($1,0,'Cuerpo','texto','{}')", [id])
  }
})
afterAll(async () => {
  await db.close()
})

describe('erratas: se corrige una palabra que no existe', () => {
  it('letra de más, de menos o cambiada: "baterai", "bateria" sin tilde, "baterya"', async () => {
    for (const q of ['baterai', 'baterya', 'bateri']) {
      const hits = await search(q)
      expect(hits[0].article_title, q).toMatch(/batería/i)
      expect(hits[0].matched_terms, q).toBe(1)
    }
  })

  it('transposición: "bateira" → batería', async () => {
    expect((await search('bateira'))[0].article_title).toMatch(/batería/i)
  })

  it('en una frase: "no enciedne" → "El reloj no enciende…"', async () => {
    expect((await search('no enciedne'))[0].article_title).toBe('El reloj no enciende o se queda en el logotipo')
  })

  it('corregir no cambia la puntuación de la consulta correcta: da lo mismo que escribirla bien', async () => {
    const bien = await search('la batería dura poco')
    const mal = await search('la baterya dura poco')
    expect(mal.map((h) => [h.article_id, h.score])).toEqual(bien.map((h) => [h.article_id, h.score]))
  })
})

describe('erratas: lo que NO se corrige', () => {
  it('una palabra que existe nunca se toca ("cuenta" no se vuelve "cuento")', async () => {
    const a = await search('cuenta')
    expect(a.every((h) => h.matched_terms === 1)).toBe(true)
  })

  it('raíces de menos de 6 letras: "quiero" no se convierte en "querer", "cuesta" no en "cuenta"', async () => {
    expect(await titles('quiero')).toEqual([])
    expect(await titles('cuesta')).toEqual([])
  })

  it('dos errores que no son una transposición no se corrigen ("pulsera" no es "pulsar")', async () => {
    expect(await titles('bateriaaaa')).toEqual([])
    expect(await titles('batxxia')).toEqual([])
  })

  it('la primera letra debe coincidir ("xateria")', async () => {
    expect(await titles('xateria')).toEqual([])
  })

  it('con dos candidatas a la misma distancia no se corrige: "zorbinq" es igual de cercana a "zorbinx" y a "zorbinz"', async () => {
    expect(await titles('zorbinq')).toEqual([])
    // ...y las palabras exactas siguen funcionando
    expect(await titles('zorbinx')).toEqual(['Zorbinx'])
    expect(await titles('zorbinz')).toEqual(['Zorbinz'])
  })

  it('una palabra sin parecido con nada no encuentra nada', async () => {
    expect(await titles('wifi')).toEqual([])
    expect(await titles('qwertyuiop')).toEqual([])
  })
})

describe('erratas: permisos', () => {
  it('anon sigue sin poder ejecutar la búsqueda', async () => {
    await db.exec(`set role anon; select set_config('request.jwt.claim.sub', '', false);`)
    try {
      await expect(db.query("select * from public.search_knowledge('bateria')")).rejects.toThrow(/permission denied/)
    } finally {
      await db.exec('reset role')
    }
  })

  it('la función sigue siendo SECURITY INVOKER con search_path vacío', async () => {
    const { rows } = await db.query<{ secdef: boolean; cfg: string[] }>(
      "select prosecdef as secdef, proconfig as cfg from pg_proc where proname = 'search_knowledge'",
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].secdef).toBe(false)
    expect(rows[0].cfg).toContain('search_path=""')
  })
})
