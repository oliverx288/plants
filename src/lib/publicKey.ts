/**
 * Comprueba que la clave que se va a incrustar en el frontend es una clave PÚBLICA.
 * Todo lo que lleva el prefijo VITE_ acaba en el JavaScript que descarga cualquiera,
 * así que si alguien pega por error la service role key, la app se niega a arrancar.
 *
 * Devuelve un mensaje de error, o null si la clave es aceptable.
 */
export function checkPublicKey(key: string): string | null {
  const refusal =
    'La clave configurada en VITE_SUPABASE_ANON_KEY es una clave de administrador (service role). ' +
    'Nunca debe estar en el frontend: usa la clave anon/publishable.'

  // Formato nuevo de Supabase: sb_publishable_… (pública) y sb_secret_… (privada).
  if (key.startsWith('sb_secret_')) return refusal

  // Formato JWT clásico: el rol viaja en el payload.
  const parts = key.split('.')
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      if (payload?.role === 'service_role') return refusal
    } catch {
      // No es un JWT legible: que lo rechace Supabase si no es válida.
    }
  }
  return null
}
