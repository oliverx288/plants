/*
 * Carga los datos de demostración en Supabase: 2 usuarios de prueba (con su rol) y los artículos.
 *
 * Uso:  npm run seed      (lee .env; ver .env.example)
 *
 * SEGURIDAD: usa la service role key, que se salta RLS. Por eso:
 *  - solo se ejecuta en TU máquina, leyendo la clave de una variable de entorno;
 *  - esta clave NO lleva el prefijo VITE_, así que Vite jamás la incrusta en el frontend;
 *  - este archivo no lo importa nada de src/, así que no entra en el bundle.
 * Es idempotente: se puede ejecutar varias veces sin duplicar nada.
 */
import { createClient } from '@supabase/supabase-js'
import { articles } from '../supabase/seed/articles'
import { articleId } from '../supabase/seed/ids'

function requireEnv(name: string, minLength = 1): string {
  const value = process.env[name]?.trim()
  if (!value || value.length < minLength) {
    const extra = minLength > 1 ? ` (mínimo ${minLength} caracteres)` : ''
    console.error(`Falta la variable de entorno ${name}${extra}. Revisa tu .env (ver .env.example).`)
    process.exit(1)
  }
  return value
}

const url = requireEnv('VITE_SUPABASE_URL')
const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
const agentPassword = requireEnv('SEED_AGENT_PASSWORD', 12)
const editorPassword = requireEnv('SEED_EDITOR_PASSWORD', 12)
const agentEmail = process.env.SEED_AGENT_EMAIL?.trim() || 'lucia@velia-demo.test'
const editorEmail = process.env.SEED_EDITOR_EMAIL?.trim() || 'nuria@velia-demo.test'

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function fail(context: string, error: { message: string }): never {
  throw new Error(`${context}: ${error.message}`)
}

async function ensureUser(email: string, password: string, displayName: string, role: 'agent' | 'editor') {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 200 })
  if (listError) fail('No se pudo listar usuarios', listError)

  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  let id: string
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, { password, email_confirm: true })
    if (error) fail(`No se pudo actualizar a ${email}`, error)
    id = existing.id
  } else {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) fail(`No se pudo crear a ${email}`, error)
    id = data.user.id
  }

  const { error } = await supabase.from('profiles').upsert({ id, role, display_name: displayName })
  if (error) fail(`No se pudo guardar el perfil de ${email}`, error)
  console.log(`  ✓ ${displayName} (${role}) · ${email}`)
}

async function seedArticles() {
  const ids = articles.map((a) => articleId(a.slug))

  const { error: upsertError } = await supabase.from('articles').upsert(
    articles.map((a) => ({
      id: articleId(a.slug),
      title: a.title,
      category: a.category,
      last_reviewed_at: a.lastReviewed,
    })),
  )
  if (upsertError) fail('No se pudieron guardar los artículos', upsertError)

  // Las secciones se regeneran enteras para que el seed refleje siempre el contenido del repositorio.
  const { error: deleteError } = await supabase.from('article_sections').delete().in('article_id', ids)
  if (deleteError) fail('No se pudieron limpiar las secciones', deleteError)

  const sections = articles.flatMap((a) =>
    a.sections.map((s, position) => ({
      article_id: articleId(a.slug),
      position,
      heading: s.heading,
      body: s.body ?? '',
      steps: s.steps ?? [],
    })),
  )
  const { error: insertError } = await supabase.from('article_sections').insert(sections)
  if (insertError) fail('No se pudieron guardar las secciones', insertError)

  console.log(`  ✓ ${articles.length} artículos y ${sections.length} secciones`)
}

async function main() {
  console.log(`Seed contra ${new URL(url).host}`)
  console.log('Usuarios:')
  await ensureUser(agentEmail, agentPassword, 'Lucía', 'agent')
  await ensureUser(editorEmail, editorPassword, 'Nuria', 'editor')
  console.log('Contenido:')
  await seedArticles()
  console.log('Hecho.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
