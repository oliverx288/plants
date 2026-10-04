import type { RetrievedChunk } from './types'

/**
 * Umbral de relevancia: por debajo, el asistente responde "No tengo información sobre esto".
 *
 * Calibrado en la fase de fiabilidad (ver VALIDACION.md) con el conjunto de DESARROLLO de
 * supabase/reliability/questions.ts; el conjunto de test retenido solo se usó para medir.
 *
 *  - MIN_MATCHED_WEIGHT (la señal que separa): evidencia absoluta de lo que casó, ponderada por la
 *    rareza de cada término y por dónde casa (título > encabezado > cuerpo). Un valor de 3,5 equivale
 *    a un término muy específico (presente en ≤ 2 secciones) casado en el título, o a dos términos
 *    medianamente específicos. En desarrollo, las preguntas sin artículo no pasaron de 3,0 y las
 *    correctas estaban en 3,8 o más. Además rechaza consultas de una palabra genérica ("reloj"), que
 *    casan con todo pero no dicen nada.
 *  - MIN_SCORE (filtro de sentido común): proporción del peso de la pregunta que casa con el fragmento.
 *    Se solapa entre respuestas buenas y malas, así que NO se usa para separar; solo descarta casos en
 *    que casa una parte mínima de una pregunta larga.
 *
 * Si cambia el contenido de la base de conocimiento de forma importante, hay que volver a medir.
 */
export const MIN_SCORE = 0.2
export const MIN_MATCHED_WEIGHT = 3.5

/**
 * Por debajo de esta puntuación, la respuesta se marca como "coincidencia débil" y la interfaz avisa con más
 * énfasis de que se compruebe que el artículo corresponde a la duda.
 *
 * Medido en las pruebas de fiabilidad (VALIDACION.md §2.7; en muestra, informativo): de las respuestas que el
 * asistente da, las de puntuación 0,20–0,39 son correctas el 46 % de las veces (12 de 26; solo 30–45 % en los
 * conjuntos difíciles) y las de ≥ 0,40 el 82 % (23 de 28).
 *
 * IMPORTANTE: esto solo sirve para ADVERTIR más en la banda baja. NUNCA debe usarse para mostrar "alta
 * confianza": la banda alta también falla (5 de 28, incluida una respuesta equivocada con puntuación 0,60).
 */
export const WEAK_MATCH_SCORE = 0.4

export function isWeakMatch(chunk: RetrievedChunk): boolean {
  return chunk.score < WEAK_MATCH_SCORE
}

export interface Gate {
  minScore: number
  minMatchedWeight: number
}

export const DEFAULT_GATE: Gate = { minScore: MIN_SCORE, minMatchedWeight: MIN_MATCHED_WEIGHT }

export function isRelevant(chunk: RetrievedChunk, gate: Gate = DEFAULT_GATE): boolean {
  return chunk.score >= gate.minScore && chunk.matchedWeight >= gate.minMatchedWeight
}

/** Fragmentos que superan el umbral, de más a menos relevante. */
export function selectRelevant(chunks: RetrievedChunk[], gate: Gate = DEFAULT_GATE): RetrievedChunk[] {
  return chunks.filter((c) => isRelevant(c, gate)).sort((a, b) => b.score - a.score)
}
