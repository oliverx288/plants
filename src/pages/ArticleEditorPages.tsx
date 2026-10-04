import { useCallback } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArticleForm } from '../components/ArticleForm'
import { DeleteArticle } from '../components/DeleteArticle'
import { Alert, Button, Spinner } from '../components/ui'
import { emptyDraft, toDraft } from '../editor/draft'
import type { ArticleDraft } from '../editor/draft'
import { fetchArticle, fetchArticles } from '../lib/articles'
import { saveArticle } from '../lib/articlesAdmin'
import { useAsyncData } from '../lib/useAsyncData'
import { isUuid } from '../lib/uuid'

/** Categorías existentes para sugerirlas. Si no se pueden cargar, el formulario funciona igual sin sugerencias. */
function useCategories(): string[] {
  const { state } = useAsyncData(fetchArticles)
  if (state.status !== 'ready') return []
  return [...new Set(state.data.map((a) => a.category))].sort((a, b) => a.localeCompare(b, 'es'))
}

export function NewArticlePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const categories = useCategories()

  // Desde "Preguntas sin respuesta" se llega con la pregunta como título sugerido.
  const suggested = (location.state as { title?: unknown } | null)?.title
  const initial = emptyDraft(undefined, typeof suggested === 'string' ? suggested.slice(0, 120) : '')

  async function handleSubmit(draft: ArticleDraft) {
    const id = await saveArticle(null, draft)
    navigate(`/articulos/${id}`, { state: { notice: 'Artículo creado.' } })
  }

  return (
    <>
      <p>
        <Link to="/articulos">← Todos los artículos</Link>
      </p>
      <h1>Nuevo artículo</h1>
      <ArticleForm initial={initial} categories={categories} submitLabel="Crear artículo" onSubmit={handleSubmit} />
    </>
  )
}

export function EditArticlePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const categories = useCategories()

  const load = useCallback(() => (isUuid(id) ? fetchArticle(id) : Promise.resolve(null)), [id])
  const { state, reload } = useAsyncData(load)

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
  if (!article) {
    return (
      <>
        <h1>Artículo no encontrado</h1>
        <p>
          No existe o ya se ha borrado. <Link to="/articulos">Volver a los artículos</Link>
        </p>
      </>
    )
  }

  async function handleSubmit(draft: ArticleDraft) {
    await saveArticle(article!.id, draft)
    navigate(`/articulos/${article!.id}`, { state: { notice: 'Cambios guardados.' } })
  }

  return (
    <>
      <p>
        <Link to={`/articulos/${article.id}`}>← Volver al artículo</Link>
      </p>
      <h1>Editar artículo</h1>
      <ArticleForm
        key={article.id}
        initial={toDraft(article)}
        categories={categories}
        submitLabel="Guardar cambios"
        onSubmit={handleSubmit}
      />
      <DeleteArticle
        articleId={article.id}
        title={article.title}
        sectionCount={article.sections.length}
        onDeleted={() => navigate('/articulos', { state: { notice: 'Artículo borrado.' } })}
      />
    </>
  )
}
