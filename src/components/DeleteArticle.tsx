import { useState } from 'react'
import { Alert, Button } from './ui'
import { deleteArticle } from '../lib/articlesAdmin'
import { messageFor } from '../lib/userFacingError'
import styles from './DeleteArticle.module.css'

interface DeleteArticleProps {
  articleId: string
  title: string
  sectionCount: number
  onDeleted: () => void
}

/** Borrado en dos pasos: primero se pide confirmación, con el foco en "Cancelar" (la opción segura). */
export function DeleteArticle({ articleId, title, sectionCount, onDeleted }: DeleteArticleProps) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmDelete() {
    setBusy(true)
    setError(null)
    try {
      await deleteArticle(articleId)
      onDeleted()
    } catch (e) {
      setError(messageFor(e, 'No se pudo borrar el artículo. Inténtalo de nuevo.'))
      setBusy(false)
    }
  }

  return (
    <section className={styles.zone} aria-labelledby="zona-peligro">
      <h2 id="zona-peligro" className={styles.title}>
        Borrar artículo
      </h2>

      {!confirming ? (
        <>
          <p>Borrar un artículo lo elimina para siempre, junto con sus secciones.</p>
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Borrar este artículo
          </Button>
        </>
      ) : (
        <Alert tone="danger" title={`¿Borrar «${title}»?`}>
          <p>
            Se borrarán también sus {sectionCount} {sectionCount === 1 ? 'sección' : 'secciones'}. No se puede deshacer.
          </p>
          {error && <p role="alert">{error}</p>}
          <div className={styles.buttons}>
            <Button variant="secondary" autoFocus onClick={() => setConfirming(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} disabled={busy}>
              {busy ? 'Borrando…' : 'Sí, borrar'}
            </Button>
          </div>
        </Alert>
      )}
    </section>
  )
}
