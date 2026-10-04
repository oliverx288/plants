import type { Article } from '../lib/articles'
import type { Answer, AnswerGenerator, AnswerSection, RetrievedChunk } from './types'

const toSection = (c: RetrievedChunk): AnswerSection => ({
  position: c.sectionPosition,
  heading: c.heading,
  body: c.body,
  steps: c.steps,
})

/**
 * Generador extractivo (sin LLM): construye la respuesta SOLO con texto literal de los artículos.
 *
 * - Muestra la sección más relevante.
 * - Si esa sección es una explicación sin pasos (p. ej. "Qué ocurre"), añade la siguiente sección
 *   del mismo artículo que sí tenga pasos, para que el agente reciba acciones y no solo contexto.
 * - Nunca reescribe, resume ni añade texto propio: por eso no puede inventar.
 */
export class ExtractiveAnswerGenerator implements AnswerGenerator {
  private readonly loadArticle: (id: string) => Promise<Article | null>

  constructor(loadArticle: (id: string) => Promise<Article | null>) {
    this.loadArticle = loadArticle
  }

  async generate({ chunks }: { question: string; chunks: RetrievedChunk[] }): Promise<Answer> {
    const top = chunks[0]
    if (!top) return { kind: 'no-info' }

    const sections: AnswerSection[] = [toSection(top)]

    if (top.steps.length === 0) {
      // Si no se puede cargar el artículo, se responde igualmente con la sección encontrada.
      const article = await this.loadArticle(top.articleId).catch(() => null)
      const next = article?.sections.find((s) => s.position > top.sectionPosition && s.steps.length > 0)
      if (next) {
        sections.push({ position: next.position, heading: next.heading, body: next.body, steps: next.steps })
      }
    }

    return {
      kind: 'answer',
      source: { articleId: top.articleId, articleTitle: top.articleTitle, category: top.category },
      sections,
    }
  }
}
