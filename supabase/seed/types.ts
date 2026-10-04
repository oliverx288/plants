export interface SeedSection {
  heading: string
  /** Texto explicativo (puede ir vacío si la sección solo tiene pasos). */
  body?: string
  /** Pasos numerados, en orden. */
  steps?: string[]
}

export interface SeedArticle {
  /** Identificador estable: de él se deriva el UUID, así el seed es idempotente. */
  slug: string
  title: string
  category: string
  /** Fecha de última revisión (AAAA-MM-DD). */
  lastReviewed: string
  sections: SeedSection[]
}
