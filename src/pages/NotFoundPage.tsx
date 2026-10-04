import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main style={{ maxWidth: '32rem', margin: 'var(--space-7) auto', padding: '0 var(--space-4)' }}>
      <h1>Página no encontrada</h1>
      <p>
        La dirección que buscas no existe. <Link to="/">Volver al inicio</Link>
      </p>
    </main>
  )
}
