import type { RetrievedChunk } from './types'

const isString = (v: unknown): v is string => typeof v === 'string'
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Valida la forma de cada fila: lo que llega de la red no se da por bueno. */
export function parseChunk(row: unknown): RetrievedChunk {
  const r = (row ?? {}) as Record<string, unknown>
  if (
    !isString(r.article_id) || !isString(r.article_title) || !isString(r.category) ||
    !isString(r.section_id) || !isNumber(r.section_position) || !isString(r.heading) ||
    !isString(r.body) || !Array.isArray(r.steps) || !r.steps.every(isString) ||
    !isNumber(r.score) || !isNumber(r.matched_weight)
  ) {
    throw new Error('Resultado de búsqueda con formato inesperado')
  }
  return {
    articleId: r.article_id,
    articleTitle: r.article_title,
    category: r.category,
    sectionId: r.section_id,
    sectionPosition: r.section_position,
    heading: r.heading,
    body: r.body,
    steps: r.steps,
    score: r.score,
    matchedWeight: r.matched_weight,
  }
}
