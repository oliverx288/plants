/*
 * Pruebas de intrusión contra TU proyecto de Supabase real: un agente (y alguien sin sesión) intenta crear,
 * editar y borrar artículos, ascenderse a editor, leer lo que no debe, etc., por la API directamente.
 *
 * Uso:  npm run security:live      (lee .env; ver .env.example)
 *
 * Necesita la clave PÚBLICA (anon) y las contraseñas de Lucía (agente) y Nuria (editora); NO usa la service role.
 * Los ataques se dirigen a un artículo y una pregunta TEMPORALES que se crean y se borran dentro del propio
 * script, nunca a los artículos reales. Sale con código 1 si alguna protección falla.
 */
import { createClient } from '@supabase/supabase-js'
import { checkPublicKey } from '../src/lib/publicKey'
import { formatAttempts, runSecurityAttempts } from '../security/attempts'

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
const agentEmail = process.env.SEED_AGENT_EMAIL?.trim() || 'lucia@velia-demo.test'
const editorEmail = process.env.SEED_EDITOR_EMAIL?.trim() || 'nuria@velia-demo.test'
const agentPassword = requireEnv('SEED_AGENT_PASSWORD')
const editorPassword = requireEnv('SEED_EDITOR_PASSWORD')

const keyProblem = checkPublicKey(anonKey)
if (keyProblem) {
  console.error(keyProblem)
  process.exit(1)
}

const newClient = () => createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function signedIn(email: string, password: string, who: string) {
  const client = newClient()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`No se pudo iniciar sesión como ${who} (${email}). Revisa su contraseña en el .env.`)
  return client
}

async function main() {
  console.log(`Pruebas de intrusión contra ${new URL(url).host}`)
  console.log(`Actores: sin sesión · agente (${agentEmail}) · editora (${editorEmail})\n`)

  const [agent, editor] = [await signedIn(agentEmail, agentPassword, 'el agente'), await signedIn(editorEmail, editorPassword, 'la editora')]

  const { results, cleanup } = await runSecurityAttempts({
    anon: newClient(),
    agent,
    editor,
    // Petición HTTP directa, sin la librería: lo mismo que haría curl o un fetch() pegado en las DevTools.
    rawPost: async (table, body, accessToken) => {
      const response = await fetch(`${url}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(body),
      })
      const text = await response.text()
      let parsed: unknown = text
      try {
        parsed = JSON.parse(text)
      } catch {
        /* cuerpo no JSON */
      }
      return { status: response.status, body: parsed }
    },
  })

  console.log(formatAttempts(results))
  console.log(`\n${cleanup}`)

  const failed = results.filter((r) => !r.pass)
  if (failed.length > 0) {
    console.error(`\n✗ ${failed.length} comprobación(es) FALLARON: hay una protección rota. IDs: ${failed.map((r) => r.id).join(', ')}`)
    process.exit(1)
  }
  console.log('\n✓ Todas las protecciones funcionan: ningún intento de intrusión tuvo efecto.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
