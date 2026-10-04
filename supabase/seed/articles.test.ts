import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'
import { articles } from './articles'
import { articleId } from './ids'

const allText = (a: (typeof articles)[number]) =>
  [a.title, ...a.sections.flatMap((s) => [s.heading, s.body ?? '', ...(s.steps ?? [])])].join('\n')

describe('contenido de la base de conocimiento', () => {
  it('tiene unos 20 artículos, con títulos y slugs únicos', () => {
    expect(articles.length).toBeGreaterThanOrEqual(20)
    expect(new Set(articles.map((a) => a.slug)).size).toBe(articles.length)
    expect(new Set(articles.map((a) => a.title)).size).toBe(articles.length)
  })

  it('cubre las categorías pedidas', () => {
    const categories = new Set(articles.map((a) => a.category))
    for (const c of [
      'Primera configuración', 'GPS y ubicación', 'Batería y carga', 'Botón SOS', 'Llamadas',
      'App del familiar', 'Notificaciones', 'Suscripción', 'Actualizaciones',
    ]) {
      expect(categories, c).toContain(c)
    }
  })

  it('cada artículo tiene al menos 2 secciones con contenido y una fecha de revisión válida', () => {
    for (const a of articles) {
      expect(a.sections.length, a.slug).toBeGreaterThanOrEqual(2)
      expect(a.lastReviewed, a.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(a.lastReviewed).getTime(), a.slug).toBeLessThanOrEqual(Date.now())
      for (const s of a.sections) {
        expect((s.body ?? '').trim().length + (s.steps?.length ?? 0), `${a.slug} · ${s.heading}`).toBeGreaterThan(0)
      }
    }
  })

  it('los huecos deliberados no están cubiertos por ningún artículo', () => {
    const forbidden = /garant[ií]a|devoluci|\bagua\b|impermeab|sumergi|precio|pulsera|correa/i
    for (const a of articles) expect(allText(a), a.slug).not.toMatch(forbidden)
  })

  it('los ids derivados del slug son UUID v5 válidos y estables', () => {
    const ids = articles.map((a) => articleId(a.slug))
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(articleId('ubicacion-no-se-actualiza')).toBe(articleId('ubicacion-no-se-actualiza'))
  })
})

describe('el contenido cumple las restricciones reales de la base de datos', () => {
  it('se insertan los artículos y secciones en el esquema de las migraciones', async () => {
    const db = new PGlite()
    await db.exec(`
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    `)
    const dir = join(__dirname, '..', 'migrations')
    for (const file of readdirSync(dir).sort()) {
      // Las migraciones de RLS usan roles de Supabase que aquí no hacen falta para validar CHECKs.
      if (file.includes('rls')) continue
      await db.exec(readFileSync(join(dir, file), 'utf8'))
    }

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
    const { rows } = await db.query<{ n: number }>('select count(*)::int as n from public.article_sections')
    expect(rows[0].n).toBe(articles.reduce((sum, a) => sum + a.sections.length, 0))
    await db.close()
  })
})
