import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Badge, Button, ButtonLink, Card, Spinner } from '../components/ui'
import { fetchFeedback, groupFeedback, summarizeFeedback } from '../lib/feedbackAdmin'
import { formatDate } from '../lib/format'
import { useAsyncData } from '../lib/useAsyncData'
import styles from './FeedbackPage.module.css'

export function FeedbackPage() {
  const { state, reload } = useAsyncData(fetchFeedback)
  const [showHelpful, setShowHelpful] = useState(false)

  const items = state.status === 'ready' ? state.data : []
  const summary = summarizeFeedback(items)
  const groups = groupFeedback(items)
  const visible = groups.filter((g) => g.helpful === showHelpful)

  return (
    <>
      <h1>Valoraciones de las respuestas</h1>
      <p className={styles.intro}>
        Lo que opina el equipo de las respuestas del asistente. Las que «no sirvieron» señalan artículos que conviene
        revisar o completar.
      </p>

      {state.status === 'loading' && <Spinner label="Cargando valoraciones…" />}

      {state.status === 'error' && (
        <Alert tone="danger" title="No se pudieron cargar las valoraciones">
          <p>Comprueba tu conexión e inténtalo de nuevo.</p>
          <Button variant="secondary" onClick={reload}>
            Reintentar
          </Button>
        </Alert>
      )}

      {state.status === 'ready' && summary.total === 0 && (
        <Alert tone="info">Todavía no hay valoraciones. Aparecerán cuando el equipo valore las respuestas del asistente.</Alert>
      )}

      {state.status === 'ready' && summary.total > 0 && (
        <>
          <Card className={styles.summary}>
            <p className={styles.big}>{summary.helpfulPercent} % de respuestas útiles</p>
            <p className={styles.small}>
              {summary.total} {summary.total === 1 ? 'valoración' : 'valoraciones'}: {summary.helpful} positivas y{' '}
              {summary.unhelpful} negativas.
            </p>
            {summary.total < 30 && (
              <p className={styles.small}>Con pocas valoraciones el porcentaje es orientativo.</p>
            )}
          </Card>

          <div className={styles.filter} role="group" aria-label="Filtrar valoraciones">
            <Button variant={showHelpful ? 'secondary' : 'primary'} aria-pressed={!showHelpful} onClick={() => setShowHelpful(false)}>
              No me sirvió ({summary.unhelpful})
            </Button>
            <Button variant={showHelpful ? 'primary' : 'secondary'} aria-pressed={showHelpful} onClick={() => setShowHelpful(true)}>
              Me sirvió ({summary.helpful})
            </Button>
          </div>

          {visible.length === 0 ? (
            <Alert tone="info">{showHelpful ? 'Todavía no hay valoraciones positivas.' : 'No hay valoraciones negativas. ¡Buen trabajo!'}</Alert>
          ) : (
            <ul className={styles.list}>
              {visible.map((g) => (
                <li key={`${g.helpful}|${g.articleId ?? g.articleTitle}|${g.question}`}>
                  <Card className={styles.item}>
                    <p className={styles.question}>
                      <q>{g.question}</q>
                    </p>
                    <p className={styles.meta}>
                      Respondió con:{' '}
                      {g.articleId ? <Link to={`/articulos/${g.articleId}`}>{g.articleTitle}</Link> : <span>{g.articleTitle} (artículo borrado)</span>}
                    </p>
                    <p className={styles.meta}>
                      {g.count > 1 && <Badge>{g.count} valoraciones</Badge>} {g.askedBy.join(', ')} · última vez el{' '}
                      {formatDate(g.lastAt.slice(0, 10))}
                    </p>
                    {!g.helpful && g.articleId && (
                      <ButtonLink to={`/articulos/${g.articleId}/editar`} variant="secondary">
                        Revisar este artículo
                      </ButtonLink>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}
