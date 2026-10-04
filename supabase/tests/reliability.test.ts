import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_GATE } from '../../src/assistant/relevance'
import { collect, grade, summarize } from '../reliability/evaluate'
import type { Metrics, RawResult } from '../reliability/evaluate'
import { createPgliteSearch } from '../reliability/pglite'
import { FRESH2_QUESTIONS, FRESH3_QUESTIONS, FRESH4_QUESTIONS, FRESH_QUESTIONS, QUESTIONS } from '../reliability/questions'
import { formatFailures, formatMetrics, formatSweep } from '../reliability/report'

/*
 * Fiabilidad del asistente: ejecuta las preguntas de prueba contra la MISMA función de búsqueda SQL y el
 * MISMO umbral que usa la aplicación, y muestra el porcentaje de aciertos.
 *
 * ATENCIÓN a cómo leer estos números (ver VALIDACION.md §2):
 *  - "Original" (41 preguntas, dev + test): las preguntas SIN artículo usan, en su mayoría, palabras que no
 *    aparecen en ningún artículo (agua, garantía, precio…). Es el caso FÁCIL: 85 % de aciertos, 0 inventadas.
 *  - "Nuevo 1" y "Nuevo 2" (59 preguntas, escritas después): incluyen preguntas adversarias, que usan vocabulario
 *    del dominio para algo que no está cubierto ("¿Aceptan pagos con PayPal?"). Es el caso DIFÍCIL, y ahí el
 *    sistema SÍ inventa respuestas (~40 % de las preguntas sin artículo).
 *
 * Las comprobaciones de abajo son GARANTÍAS DE REGRESIÓN ("no empeorar"), NO objetivos de calidad: los umbrales
 * del caso difícil están en el nivel actual, que es malo. No deben leerse como "el asistente es fiable".
 */

let env: Awaited<ReturnType<typeof createPgliteSearch>>
let rawAll: RawResult[]
let original: Metrics
let dev: Metrics
let test: Metrics
let fresh: Metrics
let fresh2: Metrics
let hard: Metrics // fresh + fresh2
let short: Metrics // fresh3: consultas cortas y coloquiales
let vague: Metrics // fresh4: muy cortas, vagas o con erratas

const metricsOf = (raw: RawResult[]) => summarize(raw.map((r) => grade(r)))

beforeAll(async () => {
  env = await createPgliteSearch()
  const raw = await collect(env.search, [...QUESTIONS, ...FRESH_QUESTIONS, ...FRESH2_QUESTIONS, ...FRESH3_QUESTIONS, ...FRESH4_QUESTIONS])
  rawAll = raw
  const bySet = (...sets: string[]) => raw.filter((r) => sets.includes(r.question.set))
  original = metricsOf(bySet('dev', 'test'))
  dev = metricsOf(bySet('dev'))
  test = metricsOf(bySet('test'))
  fresh = metricsOf(bySet('fresh'))
  fresh2 = metricsOf(bySet('fresh2'))
  hard = metricsOf(bySet('fresh', 'fresh2'))
  short = metricsOf(bySet('fresh3'))
  vague = metricsOf(bySet('fresh4'))

  const failures = (...sets: string[]) => formatFailures(bySet(...sets).map((r) => grade(r)))
  console.log(
    '\n' + [
      '══ CASO FÁCIL: conjunto original ══',
      formatMetrics('Original (dev + test)', original),
      '',
      formatMetrics('  · Desarrollo (se usó para calibrar el umbral)', dev),
      formatMetrics('  · Test retenido', test),
      '',
      '══ CASO DIFÍCIL: conjuntos nuevos (incluyen preguntas adversarias) ══',
      formatMetrics('Nuevo 1', fresh),
      formatMetrics('Nuevo 2 (fuera de muestra)', fresh2),
      formatMetrics('Nuevos 1 + 2', hard),
      '',
      '══ CONSULTAS CORTAS Y COLOQUIALES ("el reloj no carga") ══',
      formatMetrics('Cortas (nuevo 3)', short),
      '',
      '══ MUY CORTAS, VAGAS Y CON ERRATAS ("no enciende", "bateria", "no carga") ══',
      formatMetrics('Vagas y erratas (nuevo 4; escrito DESPUÉS de implementar, no mide generalización)', vague),
      '',
      'Fallos del caso difícil:',
      failures('fresh', 'fresh2'),
      '',
      'Fallos de las consultas cortas:',
      failures('fresh3'),
      '',
      'Fallos de las consultas muy cortas, vagas y con erratas:',
      failures('fresh4'),
      '',
      `Qué pasa al mover la evidencia mínima (puntuación mínima ${DEFAULT_GATE.minScore}; sobre las ${rawAll.length} preguntas):`,
      formatSweep(rawAll, DEFAULT_GATE.minScore, [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0], DEFAULT_GATE.minMatchedWeight),
    ].join('\n') + '\n',
  )
})
afterAll(async () => {
  await env.close()
})

