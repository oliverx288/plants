export type Role = 'agent' | 'editor'

export interface Profile {
  id: string
  role: Role
  displayName: string
}

export const ROLE_LABELS: Record<Role, string> = {
  agent: 'Agente',
  editor: 'Editor',
}

/**
 * Convierte la fila de la tabla 'profiles' en un Profile, o null si no es válida.
 * El rol SIEMPRE sale de esta tabla (protegida por RLS), nunca de user_metadata del token,
 * que el propio usuario puede modificar.
 */
export function parseProfile(row: unknown): Profile | null {
  if (typeof row !== 'object' || row === null) return null
  const { id, role, display_name } = row as Record<string, unknown>
  if (typeof id !== 'string' || typeof display_name !== 'string') return null
  if (role !== 'agent' && role !== 'editor') return null
  return { id, role, displayName: display_name }
}
