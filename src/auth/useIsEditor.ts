import { useAuth } from './AuthContext'

/** Solo para mostrar u ocultar controles. La seguridad real la aplica la base de datos (RLS). */
export function useIsEditor(): boolean {
  const { state } = useAuth()
  return state.status === 'signedIn' && state.profile.role === 'editor'
}
