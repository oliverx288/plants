import { parseChunk } from '../../src/assistant/chunk'
import { articles } from '../seed/articles'
import { articleId } from '../seed/ids'
import { createTestDb } from '../tests/helpers'
import type { Search } from './evaluate'

const LUCIA = '00000000-0000-4000-8000-000000000001'

/**
 * Base de datos real (Postgres en WASM) con las migraciones y el contenido del seed, y una búsqueda que se
 * ejecuta como el agente Lucía (rol "authenticated", con RLS), igual que en la aplicación.
 */
export async function createPgliteSearch() {
  const db = await createTestDb()
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

  const search: Search = async (question) => {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${LUCIA}', false);`)
    try {
      const { rows } = await db.query('select * from public.search_knowledge($1, 3)', [question])
      return rows.map(parseChunk)
    } finally {
      await db.exec('reset role')
    }
  }
  return { search, close: () => db.close() }
}
