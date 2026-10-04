import { describe, expect, it } from 'vitest'
import {
  LIMITS, emptyDraft, emptySection, hasErrors, parseSteps, toDraft, toPayload, todayIso, validateDraft,
} from './draft'
import type { ArticleDraft } from './draft'

const TODAY = '2026-10-04'
const valid = (): ArticleDraft => ({
  title: 'Cómo cargar el reloj',
  category: 'Batería y carga',
  lastReviewedAt: '2026-09-01',
  sections: [{ key: 'a', heading: 'Pasos', body: '', stepsText: 'Conecta la base\nColoca el reloj' }],
})

describe('parseSteps', () => {
  it('un paso por línea, sin espacios ni líneas vacías', () => {
    expect(parseSteps('  uno \n\n dos\n   \n tres  ')).toEqual(['uno', 'dos', 'tres'])
    expect(parseSteps('')).toEqual([])
  })
})

describe('todayIso', () => {
  it('formatea la fecha local como AAAA-MM-DD', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(todayIso(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31')
  })
})

describe('validateDraft', () => {
  it('un borrador correcto no tiene errores', () => {
    expect(hasErrors(validateDraft(valid(), TODAY))).toBe(false)
  })

  it('valida el título en sus límites exactos', () => {
    const d = valid()
    d.title = 'x'.repeat(LIMITS.title.min - 1)
    expect(validateDraft(d, TODAY).title).toBeTruthy()
    d.title = 'x'.repeat(LIMITS.title.min)
    expect(validateDraft(d, TODAY).title).toBeUndefined()
    d.title = 'x'.repeat(LIMITS.title.max)
    expect(validateDraft(d, TODAY).title).toBeUndefined()
    d.title = 'x'.repeat(LIMITS.title.max + 1)
    expect(validateDraft(d, TODAY).title).toBeTruthy()
  })

  it('ignora los espacios de los extremos al medir', () => {
    const d = valid()
    d.title = '   abc   '
    expect(validateDraft(d, TODAY).title).toBeTruthy()
  })

  it('valida categoría y fechas (inválida, imposible o futura)', () => {
    const d = valid()
    d.category = 'x'
    expect(validateDraft(d, TODAY).category).toBeTruthy()
    for (const bad of ['', 'ayer', '2026-13-01', '2026-02-30']) {
      d.lastReviewedAt = bad
      expect(validateDraft(d, TODAY).lastReviewedAt, bad).toBe('Indica una fecha válida.')
    }
    d.lastReviewedAt = '2026-10-05'
    expect(validateDraft(d, TODAY).lastReviewedAt).toMatch(/futuro/)
    d.lastReviewedAt = TODAY
    expect(validateDraft(d, TODAY).lastReviewedAt).toBeUndefined()
  })

  it('exige entre 1 y 15 secciones', () => {
    const d = valid()
    d.sections = []
    expect(validateDraft(d, TODAY).sections).toBeTruthy()
    d.sections = Array.from({ length: 16 }, () => ({ ...valid().sections[0], key: Math.random().toString() }))
    expect(validateDraft(d, TODAY).sections).toBeTruthy()
  })

  it('una sección necesita encabezado y texto o pasos', () => {
    const d = valid()
    d.sections = [{ key: 'k', heading: '', body: '', stepsText: '' }]
    const e = validateDraft(d, TODAY).bySection.k
    expect(e.heading).toBeTruthy()
    expect(e.general).toBeTruthy()
  })

  it('limita texto (2000), pasos (20) y longitud de cada paso (300)', () => {
    const d = valid()
    d.sections[0].body = 'x'.repeat(LIMITS.body.max + 1)
    expect(validateDraft(d, TODAY).bySection.a.body).toBeTruthy()
    d.sections[0].body = ''
    d.sections[0].stepsText = Array.from({ length: LIMITS.steps.max + 1 }, (_, i) => `paso ${i}`).join('\n')
    expect(validateDraft(d, TODAY).bySection.a.steps).toMatch(/20 pasos/)
    d.sections[0].stepsText = 'x'.repeat(LIMITS.step.max + 1)
    expect(validateDraft(d, TODAY).bySection.a.steps).toMatch(/300 caracteres/)
    d.sections[0].stepsText = 'x'.repeat(LIMITS.step.max)
    expect(validateDraft(d, TODAY).bySection.a).toBeUndefined()
  })

  it('el HTML se acepta como texto (no se elimina ni se interpreta)', () => {
    const d = valid()
    d.sections[0].body = '<script>alert(1)</script>'
    expect(hasErrors(validateDraft(d, TODAY))).toBe(false)
    expect(toPayload(d).sections[0].body).toBe('<script>alert(1)</script>')
  })
})

describe('conversiones', () => {
  it('emptyDraft empieza con una sección vacía y la fecha de hoy', () => {
    const d = emptyDraft(TODAY, 'Título previo')
    expect(d).toMatchObject({ title: 'Título previo', lastReviewedAt: TODAY })
    expect(d.sections).toHaveLength(1)
  })

  it('las claves de sección son únicas', () => {
    expect(emptySection().key).not.toBe(emptySection().key)
  })

  it('toDraft y toPayload son inversas (los pasos vuelven a una línea cada uno)', () => {
    const draft = toDraft({
      id: 'a1', title: 'Título del artículo', category: 'Cat', lastReviewedAt: '2026-09-01',
      sections: [{ id: 's', position: 0, heading: 'Pasos', body: 'Texto', steps: ['uno', 'dos'] }],
    })
    expect(draft.sections[0].stepsText).toBe('uno\ndos')
    expect(toPayload(draft)).toEqual({
      title: 'Título del artículo', category: 'Cat', lastReviewedAt: '2026-09-01',
      sections: [{ heading: 'Pasos', body: 'Texto', steps: ['uno', 'dos'] }],
    })
  })
})
