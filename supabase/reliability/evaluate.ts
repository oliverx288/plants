import { DEFAULT_GATE, selectRelevant } from '../../src/assistant/relevance'
import type { Gate } from '../../src/assistant/relevance'
import type { RetrievedChunk } from '../../src/assistant/types'
import { articles } from '../seed/articles'
import { articleId } from '../seed/ids'
import type { TestQuestion } from './questions'

/** Resultado de una pregunta, de menos a más grave:
 *  - ok             : respondió el artículo correcto, o dijo "No tengo información" cuando debía.
 *  - missed         : había artículo y el asistente dijo "No tengo información" (molesta, pero es honesto).
 *  - wrong-answer   : había artículo y respondió con OTRO (error grave: el agente sigue pasos que no son).
 *  - false-positive : NO había artículo y aun así respondió (el peor: inventa una respuesta). */
export type Status = 'ok' | 'missed' | 'wrong-answer' | 'false-positive'

export interface QuestionResult {
  question: TestQuestion
  status: Status
  /** Artículo con el que responde el asistente (tras el umbral), o null si dice "No tengo información". */
  answeredWith: string | null
  /** Mejor artículo según la búsqueda, ANTES de aplicar el umbral. */
  topRaw: string | null
  topScore: number
  topWeight: number
  /** Posición (1-3) del artículo esperado entre los resultados crudos; null si no aparece o no aplica. */
  rawRank: number | null
}

export type Search = (question: string) => Promise<RetrievedChunk[]>

/** Resultados crudos de la búsqueda (antes del umbral), para poder evaluar varios umbrales sin repetirla. */
export interface RawResult {
  question: TestQuestion
  chunks: RetrievedChunk[]
}

const slugById = new Map(articles.map((a) => [articleId(a.slug), a.slug]))
const slugOf = (id: string | undefined) => (id ? (slugById.get(id) ?? id) : null)

export async function collect(search: Search, questions: TestQuestion[]): Promise<RawResult[]> {
  const raw: RawResult[] = []
  for (const question of questions) raw.push({ question, chunks: await search(question.question) })
  return raw
}

/** Puntúa un resultado crudo con un umbral dado. */
export function grade({ question, chunks }: RawResult, gate: Gate = DEFAULT_GATE): QuestionResult {
  const relevant = selectRelevant(chunks, gate)
  const answeredWith = slugOf(relevant[0]?.articleId)
  const rawRank = question.expected
    ? chunks.findIndex((c) => slugOf(c.articleId) === question.expected) + 1 || null
    : null

  let status: Status
  if (question.expected === null) status = answeredWith === null ? 'ok' : 'false-positive'
  else if (answeredWith === null) status = 'missed'
  else status = answeredWith === question.expected ? 'ok' : 'wrong-answer'

  return {
    question,
    status,
    answeredWith,
    topRaw: slugOf(chunks[0]?.articleId),
    topScore: chunks[0]?.score ?? 0,
    topWeight: chunks[0]?.matchedWeight ?? 0,
    rawRank,
  }
}

export async function evaluate(search: Search, questions: TestQuestion[], gate: Gate = DEFAULT_GATE): Promise<QuestionResult[]> {
  return (await collect(search, questions)).map((r) => grade(r, gate))
}

export interface Metrics {
  total: number
  /** Preguntas resueltas correctamente (respuesta correcta o "No tengo información" correcto). */
  correct: number
  /** % de preguntas resueltas correctamente. */
  accuracy: number
  answerable: number
  unanswerable: number
  /** De las que tienen artículo, % respondidas con el correcto. */
  recall: number
  /** De las que NO tienen artículo, % en que dijo "No tengo información". */
  noInfoAccuracy: number
  /** De las respuestas que dio, % que eran correctas. Mide cuánto se puede fiar el agente de una respuesta. */
  answerPrecision: number
  missed: number
  wrongAnswers: number
  falsePositives: number
  /** Búsqueda sola (sin umbral): % de las que tienen artículo cuyo artículo sale el primero / entre los 3 primeros. */
  hitAt1: number
  hitAt3: number
}

const pct = (n: number, d: number) => (d === 0 ? 100 : (100 * n) / d)

export function summarize(results: QuestionResult[]): Metrics {
  const answerable = results.filter((r) => r.question.expected !== null)
  const unanswerable = results.filter((r) => r.question.expected === null)
  const count = (rs: QuestionResult[], s: Status) => rs.filter((r) => r.status === s).length
  const answered = results.filter((r) => r.answeredWith !== null)
  const correctAnswers = answerable.filter((r) => r.status === 'ok')

  return {
    total: results.length,
    correct: count(results, 'ok'),
    accuracy: pct(count(results, 'ok'), results.length),
    answerable: answerable.length,
    unanswerable: unanswerable.length,
    recall: pct(correctAnswers.length, answerable.length),
    noInfoAccuracy: pct(count(unanswerable, 'ok'), unanswerable.length),
    answerPrecision: pct(correctAnswers.length, answered.length),
    missed: count(results, 'missed'),
    wrongAnswers: count(results, 'wrong-answer'),
    falsePositives: count(results, 'false-positive'),
    hitAt1: pct(answerable.filter((r) => r.rawRank === 1).length, answerable.length),
    hitAt3: pct(answerable.filter((r) => r.rawRank !== null).length, answerable.length),
  }
}

/** Intervalo de confianza del 95 % (método de Wilson) para una proporción, en %. Con pocas preguntas es ancho. */
export function wilsonInterval(successes: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 100]
  const p = successes / n
  const denom = 1 + (z * z) / n
  const centre = p + (z * z) / (2 * n)
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))
  return [Math.max(0, (100 * (centre - margin)) / denom), Math.min(100, (100 * (centre + margin)) / denom)]
}
