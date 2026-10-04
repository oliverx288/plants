import { describe, expect, it, vi } from 'vitest'
import type { Article } from '../lib/articles'
import { ask } from './ask'
import type { AssistantDeps } from './ask'
import { ExtractiveAnswerGenerator } from './generator'
import { normalizeQuestion } from './question'
import {
  COMPLETE_MATCH, DEFAULT_GATE, MAX_SUGGESTIONS, MIN_MATCHED_WEIGHT, MIN_SCORE, WEAK_MATCH_SCORE, isCompleteMatch, isRelevant, isWeakMatch,
  selectRelevant, selectSuggestions,
} from './relevance'
import { parseChunk } from './chunk'
import type { AnswerGenerator, RetrievedChunk } from './types'

const chunk = (over: Partial<RetrievedChunk> = {}): RetrievedChunk => ({
  articleId: 'a1',
  articleTitle: 'La ubicación no se actualiza',
  category: 'GPS y ubicación',
  sectionId: 's1',
  sectionPosition: 1,
  heading: 'Qué comprobar primero',
  body: '',
  steps: ['Activa el GPS', 'Revisa la suscripción'],
  score: 0.8,
  matchedWeight: 5,
  matchedTerms: 3,
  queryTerms: 4, // por defecto NO es una coincidencia completa (3 de 4 términos)
  ...over,
})

describe('umbral de relevancia', () => {
  it('acepta lo que supera ambos umbrales (incluidos los valores límite)', () => {
    expect(isRelevant(chunk({ score: MIN_SCORE, matchedWeight: MIN_MATCHED_WEIGHT }))).toBe(true)
    expect(isRelevant(chunk({ score: 1, matchedWeight: 9 }))).toBe(true)
  })

  it('rechaza una puntuación baja', () => {
    expect(isRelevant(chunk({ score: MIN_SCORE - 0.01 }))).toBe(false)
  })

  it('rechaza poca evidencia aunque la puntuación sea perfecta (una palabra genérica)', () => {
    expect(isRelevant(chunk({ score: 1, matchedWeight: MIN_MATCHED_WEIGHT - 0.1 }))).toBe(false)
  })

  it('selectRelevant filtra y ordena de más a menos relevante', () => {
    const picked = selectRelevant([
      chunk({ articleId: 'bajo', score: 0.1 }),
      chunk({ articleId: 'medio', score: 0.5 }),
      chunk({ articleId: 'alto', score: 0.9 }),
    ])
    expect(picked.map((c) => c.articleId)).toEqual(['alto', 'medio'])
  })
})

