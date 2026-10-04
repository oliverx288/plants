import { supabase } from './supabase'

export interface FeedbackItem {
  id: string
  question: string
  articleId: string | null
  articleTitle: string
  helpful: boolean
  askedBy: string
  updatedAt: string
}

/** Valoraciones de la misma pregunta sobre el mismo artículo, agrupadas. */
export interface FeedbackGroup {
  question: string
  articleId: string | null
  articleTitle: string
  helpful: boolean
  count: number
  askedBy: string[]
  lastAt: string
}

export interface FeedbackSummary {
  total: number
  helpful: number
  unhelpful: number
  /** % de valoraciones positivas; null si aún no hay ninguna. */
  helpfulPercent: number | null
}

const isString = (v: unknown): v is string => typeof v === 'string'

/** El editor lee todas las valoraciones (RLS) y los nombres de los perfiles; se unen aquí. */
export async function fetchFeedback(): Promise<FeedbackItem[]> {
  const [feedback, profiles] = await Promise.all([
    supabase
      .from('answer_feedback')
      .select('id, question, article_id, article_title, helpful, user_id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1000),
    supabase.from('profiles').select('id, display_name'),
  ])
  if (feedback.error || profiles.error) throw new Error('No se pudieron cargar las valoraciones')

  const names = new Map<string, string>()
  for (const p of (profiles.data ?? []) as Record<string, unknown>[]) {
    if (isString(p.id) && isString(p.display_name)) names.set(p.id, p.display_name)
  }

  return ((feedback.data ?? []) as Record<string, unknown>[]).map((r) => {
    if (
      !isString(r.id) || !isString(r.question) || !isString(r.article_title) ||
      typeof r.helpful !== 'boolean' || !isString(r.updated_at) ||
      !(r.article_id === null || isString(r.article_id))
    ) {
      throw new Error('Valoración con formato inesperado')
    }
    return {
      id: r.id,
      question: r.question,
      articleId: r.article_id,
      articleTitle: r.article_title,
      helpful: r.helpful,
      askedBy: (isString(r.user_id) && names.get(r.user_id)) || 'Alguien del equipo',
      updatedAt: r.updated_at,
    }
  })
}

const normalize = (q: string) => q.toLowerCase().replace(/\s+/g, ' ').trim()

export function summarizeFeedback(items: FeedbackItem[]): FeedbackSummary {
  const helpful = items.filter((i) => i.helpful).length
  return {
    total: items.length,
    helpful,
    unhelpful: items.length - helpful,
    helpfulPercent: items.length === 0 ? null : Math.round((100 * helpful) / items.length),
  }
}

/** Agrupa por pregunta normalizada, artículo y sentido de la valoración. Primero los grupos más repetidos. */
export function groupFeedback(items: FeedbackItem[]): FeedbackGroup[] {
  const groups = new Map<string, FeedbackGroup>()
  for (const item of items) {
    const key = `${item.helpful ? 'y' : 'n'}|${item.articleId ?? item.articleTitle}|${normalize(item.question)}`
    const group = groups.get(key)
    if (!group) {
      groups.set(key, {
        question: item.question,
        articleId: item.articleId,
        articleTitle: item.articleTitle,
        helpful: item.helpful,
        count: 1,
        askedBy: [item.askedBy],
        lastAt: item.updatedAt,
      })
      continue
    }
    group.count += 1
    if (!group.askedBy.includes(item.askedBy)) group.askedBy.push(item.askedBy)
    if (item.updatedAt > group.lastAt) group.lastAt = item.updatedAt
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || (a.lastAt < b.lastAt ? 1 : -1))
}
