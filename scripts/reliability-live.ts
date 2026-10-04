/*
 * Mide la fiabilidad del asistente contra TU proyecto de Supabase real (no contra la base de pruebas local).
 * Inicia sesión como el agente de prueba (Lucía), ejecuta las mismas preguntas con la misma función de
 * búsqueda y el mismo umbral que la aplicación, y muestra el porcentaje de aciertos.
 *
 * Uso:  npm run reliability:live      (lee .env; ver .env.example)
 *
 * Solo necesita la clave PÚBLICA (anon) y la contraseña de Lucía: NO usa la service role key.
 * Debe dar el mismo resultado que `npm test` si la base tiene el contenido del seed.
 */
import { createClient } from '@supabase/supabase-js'
import { parseChunk } from '../src/assistant/chunk'
import { DEFAULT_GATE } from '../src/assistant/relevance'
import { checkPublicKey } from '../src/lib/publicKey'
import { collect, grade, summarize } from '../supabase/reliability/evaluate'
import { QUESTIONS } from '../supabase/reliability/questions'
import { formatFailures, formatMetrics, formatSweep } from '../supabase/reliability/report'
import { articles } from '../supabase/seed/articles'

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    console.error(`Falta la variable de entorno ${name}. Revisa tu .env (ver .env.example).`)
    process.exit(1)
  }
  return value
}

const url = requireEnv('VITE_SUPABASE_URL')
const anonKey = requireEnv('VITE_SUPABASE_ANON_KEY')
const email = process.env.SEED_AGENT_EMAIL?.trim() || 'lucia@velia-demo.test'
const password = requireEnv('SEED_AGENT_PASSWORD')

const keyProblem = checkPublicKey(anonKey)
if (keyProblem) {
  console.error(keyProblem)
  process.exit(1)
}

const supabase = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  console.log(`Fiabilidad contra ${new URL(url).host} (como ${email})\n`)

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) throw new Error('No se pudo iniciar sesión como el agente de prueba. Revisa SEED_AGENT_PASSWORD.')

  const { count, error: countError } = await supabase.from('articles').select('id', { count: 'exact', head: true })
  if (countError) throw new Error('No se pudo leer la tabla de artículos.')
  if (count !== articles.length) {
    console.log(
      `AVISO: la base tiene ${count} artículos y el seed ${articles.length}. Si has creado, editado o borrado artículos,\n` +
        'los resultados pueden diferir de los de `npm test`.\n',
    )
  }

  const raw = await collect(async (question) => {
    const { data, error } = await supabase.rpc('search_knowledge', { query_text: question, max_results: 3 })
    if (error) throw new Error(`La búsqueda falló: ${error.message}`)
    return ((data ?? []) as unknown[]).map(parseChunk)
  }, QUESTIONS)

  const results = raw.map((r) => grade(r))
  const all = summarize(results)
  console.log(formatMetrics('TOTAL', all))
  console.log('\nFallos:\n' + formatFailures(results))
  console.log(
    `\nQué pasa al mover la evidencia mínima (puntuación mínima ${DEFAULT_GATE.minScore}):\n` +
      formatSweep(raw, DEFAULT_GATE.minScore, [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0], DEFAULT_GATE.minMatchedWeight),
  )

  if (all.falsePositives > 0) {
    console.error(`\n✗ El asistente ha INVENTADO ${all.falsePositives} respuesta(s): se incumple la garantía principal.`)
    process.exit(1)
  }
  console.log('\n✓ Garantía principal cumplida: ninguna pregunta sin artículo recibió respuesta.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
