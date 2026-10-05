import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArticleForm } from '../components/ArticleForm'
import { Alert, Button, Card, Spinner } from '../components/ui'
import type { ArticleDraft } from '../editor/draft'
import { saveArticle } from '../lib/articlesAdmin'
import { PDF_LIMITS, PdfImportError } from '../pdf/extract'
import { importPdf, importedToDraft } from '../pdf/importPdf'
import { useCategories } from './ArticleEditorPages'
import styles from './ImportPdfPage.module.css'

type View =
  | { status: 'idle' }
  | { status: 'reading'; filename: string }
  | { status: 'error'; message: string }
  | { status: 'review'; filename: string; draft: ArticleDraft; warnings: string[]; attempt: number }

/**
 * Importar un PDF como artículo (solo editor).
 *
 * El PDF se lee en el navegador: no se sube a ningún sitio. El resultado NO se publica solo: es un borrador que la
 * editora revisa y corrige en el formulario de siempre; al pulsar «Crear artículo» pasa por save_article, con las
 * mismas validaciones y la misma RLS que cualquier otro artículo. (La extracción es una heurística y puede
 * equivocarse; publicarla sin revisar rompería la promesa de que lo que dice el asistente es fiable.)
 */
export function ImportPdfPage() {
  const navigate = useNavigate()
  const categories = useCategories()
  const [view, setView] = useState<View>({ status: 'idle' })
  const input = useRef<HTMLInputElement>(null)
  const attempts = useRef(0)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setView({ status: 'reading', filename: file.name })
    try {
      const article = await importPdf(file)
      setView({
        status: 'review',
        filename: file.name,
        draft: importedToDraft(article),
        warnings: article.warnings,
        attempt: ++attempts.current,
      })
    } catch (error) {
      setView({
        status: 'error',
        message: error instanceof PdfImportError ? error.message : 'No se pudo leer el PDF. Inténtalo de nuevo.',
      })
    } finally {
      // Permite elegir el mismo archivo otra vez (si no, el navegador no dispara "change").
      if (input.current) input.current.value = ''
    }
  }

  async function handleSubmit(draft: ArticleDraft) {
    const id = await saveArticle(null, draft)
    navigate(`/articulos/${id}`, { state: { notice: 'Artículo creado a partir del PDF.' } })
  }

  const reading = view.status === 'reading'

  return (
    <>
      <p>
        <Link to="/articulos">← Todos los artículos</Link>
      </p>
      <h1>Importar PDF</h1>
      <p className={styles.intro}>
        Sube un PDF con texto y Faro propondrá un artículo con sus secciones y pasos. Lo revisarás antes de crearlo.
      </p>

      <Card className={styles.picker}>
        <label htmlFor="pdf-file" className={styles.label}>
          Archivo PDF
        </label>
        <p id="pdf-hint" className={styles.hint}>
          Máximo {PDF_LIMITS.maxBytes / 1024 / 1024} MB y {PDF_LIMITS.maxPages} páginas. Se lee en tu navegador: el
          archivo no se sube a ningún servidor. No admite PDFs escaneados (sin texto seleccionable).
        </p>
        <input
          ref={input}
          id="pdf-file"
          type="file"
          accept="application/pdf,.pdf"
          className={styles.file}
          aria-describedby="pdf-hint"
          disabled={reading}
          onChange={(e) => void handleFile(e)}
        />
      </Card>

      <div aria-live="polite" className={styles.status}>
        {view.status === 'reading' && <Spinner label={`Leyendo «${view.filename}»…`} />}

        {view.status === 'error' && (
          <Alert tone="danger" title="No se pudo importar el PDF">
            {view.message}
          </Alert>
        )}
      </div>

      {view.status === 'review' && (
        <section aria-labelledby="borrador" className={styles.review}>
          <h2 id="borrador">Borrador de «{view.filename}»</h2>
          <Alert tone="info" title="Revisa antes de crear el artículo">
            <p>
              Faro ha dividido el texto por tamaño de letra y numeración, y puede equivocarse. Comprueba el título, los
              encabezados y los pasos, <strong>elige la categoría</strong> y pulsa «Crear artículo»: hasta entonces no
              se publica nada.
            </p>
          </Alert>
          {view.warnings.length > 0 && (
            <Alert tone="warning" title="Cosas a revisar" style={{ marginTop: 'var(--space-3)' }}>
              <ul className={styles.warnings}>
                {view.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Alert>
          )}
          <div className={styles.form}>
            {/* key: un PDF nuevo reinicia el formulario con su borrador. */}
            <ArticleForm
              key={view.attempt}
              initial={view.draft}
              categories={categories}
              submitLabel="Crear artículo"
              onSubmit={handleSubmit}
            />
          </div>
          <Button variant="secondary" onClick={() => setView({ status: 'idle' })}>
            Descartar borrador
          </Button>
        </section>
      )}
    </>
  )
}