describe('coincidencia completa (consultas cortas y precisas)', () => {
  // "el reloj no carga": las 2 palabras significativas coinciden en el título, pero la evidencia es baja (2,9)
  const complete = (over: Partial<RetrievedChunk> = {}) =>
    chunk({ score: 1, matchedWeight: 2.9, matchedTerms: 2, queryTerms: 2, ...over })
  // El siguiente resultado, claramente peor (no pasa ni la vía general): hay margen de sobra.
  const nextOk = chunk({ articleId: 'otro', score: 0.5, matchedWeight: 1 })

  it('se acepta aunque la evidencia sea menor que el umbral general', () => {
    expect(complete().matchedWeight).toBeLessThan(MIN_MATCHED_WEIGHT)
    expect(isCompleteMatch(complete(), nextOk)).toBe(true)
    expect(isRelevant(complete(), DEFAULT_GATE, nextOk)).toBe(true)
    expect(selectRelevant([complete(), nextOk])).toHaveLength(1)
  })

  describe('un solo término significativo ("no enciende": "no" es palabra vacía)', () => {
    // El término está en el título de este artículo y solo en el cuerpo de los demás (0,6): margen 0,4.
    const single = (over: Partial<RetrievedChunk> = {}) =>
      chunk({ score: 1, matchedWeight: 2.8, matchedTerms: 1, queryTerms: 1, ...over })
    const rival = (score: number) => chunk({ articleId: 'otro', score, matchedWeight: 1.5, matchedTerms: 1, queryTerms: 1 })

    it('se acepta si gana con claridad (margen ≥ 0,3)', () => {
      expect(isCompleteMatch(single(), rival(0.6))).toBe(true)
      expect(isCompleteMatch(single(), rival(0.7))).toBe(true) // margen exacto 0,3
      expect(selectRelevant([single(), rival(0.6)])).toHaveLength(1)
    })

    it('NO se acepta con margen menor: exige más margen que con varios términos', () => {
      expect(isCompleteMatch(single(), rival(0.71))).toBe(false)
      expect(isCompleteMatch(single(), rival(0.9))).toBe(false) // con 2 términos 0,9 tampoco, pero 0,8 sí
      expect(isCompleteMatch(complete(), rival(0.8))).toBe(true)
      expect(isCompleteMatch(single(), rival(0.8))).toBe(false)
    })

    it('NO se acepta una palabra genérica (poca evidencia: "reloj", aparece en muchos artículos)', () => {
      expect(isCompleteMatch(single({ matchedWeight: 1.4 }), rival(0.5))).toBe(false)
      expect(isCompleteMatch(single({ matchedWeight: 1.5 }), rival(0.5))).toBe(true)
    })

    it('NO se acepta si no coincide en el título', () => {
      expect(isCompleteMatch(single({ score: 0.6 }), rival(0.1))).toBe(false)
    })
  })

  it('NO se acepta si falta alguna palabra de la pregunta por coincidir', () => {
    expect(isCompleteMatch(complete({ matchedTerms: 2, queryTerms: 3 }), nextOk)).toBe(false)
  })

  // Los límites se fijan con VALORES LITERALES (no con la constante): así cambiar la política obliga a cambiar el test.
  it('la política tiene los valores acordados', () => {
    expect(COMPLETE_MATCH).toEqual({
      minScore: 0.9,
      multi: { minTerms: 2, minWeight: 2.0, minMargin: 0.1 },
      single: { minWeight: 1.5, minMargin: 0.3 },
    })
    expect(MAX_SUGGESTIONS).toBe(3)
  })

  it('NO se acepta si no coincide en el título (puntuación < 0,9)', () => {
    expect(isCompleteMatch(complete({ score: 0.89 }), nextOk)).toBe(false)
    expect(isCompleteMatch(complete({ score: 0.9 }), nextOk)).toBe(true)
  })

  it('NO se acepta con evidencia trivial (combinación de palabras muy comunes)', () => {
    expect(isCompleteMatch(complete({ matchedWeight: 0 }), nextOk)).toBe(false)
    expect(isCompleteMatch(complete({ matchedWeight: 1.9 }), nextOk)).toBe(false)
    expect(isCompleteMatch(complete({ matchedWeight: 2.0 }), nextOk)).toBe(true)
  })

  it('NO se acepta si hay EMPATE con otro artículo ("el SOS no llama" frente a "nadie contesta el SOS")', () => {
    expect(isCompleteMatch(complete(), chunk({ score: 1 }))).toBe(false)
    expect(isCompleteMatch(complete(), chunk({ score: 0.95 }))).toBe(false) // margen 0,05
    expect(isCompleteMatch(complete(), chunk({ score: 0.91 }))).toBe(false) // margen 0,09
    expect(isCompleteMatch(complete(), chunk({ score: 0.9 }))).toBe(true) // margen exacto 0,1 (1 - 0,9 = 0,0999… en coma flotante)
    // Con un empate no se responde con NINGUNO de los dos (el segundo no puede colarse por no tener "siguiente").
    expect(selectRelevant([complete(), chunk({ articleId: 'empate', score: 1, matchedWeight: 2.9, matchedTerms: 2, queryTerms: 2 })])).toEqual([])
  })

  it('solo se aplica al PRIMER resultado: el segundo no puede ser una coincidencia completa', () => {
    const second = complete({ articleId: 'segundo', score: 0.95 })
    expect(selectRelevant([chunk({ articleId: 'primero', score: 0.99, matchedWeight: 1, matchedTerms: 1, queryTerms: 3 }), second])).toEqual([])
  })

  it('sin siguiente resultado no hay empate posible', () => {
    expect(isCompleteMatch(complete(), undefined)).toBe(true)
  })

  it('con la base de datos sin la migración 6 (términos = 0) la vía nueva no se activa', () => {
    expect(isCompleteMatch(complete({ matchedTerms: 0, queryTerms: 0 }), nextOk)).toBe(false)
  })

  it('se puede desactivar en el umbral', () => {
    expect(isRelevant(complete(), { ...DEFAULT_GATE, completeMatch: false }, nextOk)).toBe(false)
  })

  it('no ablanda la vía general: una pregunta que no es completa sigue necesitando la evidencia de siempre', () => {
    expect(isRelevant(chunk({ score: 0.5, matchedWeight: 3.4 }), DEFAULT_GATE, nextOk)).toBe(false)
    expect(isRelevant(chunk({ score: 0.5, matchedWeight: 3.5 }), DEFAULT_GATE, nextOk)).toBe(true)
  })
})

