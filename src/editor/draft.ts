import type { Article } from '../lib/articles'

/*
 * Borrador de artículo en el formulario del editor y su validación.
 * Los límites son los mismos que los CHECK de la base de datos (que son la barrera real):
 * aquí solo sirven para dar mensajes claros antes de enviar.
 */

export const LIMITS = {
  title: { min: 5, max: 120 },
  category: { min: 2, max: 60 },
  heading: { min: 1, max: 120 },
  body: { max: 2000 },
  step: { max: 300 },
  steps: { max: 20 },
  sections: { min: 1, max: 15 },
} as const

export interface SectionDraft {
  /** Clave solo para React (no se guarda). */
  key: string
  heading: string
  body: string
  /** Un paso por línea. */
  stepsText: string
}

export interface ArticleDraft {
  title: string
  category: string
  /** AAAA-MM-DD */
  lastReviewedAt: string
  sections: SectionDraft[]
}

let counter = 0
export const newSectionKey = () => `seccion-${++counter}`

export const emptySection = (): SectionDraft => ({ key: newSectionKey(), heading: '', body: '', stepsText: '' })

/** Fecha de hoy en la zona horaria local, como AAAA-MM-DD (el formato del campo type="date"). */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function emptyDraft(today = todayIso(), title = ''): ArticleDraft {
  return { title, category: '', lastReviewedAt: today, sections: [emptySection()] }
}

export function parseSteps(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function toDraft(article: Article): ArticleDraft {
  return {
    title: article.title,
    category: article.category,
    lastReviewedAt: article.lastReviewedAt,
    sections: article.sections.map((s) => ({
      key: newSectionKey(),
      heading: s.heading,
      body: s.body,
      stepsText: s.steps.join('\n'),
    })),
  }
}

/** Forma que espera la función save_article (el texto va tal cual; el servidor recorta espacios). */
export function toPayload(draft: ArticleDraft) {
  return {
    title: draft.title.trim(),
    category: draft.category.trim(),
    lastReviewedAt: draft.lastReviewedAt,
    sections: draft.sections.map((s) => ({
      heading: s.heading.trim(),
      body: s.body.trim(),
      steps: parseSteps(s.stepsText),
    })),
  }
}

export interface SectionErrors {
  heading?: string
  body?: string
  steps?: string
  /** Error de la sección en conjunto (p. ej. "sin texto ni pasos"). */
  general?: string
}

export interface DraftErrors {
  title?: string
  category?: string
  lastReviewedAt?: string
  sections?: string
  bySection: Record<string, SectionErrors>
}

const isValidIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

export function validateDraft(draft: ArticleDraft, today = todayIso()): DraftErrors {
  const errors: DraftErrors = { bySection: {} }

  const title = draft.title.trim()
  if (title.length < LIMITS.title.min || title.length > LIMITS.title.max) {
    errors.title = `El título debe tener entre ${LIMITS.title.min} y ${LIMITS.title.max} caracteres.`
  }

  const category = draft.category.trim()
  if (category.length < LIMITS.category.min || category.length > LIMITS.category.max) {
    errors.category = `La categoría debe tener entre ${LIMITS.category.min} y ${LIMITS.category.max} caracteres.`
  }

  if (!isValidIsoDate(draft.lastReviewedAt)) {
    errors.lastReviewedAt = 'Indica una fecha válida.'
  } else if (draft.lastReviewedAt > today) {
    errors.lastReviewedAt = 'La fecha de revisión no puede estar en el futuro.'
  }

  if (draft.sections.length < LIMITS.sections.min || draft.sections.length > LIMITS.sections.max) {
    errors.sections = `Un artículo debe tener entre ${LIMITS.sections.min} y ${LIMITS.sections.max} secciones.`
  }

  for (const section of draft.sections) {
    const e: SectionErrors = {}
    const heading = section.heading.trim()
    const body = section.body.trim()
    const steps = parseSteps(section.stepsText)

    if (heading.length < LIMITS.heading.min || heading.length > LIMITS.heading.max) {
      e.heading = `El encabezado debe tener entre ${LIMITS.heading.min} y ${LIMITS.heading.max} caracteres.`
    }
    if (body.length > LIMITS.body.max) {
      e.body = `El texto no puede superar los ${LIMITS.body.max} caracteres.`
    }
    if (steps.length > LIMITS.steps.max) {
      e.steps = `Una sección admite como máximo ${LIMITS.steps.max} pasos.`
    } else if (steps.some((s) => s.length > LIMITS.step.max)) {
      e.steps = `Cada paso puede tener como máximo ${LIMITS.step.max} caracteres.`
    }
    if (!body && steps.length === 0) {
      e.general = 'Escribe un texto o al menos un paso.'
    }
    if (Object.keys(e).length > 0) errors.bySection[section.key] = e
  }

  return errors
}

export function hasErrors(errors: DraftErrors): boolean {
  return Boolean(
    errors.title || errors.category || errors.lastReviewedAt || errors.sections || Object.keys(errors.bySection).length > 0,
  )
}
