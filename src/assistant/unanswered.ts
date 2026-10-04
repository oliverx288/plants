import { supabase } from '../lib/supabase'

/**
 * Guarda la pregunta como "sin respuesta" para que el editor vea qué artículos faltan.
 * Devuelve false si no se pudo guardar; que falle no debe impedir mostrar la respuesta al agente.
 */
export async function logUnansweredQuestion(question: string): Promise<boolean> {
  const { error } = await supabase.rpc('log_unanswered_question', { question_text: question })
  return !error
}
