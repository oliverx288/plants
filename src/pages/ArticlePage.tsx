import { useCallback, useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Alert, Badge, Button, Spinner } from '../components/ui'
import { fetchArticle } from '../lib/articles'
import { formatDate } from '../lib/format'
import { useAsyncData } from '../lib/useAsyncData'
import { isUuid } from '../lib/uuid'
import styles from './ArticlePage.module.css'

function NotFound() {
  return (
    <>
      <h1>Artículo no encontrado</h1>
      <p>
        No existe o no tienes acceso. <Link to="/articulos">Volver a los artículos</Link>
      </p>
    </>
  )
}

export function ArticlePage() {
  const { id } = useParams()
  const { hash } = useLocation()

  // Un id mal formado ni siquiera se envía a la base de datos.
  const load = useCallback(() => (isUuid(id) ? fetchArticle(id) : Promise.resolve(null)), [id])
  const { state, reload } = useAsyncData(load)

  // Enlaces profundos a una sección (/articulos/:id#seccion-1), que usará el asistente para citar la fuente.
  // Se resalta con data-targeted y no con :target, porque el navegador no reevalúa :target
  // para elementos que React inserta después de cargar la página.
  const ready = state.status === 'ready'
  useEffect(() => {
    if (ready && hash) document.getElementById(hash.slice(1))?.scrollIntoView?.()
  }, [ready, hash])

  if (state.status === 'loading') return <Spinner label="Cargando artículo…" />
  if (state.status === 'error') {
    return (
      <Alert tone="danger" title="No se pudo cargar el artículo">
        <p>Comprueba tu conexión e inténtalo de nuevo.</p>
        <Button variant="secondary" onClick={reload}>
          Reintentar
        </Button>
      </Alert>
    )
  }
  const article = state.data
  if (!article) return <NotFound />

  return (
    <article>
      <p className={styles.back}>
        <Link to="/articulos">← Todos los artículos</Link>
      </p>
      <h1>{article.title}</h1>
      <p className={styles.meta}>
        <Badge>{article.category}</Badge>
        <span>Última revisión: {formatDate(article.lastReviewedAt)}</span>
      </p>

      {/* Todo el contenido son nodos de texto de React (escapados): nunca se interpreta como HTML. */}
      {article.sections.map((section) => (
        <section
          key={section.id}
          id={`seccion-${section.position}`}
          className={styles.section}
          data-targeted={hash === `#seccion-${section.position}` || undefined}
        >
          <h2>{section.heading}</h2>
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
    </article>
  )
}
