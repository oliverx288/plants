import { useState } from 'react'
import { submitFeedback } from '../assistant/feedback'
import { messageFor } from '../lib/userFacingError'
import { Button } from './ui'
import styles from './AnswerFeedback.module.css'

interface AnswerFeedbackProps {
  question: string
  articleId: string
}

type Status = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string }

/**
 * "¿Te sirvió esta respuesta?". Permite cambiar de opinión (se actualiza, no se duplica).
 */
export function AnswerFeedback({ question, articleId }: AnswerFeedbackProps) {
  const [choice, setChoice] = useState<boolean | null>(null)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function rate(helpful: boolean) {
    const previous = choice
    setChoice(helpful)
    setStatus({ kind: 'saving' })
    try {
      await submitFeedback({ question, articleId, helpful })
      setStatus({ kind: 'saved' })
    } catch (error) {
      setChoice(previous) // no se da por guardada una valoración que no se guardó
      setStatus({ kind: 'error', message: messageFor(error, 'No se pudo guardar tu valoración. Inténtalo de nuevo.') })
    }
  }

  return (
    <div role="group" aria-labelledby="feedback-label" className={styles.feedback}>
      <span id="feedback-label" className={styles.label}>
        ¿Te sirvió esta respuesta?
      </span>
      <div className={styles.buttons}>
        <Button variant={choice === true ? 'primary' : 'secondary'} aria-pressed={choice === true} onClick={() => void rate(true)}>
          Sí, me sirvió
        </Button>
        <Button variant={choice === false ? 'primary' : 'secondary'} aria-pressed={choice === false} onClick={() => void rate(false)}>
          No me sirvió
        </Button>
      </div>
      <p role={status.kind === 'error' ? 'alert' : 'status'} className={status.kind === 'error' ? styles.error : styles.message}>
        {status.kind === 'saving' && 'Guardando…'}
        {status.kind === 'saved' && 'Gracias por tu valoración.'}
        {status.kind === 'error' && status.message}
      </p>
    </div>
  )
}
