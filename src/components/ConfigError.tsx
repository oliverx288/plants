import { Alert } from './ui'

/** Se muestra en vez de la app cuando falta o es peligrosa la configuración de Supabase. */
export function ConfigError({ message }: { message: string }) {
  return (
    <main style={{ maxWidth: '40rem', margin: 'var(--space-7) auto', padding: '0 var(--space-4)' }}>
      <h1>Faro no puede arrancar</h1>
      <Alert tone="danger" title="Configuración incorrecta">
        {message}
      </Alert>
    </main>
  )
}
