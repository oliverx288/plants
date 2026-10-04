import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getSafeRedirect } from '../auth/redirect'
import { AccessDenied } from '../components/AccessDenied'
import { Alert, Button, Card, InputField, Spinner } from '../components/ui'
import styles from './LoginPage.module.css'

const MAX_EMAIL = 254
const MAX_PASSWORD = 128
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FieldErrors {
  email?: string
  password?: string
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!email) errors.email = 'Escribe tu correo electrónico.'
  else if (email.length > MAX_EMAIL || !EMAIL_PATTERN.test(email)) errors.email = 'Escribe un correo válido, por ejemplo nombre@empresa.com.'
  if (!password) errors.password = 'Escribe tu contraseña.'
  else if (password.length > MAX_PASSWORD) errors.password = 'La contraseña es demasiado larga.'
  return errors
}

export function LoginPage() {
  const { state, signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (state.status === 'loading') return <Spinner label="Comprobando tu sesión…" />
  if (state.status === 'signedIn') {
    const from = (location.state as { from?: unknown } | null)?.from
    return <Navigate to={getSafeRedirect(from)} replace />
  }
  if (state.status === 'denied') return <AccessDenied reason={state.reason} />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    // El correo se normaliza; la contraseña NO se toca (los espacios pueden ser parte de ella).
    const normalizedEmail = email.trim().toLowerCase()
    const errors = validate(normalizedEmail, password)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    const result = await signIn(normalizedEmail, password)
    setSubmitting(false)
    if (!result.ok) {
      setPassword('')
      setFormError(result.message)
    }
    // Si va bien, AuthProvider actualiza el estado y esta página redirige sola.
  }

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <h1 className={styles.title}>Faro</h1>
        <p className={styles.subtitle}>Asistente de soporte de Velia</p>

        <form onSubmit={handleSubmit} noValidate>
          {formError && (
            <Alert tone="danger" title="No se pudo iniciar sesión" style={{ marginBottom: 'var(--space-4)' }}>
              {formError}
            </Alert>
          )}
          <InputField
            label="Correo electrónico"
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            maxLength={MAX_EMAIL}
            autoFocus
          />
          <InputField
            label="Contraseña"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            maxLength={MAX_PASSWORD}
          />
          <Button type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </Card>
    </main>
  )
}
