import { toPayload } from '../editor/draft'
import type { ArticleDraft } from '../editor/draft'
import { supabase } from './supabase'
import { UserFacingError } from './userFacingError'

/** Mensaje para el usuario según el código de error de Postgres (nunca se muestra el texto crudo). */
export function saveErrorMessage(error: { code?: string }): string {
  switch (error.code) {
    case '42501':
      return 'No tienes permiso para guardar artículos.'
    case '23514':
    case '22023':
      return 'Algún dato no cumple los límites permitidos. Revisa el formulario.'
    case 'P0002':
      return 'El artículo ya no existe (puede que lo haya borrado otra persona).'
    default:
      return 'No se pudo guardar el artículo. Inténtalo de nuevo.'
  }
}

/**
 * Crea (id = null) o edita un artículo con todas sus secciones en una sola transacción.
 * La función de base de datos es la que decide: si el usuario no es editor, falla aunque se llame a mano.
 */
export async function saveArticle(id: string | null, draft: ArticleDraft): Promise<string> {
  const payload = toPayload(draft)
  const { data, error } = await supabase.rpc('save_article', {
    p_id: id,
    p_title: payload.title,
    p_category: payload.category,
    p_last_reviewed_at: payload.lastReviewedAt,
    p_sections: payload.sections,
  })
  if (error) throw new UserFacingError(saveErrorMessage(error))
  if (typeof data !== 'string') throw new Error('Respuesta inesperada al guardar el artículo')
  return data
}

/**
 * Borra un artículo (sus secciones se borran en cascada).
 * Un DELETE bloqueado por RLS NO da error: afecta a 0 filas. Por eso se pide devolver las filas
 * borradas y se comprueba que haya alguna; si no, no se puede decir que se borró.
 */
export async function deleteArticle(id: string): Promise<void> {
  const { data, error } = await supabase.from('articles').delete().eq('id', id).select('id')
  if (error) throw new UserFacingError('No se pudo borrar el artículo. Inténtalo de nuevo.')
  if (!data || data.length === 0) {
    throw new UserFacingError('No se pudo borrar el artículo: ya no existe o no tienes permiso.')
  }
}
