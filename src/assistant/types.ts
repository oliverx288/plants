/** Fragmento (sección de un artículo) devuelto por la búsqueda, con su relevancia. */
export interface RetrievedChunk {
  articleId: string
  articleTitle: string
  category: string
  sectionId: string
  sectionPosition: number
  heading: string
  body: string
  steps: string[]
  /** 0 a 1: peso de los términos de la pregunta que casan / peso de todos los términos. */
  score: number
  /** Peso absoluto de lo que casó: evita dar por buena una consulta con muy poca información. */
  matchedWeight: number
  /** Nº de términos significativos de la pregunta que coinciden en el fragmento (0 si la base de datos no lo devuelve). */
  matchedTerms: number
  /** Nº de términos significativos que tiene la pregunta (0 si la base de datos no lo devuelve). */
  queryTerms: number
}

/** Texto literal de una sección del artículo. */
export interface AnswerSection {
  position: number
  heading: string
  body: string
  steps: string[]
}

/** De dónde sale la respuesta. Toda respuesta lleva fuente. */
export interface AnswerSource {
  articleId: string
  articleTitle: string
  category: string
}

export type Answer =
  | {
      kind: 'answer'
      source: AnswerSource
      sections: AnswerSection[]
      /** Coincidencia débil: la interfaz avisa con más énfasis. Nunca significa lo contrario ("alta confianza"). */
      weakMatch: boolean
    }
  | { kind: 'no-info' }

/**
 * Punto de extensión para conectar un LLM más adelante.
 *
 * Contrato: el generador SOLO puede usar los `chunks` que recibe (que ya han pasado el filtro de
 * relevancia) y debe devolver una respuesta con fuente. Hoy lo implementa ExtractiveAnswerGenerator
 * (copia texto literal, sin inventar nada). Un generador con LLM debería tratar el contenido de los
 * artículos como DATOS y nunca como instrucciones: ver docs/PROMPT-INJECTION.md (se escribe en la
 * fase de seguridad).
 */
export interface AnswerGenerator {
  generate(input: { question: string; chunks: RetrievedChunk[] }): Promise<Answer>
}
