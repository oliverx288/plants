import { supabase } from '../lib/supabase'
import { UserFacingError } from '../lib/userFacingError'

/** Mensaje para el usuario según el código de error de Postgres (nunca se muestra el texto crudo). */
export function feedbackErrorMessage(error: { code?: string }): string {
  switch (error.code) {
    case 'P0002':
      return 'El artículo ya no existe, así que no se puede valorar.'
    case '42501':
      return 'No tienes permiso para valorar respuestas.'
    default:
      return 'No se pudo guardar tu valoración. Inténtalo de nuevo.'
  }
}

/**
 * Guarda (o actualiza, si cambia de opinión) la valoración de una respuesta.
 * El servidor fija el usuario y el título del artículo: aquí solo se envía qué se preguntó, a qué artículo
 * y si sirvió.
 */
export async function submitFeedback(input: { question: string; articleId: string; helpful: boolean }): Promise<void> {
  const { error } = await supabase.rpc('submit_answer_feedback', {
    p_question: input.question,
    p_article_id: input.articleId,
    p_helpful: input.helpful,
  })
  if (error) throw new UserFacingError(feedbackErrorMessage(error))
}
