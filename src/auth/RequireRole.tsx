import { Outlet } from 'react-router-dom'
import { Alert } from '../components/ui'
import { useAuth } from './AuthContext'
import type { Role } from './profile'

/**
 * Oculta pantallas según el rol. Va SIEMPRE dentro de <RequireAuth>.
 * Importante: esto es solo experiencia de usuario. Aunque alguien lo salte desde las DevTools,
 * la base de datos (RLS) rechaza igualmente cualquier operación que su rol no permita.
 */
export function RequireRole({ role }: { role: Role }) {
  const { state } = useAuth()
  if (state.status !== 'signedIn' || state.profile.role !== role) {
    return (
      <Alert tone="warning" title="No tienes permiso para ver esta página">
        Esta sección es solo para el rol de editor.
      </Alert>
    )
  }
  return <Outlet />
}
