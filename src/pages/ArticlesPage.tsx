import { Link } from 'react-router-dom'
import { useIsEditor } from '../auth/useIsEditor'
import { Alert, Button, ButtonLink, Card, CategoryTag, Spinner } from '../components/ui'
import { fetchArticles } from '../lib/articles'
import { groupByCategory } from '../lib/categories'
import { formatDate } from '../lib/format'
import { useAsyncData } from '../lib/useAsyncData'
import { useFlashNotice } from '../lib/useFlashNotice'
import styles from './ArticlesPage.module.css'

export function ArticlesPage() {
  const { state, reload } = useAsyncData(fetchArticles)
  const isEditor = useIsEditor()
  const notice = useFlashNotice()

  return (
    <>
      {notice && (
        <Alert tone="success" style={{ marginBottom: 'var(--space-4)' }}>
          {notice}
        </Alert>
      )}
      <h1>Artículos</h1>
      <p className={styles.intro}>Base de conocimiento de soporte, por categorías.</p>
      {isEditor && (
        <p>
          <ButtonLink to="/articulos/nuevo">Nuevo artículo</ButtonLink>
        </p>
      )}

      {state.status === 'loading' && <Spinner label="Cargando artículos…" />}

      {state.status === 'error' && (
        <Alert tone="danger" title="No se pudieron cargar los artículos">
          <p>Comprueba tu conexión e inténtalo de nuevo.</p>
          <Button variant="secondary" onClick={reload}>
            Reintentar
          </Button>
        </Alert>
      )}

      {state.status === 'ready' && state.data.length === 0 && (
        <Alert tone="info">Todavía no hay artículos en la base de conocimiento.</Alert>
      )}

      {state.status === 'ready' && state.data.length > 0 && (
        <div className={styles.grid}>
          {groupByCategory(state.data).map((group) => (
            <Card key={group.category} className={styles.group}>
              <h2 className={styles.category}>
                <CategoryTag category={group.category} />
              </h2>
              <ul className={styles.list}>
                {group.items.map((article) => (
                  <li key={article.id}>
                    <Link to={`/articulos/${article.id}`} className={styles.link}>
                      {article.title}
                    </Link>
                    <span className={styles.meta}>Revisado el {formatDate(article.lastReviewedAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