describe('caso fácil: conjunto original', () => {
  it('no inventa con preguntas cuyo tema no aparece en ningún artículo', () => {
    expect(original.falsePositives).toBe(0)
    expect(original.noInfoAccuracy).toBe(100)
  })

  it('casi nunca responde con un artículo equivocado (como mucho 2 de las 41)', () => {
    expect(original.wrongAnswers).toBeLessThanOrEqual(2)
  })

  it('cuando responde, el 85 % de sus respuestas son correctas', () => {
    expect(original.answerPrecision).toBeGreaterThanOrEqual(85)
  })

  it('aciertos totales: al menos 80 %, y también en el conjunto retenido (75 %)', () => {
    expect(original.accuracy).toBeGreaterThanOrEqual(80)
    expect(test.accuracy).toBeGreaterThanOrEqual(75)
  })

  it('la búsqueda sola encuentra el artículo entre los 3 primeros en al menos el 85 % de los casos', () => {
    expect(original.hitAt3).toBeGreaterThanOrEqual(85)
  })

  it('el umbral es el que usa la aplicación', () => {
    expect(DEFAULT_GATE).toMatchObject({ minScore: 0.2, minMatchedWeight: 3.5 })
  })
})

describe('caso difícil: conjuntos nuevos (REGRESIÓN, no objetivo de calidad)', () => {
  it('la búsqueda sola sigue encontrando el artículo entre los 3 primeros (≥ 80 %)', () => {
    expect(hard.hitAt3).toBeGreaterThanOrEqual(80)
  })

  it('no empeora: aciertos ≥ 45 % (Nuevo 1) y ≥ 55 % (Nuevo 2)', () => {
    expect(fresh.accuracy).toBeGreaterThanOrEqual(45)
    expect(fresh2.accuracy).toBeGreaterThanOrEqual(55)
  })

  it('no empeora: como mucho 6 respuestas inventadas en cada conjunto (HOY SON 6 DE 14 Y 6 DE 15: es un problema conocido)', () => {
    expect(fresh.falsePositives).toBeLessThanOrEqual(6)
    expect(fresh2.falsePositives).toBeLessThanOrEqual(6)
  })

  it('la limitación está documentada: si alguien la arregla, este test obliga a actualizar VALIDACION.md y README', () => {
    // Si esto deja de cumplirse, el sistema inventa menos de lo documentado: actualiza la documentación.
    expect(hard.falsePositives).toBeGreaterThanOrEqual(8)
  })
})

