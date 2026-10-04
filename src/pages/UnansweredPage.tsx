import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Badge, Button, Card, Spinner } from '../components/ui'
import { fetchUnanswered, groupQuestions, setResolved } from '../lib/unansweredAdmin'
import type { QuestionGroup } from '../lib/unansweredAdmin'
import { formatDate } from '../lib/format'
import { messageFor } from '../lib/userFacingError'
import { useAsyncData } from '../lib/useAsyncData'
import styles from './UnansweredPage.module.css'

function QuestionItem({ group, onToggle, busy }: { group: QuestionGroup; onToggle: () => void; busy: boolean }) {
  return (
    <li>
      <Card className={styles.item}>
        <p className={styles.question}>
          {/* La pregunta la escribe un usuario: se muestra siempre como texto. */}
          <q>{group.question}</q>
        </p>
        <p className={styles.meta}>
          {group.count > 1 && <Badge>Preguntada {group.count} veces</Badge>}{' '}
          {group.askedBy.join(', ')} · última vez el {formatDate(group.lastAskedAt.slice(0, 10))}
        </p>
        <div className={styles.actions}>
          {!group.resolved && group.question.length >= 5 && (
            <Link to="/articulos/nuevo" state={{ title: group.question }} className={styles.createLink}>
              Crear un artículo con esta duda
            </Link>
          )}
          <Button variant="secondary" onClick={onToggle} disabled={busy}>
            {group.resolved ? 'Volver a pendiente' : 'Marcar como resuelta'}
          </Button>
        </div>
      </Card>
    </li>
  )
}

export function UnansweredPage() {
  const { state, reload } = useAsyncData(fetchUnanswered)
  const [showResolved, setShowResolved] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function toggle(group: QuestionGroup) {
    setBusyKey(group.ids.join(','))
    setActionError(null)
    try {
      await setResolved(group.ids, !group.resolved)
      reload()
    } catch (error) {
      setActionError(messageFor(error, 'No se pudo actualizar la pregunta. Inténtalo de nuevo.'))
    } finally {
      setBusyKey(null)
    }
  }

  const groups = state.status === 'ready' ? groupQuestions(state.data) : []
  const pending = groups.filter((g) => !g.resolved)
  const resolved = groups.filter((g) => g.resolved)
  const visible = showResolved ? resolved : pending

  return (
    <>
      <h1>Preguntas sin respuesta</h1>
      <p className={styles.intro}>
        Lo que el equipo ha preguntado y el asistente no supo responder. Las más repetidas indican qué artículos faltan.
      </p>

      {state.status === 'loading' && <Spinner label="Cargando preguntas…" />}

      {state.status === 'error' && (
        <Alert tone="danger" title="No se pudieron cargar las preguntas">
          <p>Comprueba tu conexión e inténtalo de nuevo.</p>
          <Button variant="secondary" onClick={reload}>
            Reintentar
          </Button>
        </Alert>
      )}

      {state.status === 'ready' && (
        <>
          <div className={styles.filter} role="group" aria-label="Filtrar preguntas">
            <Button variant={showResolved ? 'secondary' : 'primary'} aria-pressed={!showResolved} onClick={() => setShowResolved(false)}>
              Pendientes ({pending.length})
            </Button>
            <Button variant={showResolved ? 'primary' : 'secondary'} aria-pressed={showResolved} onClick={() => setShowResolved(true)}>
              Resueltas ({resolved.length})
            </Button>
          </div>

          {actionError && <Alert tone="danger">{actionError}</Alert>}

          {visible.length === 0 ? (
            <Alert tone="info">
              {showResolved ? 'Todavía no hay preguntas resueltas.' : 'No hay preguntas pendientes. ¡Buen trabajo!'}
            </Alert>
          ) : (
            <ul className={styles.list}>
              {visible.map((group) => (
                <QuestionItem
                  key={`${group.resolved}:${group.ids.join(',')}`}
                  group={group}
                  busy={busyKey === group.ids.join(',')}
                  onToggle={() => void toggle(group)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}