describe('sugerencias cuando hay empate ("batería" → dos artículos)', () => {
  const tied = (id: string, over: Partial<RetrievedChunk> = {}) =>
    chunk({ articleId: id, score: 1, matchedWeight: 1.7, matchedTerms: 1, queryTerms: 1, ...over })

  it('con 2 o más artículos que coinciden igual de bien, los ofrece (máximo 3)', () => {
    expect(selectSuggestions([tied('a'), tied('b')]).map((c) => c.articleId)).toEqual(['a', 'b'])
    expect(selectSuggestions([tied('a'), tied('b'), tied('c'), tied('d')])).toHaveLength(3)
  })

  it('con un solo candidato no hay nada que sugerir (o responde, o no sabe)', () => {
    expect(selectSuggestions([tied('a'), tied('b', { score: 0.6 })])).toEqual([])
    expect(selectSuggestions([])).toEqual([])
  })

  it('un candidato que no coincide del todo, o con evidencia trivial, no se sugiere', () => {
    expect(selectSuggestions([tied('a'), tied('b', { matchedWeight: 1.4 })])).toEqual([])
    expect(selectSuggestions([tied('a'), tied('b', { matchedTerms: 0, queryTerms: 1 })])).toEqual([])
    expect(selectSuggestions([tied('a'), tied('b', { matchedTerms: 0, queryTerms: 0 })])).toEqual([])
  })

  it('solo cuentan los que empatan con el primero (margen < 0,1)', () => {
    expect(selectSuggestions([tied('a'), tied('b', { score: 0.95 }), tied('c', { score: 0.9 })]).map((c) => c.articleId)).toEqual(['a', 'b'])
  })
})

describe('coincidencia débil (solo para advertir más, nunca para tranquilizar)', () => {
  it('es débil por debajo de WEAK_MATCH_SCORE y normal en el límite o por encima', () => {
    expect(isWeakMatch(chunk({ score: WEAK_MATCH_SCORE - 0.01 }))).toBe(true)
    expect(isWeakMatch(chunk({ score: WEAK_MATCH_SCORE }))).toBe(false)
    expect(isWeakMatch(chunk({ score: 1 }))).toBe(false)
  })

  it('el umbral de respuesta es menor que el de coincidencia débil: hay una banda en la que se responde con aviso', () => {
    expect(MIN_SCORE).toBeLessThan(WEAK_MATCH_SCORE)
  })

  it('el generador la marca en la respuesta según la puntuación del fragmento', async () => {
    const generator = new ExtractiveAnswerGenerator(vi.fn())
    const weak = await generator.generate({ question: 'q', chunks: [chunk({ score: 0.3 })] })
    const strong = await generator.generate({ question: 'q', chunks: [chunk({ score: 0.8 })] })
    expect(weak.kind === 'answer' && weak.weakMatch).toBe(true)
    expect(strong.kind === 'answer' && strong.weakMatch).toBe(false)
  })
})

describe('normalizeQuestion', () => {
  it('limpia espacios y caracteres de control', () => {
    expect(normalizeQuestion('  El   reloj\n\tno\u0000 carga  ')).toEqual({ ok: true, value: 'El reloj no carga' })
  })

  it('rechaza preguntas demasiado cortas o largas', () => {
    expect(normalizeQuestion('  ab ')).toMatchObject({ ok: false })
    expect(normalizeQuestion('')).toMatchObject({ ok: false })
    expect(normalizeQuestion('x'.repeat(300))).toMatchObject({ ok: true })
    expect(normalizeQuestion('x'.repeat(301))).toMatchObject({ ok: false })
  })

  it('no deja pasar HTML como si fuera algo especial: se conserva como texto', () => {
    expect(normalizeQuestion('<script>alert(1)</script>')).toEqual({ ok: true, value: '<script>alert(1)</script>' })
  })
})