describe('consultas cortas y coloquiales (hallazgo real de la autora)', () => {
  const find = (text: string) => rawAll.find((r) => r.question.question === text)!

  it('"el reloj no carga", que es el título exacto de un artículo, se responde con ese artículo', () => {
    const r = grade(find('el reloj no carga'))
    expect(r.status).toBe('ok')
    expect(r.answeredWith).toBe('reloj-no-carga')
  })

  it('las consultas cortas aciertan ≥ 85 % y encuentran el artículo en ≥ 80 % de los casos', () => {
    expect(short.accuracy).toBeGreaterThanOrEqual(85)
    expect(short.recall).toBeGreaterThanOrEqual(80)
  })

  it('las consultas de una sola palabra o sin contenido NO se responden ("reloj", "SOS", "app", "hola"…)', () => {
    for (const text of ['reloj', 'app', 'SOS', 'el reloj', 'no funciona', 'ayuda', 'hola']) {
      expect(grade(find(text)).status, text).toBe('ok')
    }
  })

  it('un empate entre dos artículos no se responde ("el SOS no llama" encaja igual con dos artículos de SOS)', () => {
    expect(grade(find('el SOS no llama')).answeredWith).toBeNull()
  })

  it('la coincidencia completa NO añade ninguna respuesta inventada en ningún conjunto', () => {
    const off = { ...DEFAULT_GATE, completeMatch: false }
    const withRule = summarize(rawAll.map((r) => grade(r))).falsePositives
    const withoutRule = summarize(rawAll.map((r) => grade(r, off))).falsePositives
    expect(withRule).toBeLessThanOrEqual(withoutRule)
  })

  it('...ni empeora nada fuera de las consultas cortas: los otros conjuntos dan exactamente lo mismo con y sin la regla', () => {
    const off = { ...DEFAULT_GATE, completeMatch: false }
    for (const set of ['dev', 'test', 'fresh']) {
      const rs = rawAll.filter((r) => r.question.set === set)
      const a = rs.map((r) => grade(r).status)
      const b = rs.map((r) => grade(r, off).status)
      expect(a, set).toEqual(b)
    }
  })

  it('el umbral incluye la coincidencia completa', () => {
    expect(DEFAULT_GATE).toEqual({ minScore: 0.2, minMatchedWeight: 3.5, completeMatch: true })
  })
})

describe('muy cortas, vagas y con erratas (segunda petición de la autora)', () => {
  const find = (text: string) => rawAll.find((r) => r.question.question === text)!

  it('"no enciende" y "no carga" (una sola palabra significativa) responden con el artículo del reloj', () => {
    expect(grade(find('no enciende')).answeredWith).toBe('reloj-no-enciende')
    expect(grade(find('no carga')).answeredWith).toBe('reloj-no-carga')
  })

  it('las erratas se corrigen: "no enciedne", "la batreia dura poco", "la baterya dura poco"', () => {
    expect(grade(find('no enciedne')).answeredWith).toBe('reloj-no-enciende')
    expect(grade(find('la batreia dura poco')).answeredWith).toBe('bateria-dura-poco')
    expect(grade(find('la baterya dura poco')).answeredWith).toBe('bateria-dura-poco')
  })

  it('"bateria" y "baterai" empatan entre dos artículos: no se responde con uno, se ofrecen los dos', () => {
    for (const text of ['bateria', 'baterai']) {
      const r = grade(find(text))
      expect(r.answeredWith, text).toBeNull()
      expect(r.suggested.sort(), text).toEqual(['bateria-dura-poco', 'reloj-se-apaga-solo'])
    }
  })

  it('no inventa nada ni responde con otro artículo (0 inventadas, 0 equivocadas)', () => {
    expect(vague.falsePositives).toBe(0)
    expect(vague.wrongAnswers).toBe(0)
  })

  it('las palabras sueltas genéricas o ajenas no se responden ni se sugieren', () => {
    for (const text of ['reloj', 'no funciona', 'problema', 'color', 'wifi', 'garantia', 'bateria del movil']) {
      const r = grade(find(text))
      expect(r.status, text).toBe('ok')
      expect(r.suggested, text).toEqual([])
    }
  })

  it('una errata no corrige palabras reales que no están en los artículos ("quiero", "cuesta", "pulsera")', () => {
    for (const text of ['quiero cambiar la pulsera', 'cuesta mucho']) expect(grade(find(text)).status, text).toBe('ok')
  })

  it('límites conocidos, documentados: sinónimos y erratas en palabras cortas siguen sin resolverse', () => {
    for (const text of ['no prende', 'darme de baja', 'no carca']) expect(grade(find(text)).status, text).toBe('missed')
  })

  it('en conjunto: ≥ 80 % de aciertos y todo lo que responde es correcto', () => {
    expect(vague.accuracy).toBeGreaterThanOrEqual(80)
    expect(vague.answerPrecision).toBe(100)
  })

  it('las sugerencias no aparecen en preguntas sin artículo', () => {
    expect(vague.suggestionsOnUnanswerable).toBe(0)
  })
})
