import type { RetrievedChunk } from './types'

/**
 * Umbral de relevancia: por debajo, el asistente responde "No tengo información sobre esto".
 * Ambos valores se calibran con el conjunto de preguntas de prueba (supabase/tests, fase de fiabilidad):
 *  - MIN_SCORE: proporción mínima del peso de la pregunta que debe casar con el fragmento.
 *  - MIN_MATCHED_WEIGHT: evidencia absoluta mínima. Rechaza consultas de una palabra genérica
 *    ("reloj") que casan al 100 % con cualquier cosa pero no dicen nada.
 */
export const MIN_SCORE = 0.33
export const MIN_MATCHED_WEIGHT = 2.0

export function isRelevant(chunk: RetrievedChunk): boolean {
  return chunk.score >= MIN_SCORE && chunk.matchedWeight >= MIN_MATCHED_WEIGHT
}

/** Fragmentos que superan el umbral, de más a menos relevante. */
export function selectRelevant(chunks: RetrievedChunk[]): RetrievedChunk[] {
  return chunks.filter(isRelevant).sort((a, b) => b.score - a.score)
}