describe('parseChunk', () => {
  const row = {
    article_id: 'a1', article_title: 'T', category: 'C', section_id: 's1', section_position: 0,
    heading: 'H', body: '', steps: ['a'], score: 0.5, matched_weight: 3,
  }
  it('convierte una fila válida', () => {
    expect(parseChunk(row)).toMatchObject({ articleId: 'a1', score: 0.5, matchedWeight: 3, steps: ['a'] })
  })
  it('lee los términos que coinciden y los de la pregunta', () => {
    expect(parseChunk({ ...row, matched_terms: 2, query_terms: 2 })).toMatchObject({ matchedTerms: 2, queryTerms: 2 })
  })
  it('si la base de datos aún no los devuelve (migración 6 sin aplicar) valen 0 y la app sigue funcionando', () => {
    expect(parseChunk(row)).toMatchObject({ matchedTerms: 0, queryTerms: 0 })
  })
  it.each([[null], [{}], [{ ...row, score: '0.5' }], [{ ...row, steps: [1] }], [{ ...row, matched_weight: NaN }]])(
    'rechaza una forma inesperada: %j',
    (bad) => expect(() => parseChunk(bad)).toThrow(),
  )
})

describe('ExtractiveAnswerGenerator', () => {
  const article = (sections: Article['sections']): Article => ({
    id: 'a1', title: 'T', category: 'C', lastReviewedAt: '2026-01-01', sections,
  })
  const section = (position: number, heading: string, body: string, steps: string[]) => ({
    id: `s${position}`, position, heading, body, steps,
  })

  it('sin fragmentos no hay respuesta', async () => {
    const generator = new ExtractiveAnswerGenerator(vi.fn())
    expect(await generator.generate({ question: 'x', chunks: [] })).toEqual({ kind: 'no-info' })
  })

  it('si la sección tiene pasos, responde con ella y cita la fuente (sin cargar el artículo)', async () => {
    const load = vi.fn()
    const answer = await new ExtractiveAnswerGenerator(load).generate({ question: 'q', chunks: [chunk()] })

    expect(load).not.toHaveBeenCalled()
    expect(answer).toEqual({
      kind: 'answer',
      source: { articleId: 'a1', articleTitle: 'La ubicación no se actualiza', category: 'GPS y ubicación' },
      sections: [{ position: 1, heading: 'Qué comprobar primero', body: '', steps: ['Activa el GPS', 'Revisa la suscripción'] }],
      weakMatch: false,
    })
  })

  it('si la sección es solo explicación, añade la siguiente sección con pasos', async () => {
    const load = vi.fn().mockResolvedValue(
      article([
        section(0, 'Qué ocurre', 'El mapa muestra una hora antigua.', []),
        section(1, 'Qué comprobar primero', '', ['Activa el GPS']),
        section(2, 'Si sigue fallando', '', ['Reinicia el reloj']),
      ]),
    )
    const answer = await new ExtractiveAnswerGenerator(load).generate({
      question: 'q',
      chunks: [chunk({ sectionPosition: 0, heading: 'Qué ocurre', body: 'El mapa muestra una hora antigua.', steps: [] })],
    })
    expect(answer.kind === 'answer' && answer.sections.map((s) => s.heading)).toEqual(['Qué ocurre', 'Qué comprobar primero'])
  })

  it('no añade pasos de secciones ANTERIORES a la encontrada', async () => {
    const load = vi.fn().mockResolvedValue(
      article([section(0, 'Cancelar', '', ['Paso A']), section(1, 'Qué pasa al terminar', 'Texto', [])]),
    )
    const answer = await new ExtractiveAnswerGenerator(load).generate({
      question: 'q',
      chunks: [chunk({ sectionPosition: 1, heading: 'Qué pasa al terminar', body: 'Texto', steps: [] })],
    })
    expect(answer.kind === 'answer' && answer.sections).toHaveLength(1)
  })

  it('si no se puede cargar el artículo, responde igualmente con la sección encontrada', async () => {
    const load = vi.fn().mockRejectedValue(new Error('red'))
    const answer = await new ExtractiveAnswerGenerator(load).generate({
      question: 'q',
      chunks: [chunk({ steps: [], body: 'Explicación' })],
    })
    expect(answer.kind === 'answer' && answer.sections).toHaveLength(1)
  })

  it('NUNCA añade texto propio: todo lo que devuelve sale literal del fragmento', async () => {
    const c = chunk({ body: 'Cuerpo literal', steps: ['Paso 1 literal', 'Paso 2 literal'] })
    const answer = await new ExtractiveAnswerGenerator(vi.fn()).generate({ question: 'una pregunta cualquiera', chunks: [c] })
    expect(answer.kind).toBe('answer')
    if (answer.kind !== 'answer') return
    const emitted = JSON.stringify(answer)
    expect(emitted).not.toContain('una pregunta cualquiera')
    const allowed = [c.body, ...c.steps, c.heading, c.articleTitle, c.category]
    for (const text of answer.sections.flatMap((s) => [s.body, s.heading, ...s.steps]).filter(Boolean)) {
      expect(allowed).toContain(text)
    }
  })
})

