import { fetchArticle } from '../lib/articles'
import { ExtractiveAnswerGenerator } from './generator'
import { selectRelevant } from './relevance'
import { retrieveChunks } from './retrieval'
import { logUnansweredQuestion } from './unanswered'
import type { Answer, AnswerGenerator, RetrievedChunk } from './types'

export type AskResult =
  | { status: 'answer'; answer: Extract<Answer, { kind: 'answer' }> }
  /** `logged`: si la pregunta quedó guardada como "sin respuesta" para el editor. */
  | { status: 'no-info'; logged: boolean }

export interface AssistantDeps {
  retrieve: (question: string) => Promise<RetrievedChunk[]>
  generator: AnswerGenerator
  logUnanswered: (question: string) => Promise<boolean>
}

const defaultDeps: AssistantDeps = {
  retrieve: retrieveChunks,
  generator: new ExtractiveAnswerGenerator(fetchArticle),
  logUnanswered: logUnansweredQuestion,
}

/**
 * Flujo completo del asistente:  recuperar → filtrar por relevancia → generar.
 *
 * Si ningún fragmento supera el umbral NO se llama al generador: se responde "No tengo información"
 * y se guarda la pregunta. Así, aunque algún día el generador sea un LLM, nunca se le pide que
 * conteste sin material relevante.
 *
 * Los errores de recuperación se propagan (la interfaz los muestra) y en ese caso la pregunta no
 * se guarda como "sin respuesta", porque no se sabe si la había.
 */
export async function ask(question: string, deps: AssistantDeps = defaultDeps): Promise<AskResult> {
  const relevant = selectRelevant(await deps.retrieve(question))

  if (relevant.length > 0) {
    const answer = await deps.generator.generate({ question, chunks: relevant })
    if (answer.kind === 'answer') return { status: 'answer', answer }
  }

  const logged = await deps.logUnanswered(question).catch(() => false)
  return { status: 'no-info', logged }
}
