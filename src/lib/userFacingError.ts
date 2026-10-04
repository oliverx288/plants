/**
 * Error cuyo mensaje es seguro y útil para mostrar al usuario.
 * Cualquier otro error (red, formato inesperado…) se muestra con un mensaje genérico para no filtrar detalles internos.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserFacingError'
  }
}

export function messageFor(error: unknown, fallback: string): string {
  return error instanceof UserFacingError ? error.message : fallback
}
