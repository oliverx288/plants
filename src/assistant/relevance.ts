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
  /** Activa la vía de "coincidencia completa" para consultas cortas y precisas (ver isCompleteMatch). */
  completeMatch: boolean
}

export const DEFAULT_GATE: Gate = { minScore: MIN_SCORE, minMatchedWeight: MIN_MATCHED_WEIGHT, completeMatch: true }

/**
 * "Coincidencia completa": segunda vía para consultas CORTAS y PRECISAS como "el reloj no carga" o "no enciende".
 *
 * Una consulta así coincide al 100 % con el título de un artículo, pero tiene pocas palabras y por eso suma poca
 * evidencia absoluta: el umbral general (MIN_MATCHED_WEIGHT) la rechazaba.
 *
 * Para no reabrir las respuestas inventadas, se exige TODO esto a la vez:
 *  - todos los términos significativos de la pregunta coinciden (y no es una consulta vacía);
 *  - puntuación ≥ 0,9, es decir, coinciden en el título;
 *  - una evidencia mínima, solo para descartar combinaciones triviales;
 *  - SIN EMPATE: el siguiente artículo queda por debajo con un margen mínimo. Si dos artículos coinciden igual de
 *    bien no hay forma de saber cuál es y no se responde (se ofrecen como sugerencias: ver selectSuggestions).
 *
 * Con UN solo término significativo ("no enciende"; "no" es palabra vacía) hay mucha menos información, así que el
 * margen exigido es mayor: el término tiene que estar en el título de un único artículo y, como mucho, en el
 * cuerpo de los demás (puntuación 0,6). Una palabra genérica ("reloj") aparece en muchos títulos y no pasa.
 */
export const COMPLETE_MATCH = {
  minScore: 0.9,
  multi: { minTerms: 2, minWeight: 2.0, minMargin: 0.1 },
  single: { minWeight: 1.5, minMargin: 0.3 },
} as const

function isCompleteCandidate(chunk: RetrievedChunk): boolean {
  const tier = chunk.queryTerms === 1 ? COMPLETE_MATCH.single : COMPLETE_MATCH.multi
  return (
    chunk.queryTerms >= 1 &&
    chunk.matchedTerms === chunk.queryTerms &&
    chunk.score >= COMPLETE_MATCH.minScore &&
    chunk.matchedWeight >= tier.minWeight
  )
}

export function isCompleteMatch(chunk: RetrievedChunk, next?: RetrievedChunk): boolean {
  if (!isCompleteCandidate(chunk)) return false
  const { minMargin } = chunk.queryTerms === 1 ? COMPLETE_MATCH.single : COMPLETE_MATCH.multi
  // 1e-9: tolerancia de coma flotante (1 - 0,9 da 0,0999…), para que un margen exacto de 0,1 cuente.
  return next === undefined || chunk.score - next.score >= minMargin - 1e-9
}

/**
 * Empate entre artículos: varios coinciden por completo y ninguno gana con claridad ("batería" → "La batería dura
 * poco" y "Se apaga solo con batería disponible"). No se responde con ninguno, pero tampoco se dice "no sé": se
 * ofrecen como SUGERENCIAS (solo título y enlace, sin pasos) para que el agente elija. Hacen falta al menos 2.
 */
export const MAX_SUGGESTIONS = 3

export function selectSuggestions(chunks: RetrievedChunk[]): RetrievedChunk[] {
  const tied = chunks.filter((c) => isCompleteCandidate(c) && chunks[0].score - c.score < COMPLETE_MATCH.multi.minMargin - 1e-9)
  return tied.length >= 2 ? tied.slice(0, MAX_SUGGESTIONS) : []
}

/** Vía general: puntuación y evidencia suficientes. */
export function passesGeneralGate(chunk: RetrievedChunk, gate: Gate = DEFAULT_GATE): boolean {
  return chunk.score >= gate.minScore && chunk.matchedWeight >= gate.minMatchedWeight
}

/**
 * ¿Es relevante este fragmento SI ES EL PRIMER RESULTADO? (`next` es el segundo). Para varios resultados, usa
 * selectRelevant: la vía de coincidencia completa solo puede aplicarse al primero.
 */
export function isRelevant(chunk: RetrievedChunk, gate: Gate = DEFAULT_GATE, next?: RetrievedChunk): boolean {
  return passesGeneralGate(chunk, gate) || (gate.completeMatch && isCompleteMatch(chunk, next))
}

/**
 * Fragmentos que superan el umbral, de más a menos relevante. `chunks` debe venir ordenado de más a menos
 * relevante (como lo devuelve la base de datos).
 *
 * La coincidencia completa se aplica SOLO al primer resultado y comparándolo con el segundo: en un empate, el
 * segundo también "coincidiría al 100 %" y, sin esta restricción, se colaría como si no tuviera rival.
 */
export function selectRelevant(chunks: RetrievedChunk[], gate: Gate = DEFAULT_GATE): RetrievedChunk[] {
  return chunks
    .filter((c, i) => passesGeneralGate(c, gate) || (gate.completeMatch && i === 0 && isCompleteMatch(c, chunks[1])))
    .sort((a, b) => b.score - a.score)
}
