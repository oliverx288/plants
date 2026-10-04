import { Alert, Badge, Button, Card, InputField, Spinner, TextareaField } from './components/ui'

// Pantalla provisional: muestra el sistema de diseño. Se sustituirá por el router en la fase de auth.
export function App() {
  return (
    <main style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: 'var(--space-5)' }}>
      <h1>Faro · sistema de diseño</h1>
      <p>Componentes base de la interfaz de soporte de Velia.</p>

      <Card>
        <h2>Formulario</h2>
        <InputField label="Correo electrónico" hint="Usa tu correo de trabajo." type="email" />
        <InputField label="Contraseña" type="password" error="La contraseña es obligatoria." />
        <TextareaField label="Duda del cliente" placeholder="Escribe la duda con tus palabras" />
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Button>Preguntar</Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="danger">Borrar</Button>
          <Button disabled>Deshabilitado</Button>
        </div>
      </Card>

      <div style={{ display: 'grid', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
        <Alert tone="info" title="Información">Mensaje informativo.</Alert>
        <Alert tone="success" title="Hecho">Se guardó correctamente.</Alert>
        <Alert tone="warning" title="Atención">No tengo información sobre esto.</Alert>
        <Alert tone="danger" title="Error">No se pudo completar la acción.</Alert>
        <div><Badge>Batería y carga</Badge> <Spinner /></div>
      </div>
    </main>
  )
}
