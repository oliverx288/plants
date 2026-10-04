import { supabase } from './supabase'
import { UserFacingError } from './userFacingError'

export interface UnansweredQuestion {
  id: string
  question: string
  createdAt: string
  resolved: boolean
  askedBy: string
}

/** Varias filas con la misma pregunta (de distintos agentes o momentos), agrupadas. */
export interface QuestionGroup {
  /** Pregunta tal como se escribió la primera vez. */
  question: string
  ids: string[]
  count: number
  askedBy: string[]
  lastAskedAt: string
  resolved: boolean
}

const isString = (v: unknown): v is string => typeof v === 'string'

/** El editor lee todas las preguntas (RLS) y los nombres de los perfiles; se unen aquí. */
export async function fetchUnanswered(): Promise<UnansweredQuestion[]> {
  const [questions, profiles] = await Promise.all([
    supabase
      .from('unanswered_questions')
      .select('id, question, created_at, resolved, user_id')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('profiles').select('id, display_name'),
  ])
  if (questions.error || profiles.error) throw new Error('No se pudieron cargar las preguntas')

  const names = new Map<string, string>()
  for (const p of (profiles.data ?? []) as Record<string, unknown>[]) {
    if (isString(p.id) && isString(p.display_name)) names.set(p.id, p.display_name)
  }

  return ((questions.data ?? []) as Record<string, unknown>[]).map((r) => {
    if (!isString(r.id) || !isString(r.question) || !isString(r.created_at) || typeof r.resolved !== 'boolean') {
      throw new Error('Pregunta con formato inesperado')
    }
    return {
      id: r.id,
      question: r.question,
      createdAt: r.created_at,
      resolved: r.resolved,
      askedBy: (isString(r.user_id) && names.get(r.user_id)) || 'Alguien del equipo',
    }
  })
}

const normalize = (q: string) => q.toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Agrupa por pregunta normalizada (ignora mayúsculas y espacios), separando pendientes de resueltas.
 * Primero van las más repetidas: son los huecos de documentación más claros.
 */
export function groupQuestions(items: UnansweredQuestion[]): QuestionGroup[] {
  const groups = new Map<string, QuestionGroup>()
  for (const item of items) {
    const key = `${item.resolved ? 'r' : 'p'}:${normalize(item.question)}`
    const group = groups.get(key)
    if (!group) {
      groups.set(key, {
        question: item.question,
        ids: [item.id],
        count: 1,
        askedBy: [item.askedBy],
        lastAskedAt: item.createdAt,
        resolved: item.resolved,
      })
      continue
    }
    group.ids.push(item.id)
    group.count += 1
    if (!group.askedBy.includes(item.askedBy)) group.askedBy.push(item.askedBy)
    if (item.createdAt > group.lastAskedAt) group.lastAskedAt = item.createdAt
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || (a.lastAskedAt < b.lastAskedAt ? 1 : -1))
}

/**
 * Marca (o desmarca) como resueltas esas preguntas.
 * Un UPDATE bloqueado por RLS no da error sino 0 filas: se comprueba que se haya tocado alguna.
 */
export async function setResolved(ids: string[], resolved: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('unanswered_questions')
    .update({ resolved, resolved_at: resolved ? new Date().toISOString() : null })
    .in('id', ids)
    .select('id')
  if (error) throw new UserFacingError('No se pudo actualizar la pregunta. Inténtalo de nuevo.')
  if (!data || data.length === 0) {
    throw new UserFacingError('No se pudo actualizar la pregunta: ya no existe o no tienes permiso.')
  }
}
