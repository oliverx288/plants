import { useAuth } from '../auth/AuthContext'
import { Alert, Button } from './ui'

export function AccessDenied({ reason }: { reason: 'no-profile' | 'error' }) {
  const { signOut } = useAuth()
  const message =
    reason === 'no-profile'
      ? 'Tu cuenta no tiene acceso a Faro. Pide a un administrador que te asigne un rol.'
      : 'No se pudo comprobar tu perfil. Cierra sesión e inténtalo de nuevo.'

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: '32rem', margin: 'var(--space-6) auto', padding: '0 var(--space-4)' }}>
      <Alert tone="danger" title="Acceso no autorizado">
        {message}
      </Alert>
      <div>
        <Button variant="secondary" onClick={() => void signOut()}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}
