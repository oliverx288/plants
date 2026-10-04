import { createClient } from '@supabase/supabase-js'
import { checkPublicKey } from './publicKey'

function validateConfig(url: string | undefined, anonKey: string | undefined): string | null {
  if (!url || !anonKey) {
    return 'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Copia .env.example a .env y rellénalos.'
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return 'VITE_SUPABASE_URL no es una URL válida.'
  }
  const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
  if (parsed.protocol !== 'https:' && !isLocal) {
    return 'VITE_SUPABASE_URL debe usar https.'
  }
  return checkPublicKey(anonKey)
}

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/** Mensaje de configuración incorrecta, o null si todo está bien. main.tsx lo muestra en vez de arrancar. */
export const supabaseConfigError = validateConfig(url, anonKey)

// Con configuración inválida se crea un cliente con valores de relleno que nunca se usa:
// main.tsx no monta la app, así que no se hace ninguna petición.
export const supabase = createClient(
  supabaseConfigError ? 'http://localhost:54321' : url!,
  supabaseConfigError ? 'sin-configurar' : anonKey!,
)
