import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { unaccent } from '@electric-sql/pglite/contrib/unaccent'

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations', import.meta.url))

/**
 * Crea un Postgres real en memoria (PGlite) con lo mínimo de Supabase simulado
 * (roles anon/authenticated, esquema 'extensions', auth.users, auth.uid() y los
 * privilegios por defecto que Supabase concede en 'public') y aplica TODAS las migraciones.
 */
export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite({ extensions: { unaccent } })
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema extensions;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth, extensions to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    -- Supabase concede todo por defecto en 'public': nuestras migraciones deben recortarlo.
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;
  `)
  for (const file of readdirSync(MIGRATIONS_DIR).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
  }
  return db
}
