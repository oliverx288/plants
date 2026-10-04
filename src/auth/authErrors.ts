import type { AuthError } from '@supabase/supabase-js'

/**
 * Traduce un error de login a un mensaje para el usuario.
 * Nunca se muestra error.message tal cual y no se distingue "correo inexistente" de
 * "contraseña incorrecta": así no se puede averiguar qué correos tienen cuenta.
 */
export function loginErrorMessage(error: Pick<AuthError, 'status' | 'code'>): string {
  if (error.status === 429 || error.code === 'over_request_rate_limit') {
    return 'Demasiados intentos. Espera unos minutos antes de volver a probar.'
  }
  if (error.code === 'invalid_credentials' || error.status === 400) {
    return 'Correo o contraseña incorrectos.'
  }
  return 'No se pudo iniciar sesión. Inténtalo de nuevo en unos minutos.'
}
