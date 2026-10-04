import { supabase } from './supabase'

export interface ArticleSummary {
  id: string
  title: string
  category: string
  lastReviewedAt: string
}

export interface ArticleSection {
  id: string
  position: number
  heading: string
  body: string
  steps: string[]
}

export interface Article extends ArticleSummary {
  sections: ArticleSection[]
}

const isString = (value: unknown): value is string => typeof value === 'string'

/**
 * Los datos de la red se tratan como no fiables: se valida su forma antes de usarlos.
 * Si no cuadra se lanza un error (la base de datos garantiza la forma con CHECK, así que
 * esto solo saltaría ante un fallo real, que conviene ver y no esconder).
 */
export function parseSummary(row: unknown): ArticleSummary {
  const r = (row ?? {}) as Record<string, unknown>
  if (!isString(r.id) || !isString(r.title) || !isString(r.category) || !isString(r.last_reviewed_at)) {
    throw new Error('Artículo con formato inesperado')
  }
  return { id: r.id, title: r.title, category: r.category, lastReviewedAt: r.last_reviewed_at }
}

function parseSection(row: unknown): ArticleSection {
  const r = (row ?? {}) as Record<string, unknown>
  if (
    !isString(r.id) ||
    typeof r.position !== 'number' ||
    !isString(r.heading) ||
    !isString(r.body) ||
    !Array.isArray(r.steps) ||
    !r.steps.every(isString)
  ) {
    throw new Error('Sección con formato inesperado')
  }
  return { id: r.id, position: r.position, heading: r.heading, body: r.body, steps: r.steps }
}

export function parseArticle(row: unknown): Article {
  const summary = parseSummary(row)
  const sections = (row as Record<string, unknown>).article_sections
  if (!Array.isArray(sections)) throw new Error('Artículo sin secciones')
  return { ...summary, sections: sections.map(parseSection).sort((a, b) => a.position - b.position) }
}

export async function fetchArticles(): Promise<ArticleSummary[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, category, last_reviewed_at')
    .order('title')
  if (error) throw new Error('No se pudieron cargar los artículos')
  return (data ?? []).map(parseSummary)
}

/** Devuelve null si no existe o si RLS no deja verlo (para el cliente es lo mismo). */
export async function fetchArticle(id: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, category, last_reviewed_at, article_sections(id, position, heading, body, steps)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error('No se pudo cargar el artículo')
  return data ? parseArticle(data) : null
}