describe('ask (flujo completo)', () => {
  const makeDeps = (over: Partial<AssistantDeps> = {}): AssistantDeps & {
    retrieve: ReturnType<typeof vi.fn>
    logUnanswered: ReturnType<typeof vi.fn>
    generator: { generate: ReturnType<typeof vi.fn> }
  } => ({
    retrieve: vi.fn().mockResolvedValue([chunk()]),
    logUnanswered: vi.fn().mockResolvedValue(true),
    generator: {
      generate: vi.fn().mockResolvedValue({
        kind: 'answer',
        source: { articleId: 'a1', articleTitle: 'T', category: 'C' },
        sections: [],
      }),
    },
    ...over,
  }) as never

  it('con un fragmento relevante responde y NO guarda la pregunta como "sin respuesta"', async () => {
    const deps = makeDeps()
    const result = await ask('la ubicación no se actualiza', deps)
    expect(result.status).toBe('answer')
    expect(deps.logUnanswered).not.toHaveBeenCalled()
  })

  it('al generador solo llegan los fragmentos que superan el umbral', async () => {
    const deps = makeDeps({
      retrieve: vi.fn().mockResolvedValue([chunk({ articleId: 'ok' }), chunk({ articleId: 'flojo', score: 0.05 })]),
    })
    await ask('pregunta', deps)
    const given = deps.generator.generate.mock.calls[0][0].chunks as RetrievedChunk[]
    expect(given.map((c) => c.articleId)).toEqual(['ok'])
  })

  it('sin resultados: "no-info", NO se llama al generador y se guarda la pregunta', async () => {
    const deps = makeDeps({ retrieve: vi.fn().mockResolvedValue([]) })
    expect(await ask('¿Es resistente al agua?', deps)).toEqual({ status: 'no-info', logged: true })
    expect(deps.generator.generate).not.toHaveBeenCalled()
    expect(deps.logUnanswered).toHaveBeenCalledExactlyOnceWith('¿Es resistente al agua?')
  })

  it('con resultados por debajo del umbral: "no-info" y se guarda la pregunta', async () => {
    const deps = makeDeps({ retrieve: vi.fn().mockResolvedValue([chunk({ score: 0.1 })]) })
    expect(await ask('¿Cuánto cuesta?', deps)).toEqual({ status: 'no-info', logged: true })
    expect(deps.generator.generate).not.toHaveBeenCalled()
  })

  it('con un empate entre artículos devuelve sugerencias, no responde y NO guarda la pregunta como "sin respuesta"', async () => {
    const tied = (id: string, title: string) =>
      chunk({ articleId: id, articleTitle: title, score: 1, matchedWeight: 1.7, matchedTerms: 1, queryTerms: 1 })
    const deps = makeDeps({ retrieve: vi.fn().mockResolvedValue([tied('a', 'Batería A'), tied('b', 'Batería B')]) })
    expect(await ask('bateria', deps)).toEqual({
      status: 'suggestions',
      candidates: [
        { articleId: 'a', articleTitle: 'Batería A', category: 'GPS y ubicación', sectionPosition: 1 },
        { articleId: 'b', articleTitle: 'Batería B', category: 'GPS y ubicación', sectionPosition: 1 },
      ],
    })
    expect(deps.generator.generate).not.toHaveBeenCalled()
    expect(deps.logUnanswered).not.toHaveBeenCalled()
  })

  it('si el generador no produce respuesta, también cuenta como "sin respuesta"', async () => {
    const deps = makeDeps({ generator: { generate: vi.fn().mockResolvedValue({ kind: 'no-info' }) } as AnswerGenerator })
    expect(await ask('x', deps)).toMatchObject({ status: 'no-info' })
    expect(deps.logUnanswered).toHaveBeenCalled()
  })

  it('si falla el guardado, igualmente responde "no-info" (con logged: false)', async () => {
    const deps = makeDeps({
      retrieve: vi.fn().mockResolvedValue([]),
      logUnanswered: vi.fn().mockRejectedValue(new Error('red')),
    })
    expect(await ask('algo sin respuesta', deps)).toEqual({ status: 'no-info', logged: false })
  })

  it('si falla la recuperación, el error se propaga y no se guarda nada', async () => {
    const deps = makeDeps({ retrieve: vi.fn().mockRejectedValue(new Error('caída')) })
    await expect(ask('x', deps)).rejects.toThrow('caída')
    expect(deps.logUnanswered).not.toHaveBeenCalled()
  })
})
