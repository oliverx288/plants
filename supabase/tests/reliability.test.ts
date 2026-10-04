import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_GATE } from '../../src/assistant/relevance'
import { collect, grade, summarize } from '../reliability/evaluate'
import type { Metrics, RawResult } from '../reliability/evaluate'
import { createPgliteSearch } from '../reliability/pglite'
import { QUESTIONS } from '../reliability/questions'
import { formatFailures, formatMetrics, formatSweep } from '../reliability/report'

/*
 * Fiabilidad del asistente: ejecuta las preguntas de prueba contra la MISMA función de búsqueda SQL y el
 * MISMO umbral que usa la aplicación, y muestra el porcentaje de aciertos.
 *
 * Las comprobaciones de abajo son GARANTÍAS DE REGRESIÓN, no objetivos de marketing: están por debajo de lo
 * medido para que el test no sea frágil, y fallan si alguien empeora la búsqueda o el umbral.
 * Lo que no se negocia es "no inventar": 0 respuestas inventadas.
 */

let env: Awaited<ReturnType<typeof createPgliteSearch>>
let raw: RawResult[]
let all: Metrics
let dev: Metrics
let test: Metrics

beforeAll(async () => {
  env = await createPgliteSearch()
  raw = await collect(env.search, QUESTIONS)
  const results = raw.map((r) => grade(r))
  all = summarize(results)
  dev = summarize(results.filter((r) => r.question.set === 'dev'))
  test = summarize(results.filter((r) => r.question.set === 'test'))

  console.log(
    '\n' + [
      formatMetrics('TOTAL', all),
      '',
      formatMetrics('Desarrollo (se usó para calibrar el umbral)', dev),
      '',
      formatMetrics('Test retenido (solo se usó para medir)', test),
      '',
      'Fallos:',
      formatFailures(results),
      '',
      `Qué pasa al mover la evidencia mínima (puntuación mínima ${DEFAULT_GATE.minScore}; sobre las ${all.total} preguntas):`,
      formatSweep(raw, DEFAULT_GATE.minScore, [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0], DEFAULT_GATE.minMatchedWeight),
    ].join('\n') + '\n',
  )
})
afterAll(async () => {
  await env.close()
})

describe('fiabilidad del asistente (preguntas de prueba)', () => {
  it('NUNCA inventa: ninguna pregunta sin artículo recibe respuesta', () => {
    expect(all.falsePositives).toBe(0)
    expect(all.noInfoAccuracy).toBe(100)
  })

  it('casi nunca responde con un artículo equivocado (como mucho 2 de las 41)', () => {
    expect(all.wrongAnswers).toBeLessThanOrEqual(2)
  })

  it('cuando responde, se puede fiar: al menos el 85 % de sus respuestas son correctas', () => {
    expect(all.answerPrecision).toBeGreaterThanOrEqual(85)
  })

  it('aciertos totales: al menos 80 %, y también en el conjunto retenido', () => {
    expect(all.accuracy).toBeGreaterThanOrEqual(80)
    expect(test.accuracy).toBeGreaterThanOrEqual(75)
  })

  it('la búsqueda sola encuentra el artículo entre los 3 primeros en al menos el 85 % de los casos', () => {
    expect(all.hitAt3).toBeGreaterThanOrEqual(85)
  })

  it('el conjunto de desarrollo no es mucho mejor que el retenido (señal de sobreajuste si lo es)', () => {
    expect(dev.accuracy - test.accuracy).toBeLessThanOrEqual(15)
  })

  it('el umbral es el que usa la aplicación', () => {
    expect(DEFAULT_GATE).toEqual({ minScore: 0.2, minMatchedWeight: 3.5 })
  })
})
