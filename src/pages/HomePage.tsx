import { useAuth } from '../auth/AuthContext'
import { Card } from '../components/ui'

// Pantalla provisional: la sustituirá el asistente en la fase 6.
export function HomePage() {
  const { state } = useAuth()
  if (state.status !== 'signedIn') return null

  return (
    <>
      <h1>Hola, {state.profile.displayName}</h1>
      <Card>
        <p>Has iniciado sesión correctamente. Aquí estará el asistente de consultas.</p>
      </Card>
    </>
  )
}
