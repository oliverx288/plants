import { grade, summarize, wilsonInterval } from './evaluate'
import type { Metrics, QuestionResult, RawResult } from './evaluate'

const f = (n: number) => `${n.toFixed(1)} %`

export function formatMetrics(title: string, m: Metrics): string {
  const [lo, hi] = wilsonInterval(m.correct, m.total)
  const [, fpHi] = wilsonInterval(m.falsePositives, m.unanswerable)
  return [
    `${title} (${m.total} preguntas: ${m.answerable} con artículo, ${m.unanswerable} sin él)`,
    `  Aciertos totales ............ ${f(m.accuracy)}   (intervalo de confianza 95 %: ${lo.toFixed(0)}–${hi.toFixed(0)} %)`,
    `  · con artículo (recall) ..... ${f(m.recall)}   (respuesta correcta)`,
    `  · sin artículo .............. ${f(m.noInfoAccuracy)}   ("No tengo información" correcto)`,
    `  Fiabilidad de las respuestas  ${f(m.answerPrecision)}   (de lo que responde, cuánto es correcto)`,
    `  Errores: ${m.falsePositives} inventadas (sin artículo) · ${m.wrongAnswers} con otro artículo · ${m.missed} no encontradas`,
    `  Tasa REAL posible de respuestas inventadas: hasta ${fpHi.toFixed(0)} % (observadas ${m.falsePositives} de ${m.unanswerable}; intervalo 95 %)`,
    `  Búsqueda sola, sin umbral: acierta a la 1ª ${f(m.hitAt1)} · entre las 3 primeras ${f(m.hitAt3)}`,
  ].join('\n')
}

const ICON = { ok: '✓', missed: '·', 'wrong-answer': '✗', 'false-positive': '‼' } as const
const LABEL = { ok: 'ok', missed: 'no la encontró', 'wrong-answer': 'OTRO artículo', 'false-positive': 'INVENTÓ' } as const

export function formatFailures(results: QuestionResult[]): string {
  const bad = results.filter((r) => r.status !== 'ok')
  if (bad.length === 0) return '  (sin fallos)'
  return bad
    .map((r) => {
      const exp = r.question.expected ?? '(sin artículo)'
      const got = r.answeredWith ?? '(No tengo información)'
      return [
        `  ${ICON[r.status]} ${LABEL[r.status]} · «${r.question.question}»`,
        `      esperado: ${exp}`,
        `      respondió: ${got}   [mejor resultado: ${r.topRaw ?? '—'}, puntuación ${r.topScore.toFixed(2)}, evidencia ${r.topWeight.toFixed(1)}]`,
      ].join('\n')
    })
    .join('\n')
}

/**
 * Curva del intercambio entre "no inventar" y "responder más": cómo cambian los errores al exigir más o
 * menos evidencia. Es INFORMATIVA (se calcula sobre todas las preguntas): sirve para ver el coste de
 * mover el umbral, no para elegirlo.
 */
export function formatSweep(raw: RawResult[], minScore: number, weights: number[], current: number): string {
  const lines = ['  evidencia mínima | aciertos | inventadas | otro artículo | no encontradas']
  for (const w of weights) {
    const m = summarize(raw.map((r) => grade(r, { minScore, minMatchedWeight: w })))
    const mark = w === current ? '  ← actual' : ''
    lines.push(
      `  ${w.toFixed(1).padStart(16)} | ${f(m.accuracy).padStart(8)} | ${String(m.falsePositives).padStart(10)} | ${String(m.wrongAnswers).padStart(13)} | ${String(m.missed).padStart(15)}${mark}`,
    )
  }
  return lines.join('\n')
}
