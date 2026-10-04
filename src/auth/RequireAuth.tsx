import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AccessDenied } from '../components/AccessDenied'
import { Spinner } from '../components/ui'
import { useAuth } from './AuthContext'

/** Ruta protegida: exige sesión y perfil. Solo mejora la experiencia; la seguridad real es RLS. */
export function RequireAuth() {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') return <Spinner label="Comprobando tu sesión…" />
  if (state.status === 'signedOut') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (state.status === 'denied') return <AccessDenied reason={state.reason} />
  return <Outlet />
}
