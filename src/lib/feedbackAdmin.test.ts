import { describe, expect, it } from 'vitest'
import { groupFeedback, summarizeFeedback } from './feedbackAdmin'
import type { FeedbackItem } from './feedbackAdmin'

const item = (over: Partial<FeedbackItem>): FeedbackItem => ({
  id: Math.random().toString(), question: 'pregunta', articleId: 'a1', articleTitle: 'Artículo', helpful: true,
  askedBy: 'Lucía', updatedAt: '2026-09-20T10:00:00Z', ...over,
})

describe('summarizeFeedback', () => {
  it('cuenta y calcula el porcentaje', () => {
    const s = summarizeFeedback([item({}), item({}), item({ helpful: false }), item({ helpful: false })])
    expect(s).toEqual({ total: 4, helpful: 2, unhelpful: 2, helpfulPercent: 50 })
  })
  it('sin valoraciones no inventa un porcentaje', () => {
    expect(summarizeFeedback([]).helpfulPercent).toBeNull()
  })
})

describe('groupFeedback', () => {
  it('agrupa la misma pregunta (ignorando mayúsculas y espacios) sobre el mismo artículo y sentido', () => {
    const g = groupFeedback([
      item({ question: 'La batería  dura poco', askedBy: 'Lucía' }),
      item({ question: 'la batería dura poco', askedBy: 'Pedro', updatedAt: '2026-09-25T10:00:00Z' }),
      item({ question: 'la batería dura poco', askedBy: 'Lucía' }),
    ])
    expect(g).toHaveLength(1)
    expect(g[0]).toMatchObject({ count: 3, askedBy: ['Lucía', 'Pedro'], lastAt: '2026-09-25T10:00:00Z' })
  })

  it('NO mezcla valoraciones positivas con negativas, ni artículos distintos', () => {
    const g = groupFeedback([
      item({ helpful: true }), item({ helpful: false }),
      item({ articleId: 'a2', articleTitle: 'Otro' }),
    ])
    expect(g).toHaveLength(3)
  })

  it('pone primero los grupos más repetidos', () => {
    const g = groupFeedback([item({ question: 'poco' }), item({ question: 'mucho' }), item({ question: 'mucho' })])
    expect(g.map((x) => x.question)).toEqual(['mucho', 'poco'])
  })

  it('agrupa por título cuando el artículo se borró (articleId nulo)', () => {
    const g = groupFeedback([item({ articleId: null, articleTitle: 'Borrado' }), item({ articleId: null, articleTitle: 'Borrado' })])
    expect(g).toHaveLength(1)
    expect(g[0].count).toBe(2)
  })
})
