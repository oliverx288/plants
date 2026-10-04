import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ask } from '../assistant/ask'
import type { AskResult } from '../assistant/ask'
import { MAX_QUESTION_LENGTH, normalizeQuestion } from '../assistant/question'
import { Alert, Button, Card, Spinner, TextareaField } from '../components/ui'
import styles from './AssistantPage.module.css'

type View =
  | { status: 'idle' }
  | { status: 'loading'; question: string }
  | { status: 'done'; question: string; result: AskResult }
  | { status: 'error'; question: string }

function AnswerCard({ result }: { result: Extract<AskResult, { status: 'answer' }> }) {
  const { source, sections } = result.answer
  return (
    <Card as="article" aria-labelledby="respuesta-titulo">
      <h2 id="respuesta-titulo" className={styles.answerTitle}>
        Respuesta
      </h2>

      {/* Texto literal de los artículos: nunca se reescribe ni se interpreta como HTML. */}
      {sections.map((section) => (
        <section key={section.position} className={styles.block}>
          <h3>{section.heading}</h3>
          {section.body && <p className={styles.body}>{section.body}</p>}
          {section.steps.length > 0 && (
            <ol className={styles.steps}>
              {section.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          )}
        </section>
      ))}

      <p className={styles.source}>
        <strong>Fuente:</strong>{' '}
        <Link to={`/articulos/${source.articleId}#seccion-${sections[0].position}`}>{source.articleTitle}</Link>
        <span className={styles.category}> · {source.category}</span>
      </p>
    </Card>
  )
}

export function AssistantPage() {
  const [text, setText] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [view, setView] = useState<View>({ status: 'idle' })
  // Si el agente pregunta dos veces seguidas, solo cuenta la respuesta de la última.
  const latestRequest = useRef(0)

  async function run(question: string) {
    const requestId = ++latestRequest.current
    setView({ status: 'loading', question })
    try {
      const result = await ask(question)
      if (requestId === latestRequest.current) setView({ status: 'done', question, result })
    } catch {
      if (requestId === latestRequest.current) setView({ status: 'error', question })
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const check = normalizeQuestion(text)
    if (!check.ok) {
      setFieldError(check.error)
      return
    }
    setFieldError(undefined)
    void run(check.value)
  }

  const loading = view.status === 'loading'

  return (
    <>
      <h1>Asistente de soporte</h1>
      <p className={styles.intro}>
        Escribe la duda del cliente con tus palabras. Recibirás los pasos del artículo del que salen.
      </p>

      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <TextareaField
          label="Duda del cliente"
          hint="No incluyas datos personales del cliente (nombre, teléfono ni dirección)."
          value={text}
          onChange={(e) => setText(e.target.value)}
          error={fieldError}
          maxLength={MAX_QUESTION_LENGTH}
          rows={3}
        />
        <div className={styles.actions}>
          {/* No se desactiva mientras busca: en una llamada el agente puede corregir la duda y volver a
              preguntar sin esperar. Solo cuenta la respuesta de la última pregunta (latestRequest). */}
          <Button type="submit" aria-busy={loading}>
            {loading ? 'Buscando…' : 'Preguntar'}
          </Button>
          <span className={styles.counter}>
            {text.length}/{MAX_QUESTION_LENGTH}
          </span>
        </div>
      </form>

      {/* Región "en vivo": los lectores de pantalla anuncian el resultado cuando aparece. */}
      <div aria-live="polite" className={styles.results}>
        {view.status === 'loading' && <Spinner label="Buscando en los artículos…" />}

        {view.status === 'error' && (
          <Alert tone="danger" title="No se pudo consultar la base de conocimiento">
            <p>Comprueba tu conexión e inténtalo de nuevo.</p>
            <Button variant="secondary" onClick={() => void run(view.question)}>
              Reintentar
            </Button>
          </Alert>
        )}

        {view.status === 'done' && (
          <>
            <p className={styles.asked}>
              Duda: <q>{view.question}</q>
            </p>
            {view.result.status === 'answer' ? (
              <AnswerCard result={view.result} />
            ) : (
              <Alert tone="warning" title="No tengo información sobre esto">
                <p>Ningún artículo de la base de conocimiento cubre esta duda.</p>
                <p>
                  {view.result.logged
                    ? 'He guardado la pregunta para que el equipo de documentación pueda añadir un artículo.'
                    : 'No se pudo guardar la pregunta para el equipo de documentación.'}{' '}
                  Puedes reformularla o <Link to="/articulos">revisar todos los artículos</Link>.
                </p>
              </Alert>
            )}
          </>
        )}
      </div>
    </>
  )
}
