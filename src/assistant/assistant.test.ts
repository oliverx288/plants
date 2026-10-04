import { describe, expect, it, vi } from 'vitest'
import type { Article } from '../lib/articles'
import { ask } from './ask'
import type { AssistantDeps } from './ask'
import { ExtractiveAnswerGenerator } from './generator'
import { normalizeQuestion } from './question'
import { MIN_MATCHED_WEIGHT, MIN_SCORE, isRelevant, selectRelevant } from './relevance'
import { parseChunk } from './retrieval'
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
