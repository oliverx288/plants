import { describe, expect, it } from 'vitest'
import type { RetrievedChunk } from '../../src/assistant/types'
import { articles } from '../seed/articles'
import { articleId } from '../seed/ids'
import { evaluate, grade, summarize, wilsonInterval } from './evaluate'
import type { Search } from './evaluate'
import type { TestQuestion } from './questions'
import { QUESTIONS } from './questions'

/* Pruebas del propio arnés de evaluación: si midiera mal, los porcentajes del informe no valdrían nada. */

const ID_GPS = articleId('ubicacion-no-se-actualiza')
const ID_SOS = articleId('sos-no-llama')
const chunk = (articleIdValue: string, score = 0.8, matchedWeight = 6): RetrievedChunk => ({
  articleId: articleIdValue, articleTitle: 't', category: 'c', sectionId: 's', sectionPosition: 0,
  heading: 'h', body: '', steps: ['p'], score, matchedWeight,
})
const q = (expected: string | null): TestQuestion => ({ question: 'x', expected, set: 'dev' })

describe('grade', () => {
  it('con artículo: ok si responde el correcto', () => {
    expect(grade({ question: q('ubicacion-no-se-actualiza'), chunks: [chunk(ID_GPS)] }).status).toBe('ok')
  })
  it('con artículo: wrong-answer si responde otro', () => {
    expect(grade({ question: q('ubicacion-no-se-actualiza'), chunks: [chunk(ID_SOS)] }).status).toBe('wrong-answer')
  })
  it('con artículo: missed si no supera el umbral (aunque sea el correcto)', () => {
    const r = grade({ question: q('ubicacion-no-se-actualiza'), chunks: [chunk(ID_GPS, 0.1, 1)] })
    expect(r.status).toBe('missed')
    expect(r.rawRank).toBe(1) // la búsqueda lo encontró; fue el umbral
  })
  it('sin artículo: ok si dice "No tengo información"; false-positive si responde', () => {
    expect(grade({ question: q(null), chunks: [] }).status).toBe('ok')
    expect(grade({ question: q(null), chunks: [chunk(ID_GPS, 0.1, 1)] }).status).toBe('ok')
    expect(grade({ question: q(null), chunks: [chunk(ID_GPS)] }).status).toBe('false-positive')
  })
  it('rawRank es la posición del esperado en los resultados crudos', () => {
    const r = grade({ question: q('sos-no-llama'), chunks: [chunk(ID_GPS), chunk(ID_SOS)] })
    expect(r.rawRank).toBe(2)
  })
  it('respeta un umbral distinto', () => {
    const raw = { question: q(null), chunks: [chunk(ID_GPS, 0.5, 3)] }
    expect(grade(raw, { minScore: 0.2, minMatchedWeight: 3.5 }).status).toBe('ok')
    expect(grade(raw, { minScore: 0.2, minMatchedWeight: 2.5 }).status).toBe('false-positive')
  })
})

describe('summarize', () => {
  it('calcula cada métrica con casos construidos a mano', async () => {
    const search: Search = async (text) => {
      if (text === 'ok') return [chunk(ID_GPS)]
      if (text === 'otro') return [chunk(ID_SOS)]
      if (text === 'inventa') return [chunk(ID_GPS)]
      return []
    }
    const qs: TestQuestion[] = [
      { question: 'ok', expected: 'ubicacion-no-se-actualiza', set: 'dev' },    // ok
      { question: 'otro', expected: 'ubicacion-no-se-actualiza', set: 'dev' },  // wrong
      { question: 'nada', expected: 'ubicacion-no-se-actualiza', set: 'dev' },  // missed
      { question: 'inventa', expected: null, set: 'dev' },                       // false positive
      { question: 'vacio', expected: null, set: 'dev' },                         // ok
    ]
    const m = summarize(await evaluate(search, qs))
    expect(m).toMatchObject({
      total: 5, correct: 2, answerable: 3, unanswerable: 2,
      missed: 1, wrongAnswers: 1, falsePositives: 1,
    })
    expect(m.accuracy).toBeCloseTo(40)
    expect(m.recall).toBeCloseTo(100 / 3)
    expect(m.noInfoAccuracy).toBeCloseTo(50)
    expect(m.answerPrecision).toBeCloseTo(100 / 3) // respondió 3 veces (ok, otro, inventa) y solo 1 era correcta
  })
})

describe('wilsonInterval', () => {
  it('es más ancho con pocas muestras y contiene la proporción observada', () => {
    const [lo, hi] = wilsonInterval(35, 41)
    expect(lo).toBeLessThan((100 * 35) / 41)
    expect(hi).toBeGreaterThan((100 * 35) / 41)
    const [lo2, hi2] = wilsonInterval(350, 410)
    expect(hi2 - lo2).toBeLessThan(hi - lo)
  })
  it('casos límite', () => {
    expect(wilsonInterval(0, 0)).toEqual([0, 100])
    const [lo, hi] = wilsonInterval(10, 10)
    expect(hi).toBeCloseTo(100)
    expect(lo).toBeGreaterThan(65)
  })
})

describe('el conjunto de preguntas', () => {
  const slugs = new Set(articles.map((a) => a.slug))

  it('tiene al menos 20 preguntas, varias sin respuesta, en dos conjuntos', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(20)
    expect(QUESTIONS.filter((x) => x.expected === null).length).toBeGreaterThanOrEqual(5)
    expect(QUESTIONS.filter((x) => x.set === 'dev').length).toBeGreaterThanOrEqual(10)
    expect(QUESTIONS.filter((x) => x.set === 'test').length).toBeGreaterThanOrEqual(10)
  })

  it('cada conjunto mezcla preguntas con y sin respuesta', () => {
    for (const set of ['dev', 'test'] as const) {
      const qs = QUESTIONS.filter((x) => x.set === set)
      expect(qs.some((x) => x.expected === null), set).toBe(true)
      expect(qs.some((x) => x.expected !== null), set).toBe(true)
    }
  })

  it('cada artículo esperado existe en el seed y no hay preguntas repetidas', () => {
    for (const x of QUESTIONS) if (x.expected) expect(slugs.has(x.expected), x.expected).toBe(true)
    expect(new Set(QUESTIONS.map((x) => x.question.toLowerCase())).size).toBe(QUESTIONS.length)
  })
})
