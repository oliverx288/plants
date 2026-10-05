import { describe, expect, it } from 'vitest'
import { LIMITS } from '../editor/draft'
import { bodyFontSize, removeBoilerplate, structureLines } from './structure'
import type { PdfLine } from './structure'

const BODY = 'Texto del cuerpo del artículo con una frase suficientemente larga.'
const L = (text: string, size = 12, gap = 0, page = 1): PdfLine => ({ text, size, gap, page })

describe('structureLines: título y secciones', () => {
  const doc = [
    L('El reloj no carga', 24),
    L('Qué ocurre', 16, 1),
    L('Al conectar el cable no aparece el icono de carga.', 12, 0.4),
    L('Puede pasar con cargadores de otras marcas.', 12),
    L('Qué comprobar primero', 16, 1),
    L('1. Usa la base y el cable originales.', 12, 0.4),
    L('2. Limpia los contactos con un paño seco.', 12),
    L('3. Prueba con otro enchufe.', 12),
    L('Si sigue fallando', 16, 1),
    L('• Reinicia el reloj.', 12, 0.4),
    L('• Abre una incidencia.', 12),
  ]
  const article = structureLines(doc, 'faro.pdf')

  it('el texto más grande es el título', () => {
    expect(article.title).toBe('El reloj no carga')
  })

  it('las líneas con letra mayor abren una sección, con su texto y sus pasos (sin la numeración)', () => {
    expect(article.sections).toEqual([
      { heading: 'Qué ocurre', body: 'Al conectar el cable no aparece el icono de carga. Puede pasar con cargadores de otras marcas.', steps: [] },
      {
        heading: 'Qué comprobar primero',
        body: '',
        steps: ['Usa la base y el cable originales.', 'Limpia los contactos con un paño seco.', 'Prueba con otro enchufe.'],
      },
      { heading: 'Si sigue fallando', body: '', steps: ['Reinicia el reloj.', 'Abre una incidencia.'] },
    ])
    expect(article.warnings).toEqual([])
  })
})

describe('structureLines: artículo breve (los encabezados suman más letras que el cuerpo)', () => {
  it('el cuerpo no se confunde con los encabezados aunque estos sumen más letras (líneas largas o, si no hay, peso mínimo)', () => {
    const a = structureLines([
      L('Título del artículo breve', 22),
      L('Qué ocurre con el reloj', 16, 1), L('Pasa si el cable está flojo.', 12, 0.3), // 28 caracteres: no es «larga»
      L('Qué comprobar primero ahora', 16, 1), L('- Mira el cable.', 12, 0.3),
      L('Qué hacer si sigue igual', 16, 1), L('Reinicia el reloj.', 12, 0.3),
    ])
    expect(a.sections.map((s) => s.heading)).toEqual(['Qué ocurre con el reloj', 'Qué comprobar primero ahora', 'Qué hacer si sigue igual'])
  })
})

describe('structureLines: casos concretos', () => {
  it('un hueco grande separa párrafos; el texto de dos líneas seguidas es un solo párrafo', () => {
    const a = structureLines([L('Título del artículo', 20), L('Sección', 15, 1), L('Primera frase', 12, 0.3), L('sigue aquí.', 12), L('Otro párrafo.', 12, 1)])
    expect(a.sections[0].body).toBe('Primera frase sigue aquí.\n\nOtro párrafo.')
  })

  it('une las palabras partidas con guion al final de línea', () => {
    const a = structureLines([L('Título del artículo', 20), L('Sección', 15, 1), L('La conexión inalám-', 12, 0.3), L('brica falla.', 12)])
    expect(a.sections[0].body).toBe('La conexión inalámbrica falla.')
  })

  it('un paso que sigue en la línea siguiente se une a él', () => {
    const a = structureLines([L('Título del artículo', 20), L('Sección', 15, 1), L('1. Mantén pulsado el botón lateral', 12, 0.3), L('durante diez segundos.', 12), L('2. Suelta.', 12)])
    expect(a.sections[0].steps).toEqual(['Mantén pulsado el botón lateral durante diez segundos.', 'Suelta.'])
  })

  it('reconoce viñetas, «a)», «Paso 2:» y numeración con paréntesis', () => {
    const a = structureLines([
      L('Título del artículo', 20), L('Sección', 15, 1),
      L('- Uno.', 12, 0.3), L('– Dos.', 12), L('* Tres.', 12), L('a) Cuatro.', 12), L('Paso 5: Cinco.', 12), L('6) Seis.', 12),
    ])
    expect(a.sections[0].steps).toEqual(['Uno.', 'Dos.', 'Tres.', 'Cuatro.', 'Cinco.', 'Seis.'])
  })

  it('un encabezado de varias líneas seguidas es uno solo; dos encabezados separados son dos secciones', () => {
    const a = structureLines([
      L('Título del artículo', 20),
      L('Qué ocurre cuando el reloj', 16, 1), L('no enciende', 16),
      L(BODY + ' Uno.', 12, 0.3),
      L('Otro encabezado', 16, 1), L(BODY + ' Dos.', 12, 0.3),
    ])
    expect(a.sections.map((s) => s.heading)).toEqual(['Qué ocurre cuando el reloj no enciende', 'Otro encabezado'])
  })

  it('un encabezado sin contenido se descarta', () => {
    const a = structureLines([L('Título del artículo', 20), L('Vacío', 16, 1), L('Con contenido', 16, 1), L(BODY, 12, 0.3)])
    expect(a.sections.map((s) => s.heading)).toEqual(['Con contenido'])
  })
})

describe('structureLines: sin tamaños distintos y sin título', () => {
  it('sin título detectable usa el nombre del archivo y avisa', () => {
    const a = structureLines([L('Solo texto normal de un párrafo sin título.', 12)], 'guia_de_carga-rapida.pdf')
    expect(a.title).toBe('guia de carga rapida')
    expect(a.warnings.join(' ')).toMatch(/título/)
  })

  it('texto uniforme: encabezados «1. Título» y en MAYÚSCULAS; avisa si no encuentra ninguno', () => {
    const a = structureLines([
      L('1. Qué ocurre', 12, 1), L('El reloj no carga.', 12, 0.3),
      L('2. COMPROBACIONES', 12, 1), L('Revisa el cable.', 12, 0.3),
    ], 'manual.pdf')
    expect(a.sections.map((s) => s.heading)).toEqual(['Qué ocurre', 'COMPROBACIONES'])
    const flat = structureLines([L('Un texto largo sin encabezados que acaba en punto.', 12), L('Y otro.', 12, 1)], 'manual.pdf')
    expect(flat.sections).toHaveLength(1)
    expect(flat.sections[0].heading).toBe('Contenido')
    expect(flat.warnings.join(' ')).toMatch(/encabezados/)
  })

  it('un PDF sin contenido avisa', () => {
    expect(structureLines([], 'vacio.pdf').warnings.join(' ')).toMatch(/No se ha encontrado contenido/)
  })
})

describe('structureLines: respeta los límites de la base de datos (LIMITS)', () => {
  const head = [L('Título del artículo', 20), L('Sección', 15, 1)]

  it('un texto de más de 2000 caracteres se reparte en secciones de continuación', () => {
    const paragraphs = Array.from({ length: 5 }, (_, i) => L(`Párrafo ${i} ${'palabra '.repeat(70)}`.trim(), 12, 1))
    const a = structureLines([...head, ...paragraphs])
    expect(a.sections.length).toBeGreaterThan(1)
    expect(a.sections[0].heading).toBe('Sección')
    expect(a.sections[1].heading).toBe('Sección (continuación)')
    for (const s of a.sections) expect(s.body.length).toBeLessThanOrEqual(LIMITS.body.max)
  })

  it('más de 20 pasos se reparten en secciones de continuación', () => {
    const steps = Array.from({ length: 25 }, (_, i) => L(`${(i % 9) + 1}. Paso número ${i}.`, 12, i === 0 ? 0.3 : 0))
    const a = structureLines([...head, ...steps])
    expect(a.sections.map((s) => s.steps.length)).toEqual([20, 5])
  })

  it('un paso de más de 300 caracteres se corta y se avisa', () => {
    const a = structureLines([...head, L(`1. ${'x'.repeat(400)}`, 12, 0.3)])
    expect(a.sections[0].steps[0].length).toBe(LIMITS.step.max)
    expect(a.sections[0].steps[0].endsWith('…')).toBe(true)
    expect(a.warnings.join(' ')).toMatch(/1 paso/)
  })

  it('un párrafo de más de 2000 caracteres se corta y se avisa', () => {
    const a = structureLines([...head, L('y'.repeat(2500), 12, 0.3)])
    expect(a.sections[0].body.length).toBe(LIMITS.body.max)
    expect(a.warnings.join(' ')).toMatch(/superaba/)
  })

  it('más de 15 secciones: se importan 15 y se avisa', () => {
    const lines = [L('Título del artículo', 20)]
    for (let i = 0; i < 20; i++) lines.push(L(`Sección ${i}`, 16, 1), L(`${BODY} ${i}.`, 12, 0.3))
    const a = structureLines(lines)
    expect(a.sections).toHaveLength(LIMITS.sections.max)
    expect(a.warnings.join(' ')).toMatch(/15 secciones/)
  })

  it('un título de más de 120 caracteres se acorta y se avisa; uno demasiado corto usa el nombre del archivo', () => {
    const long = structureLines([L('T'.repeat(200), 24), L(BODY.repeat(6), 12, 1)])
    expect(long.title.length).toBe(LIMITS.title.max)
    expect(long.warnings.join(' ')).toMatch(/demasiado largo/)
    const short = structureLines([L('Hola', 24), L(BODY, 12, 1)], 'plan-de-soporte.pdf')
    expect(short.title).toBe('plan de soporte')
  })

  it('todo lo que devuelve cumple los límites aunque la entrada sea disparatada', () => {
    const lines = [L('A'.repeat(300), 30), ...Array.from({ length: 200 }, (_, i) => L(i % 5 === 0 ? `H${i}` : `- paso ${i} ${'z'.repeat(i)}`, i % 5 === 0 ? 18 : 12, i % 3))]
    const a = structureLines(lines)
    expect(a.title.length).toBeLessThanOrEqual(LIMITS.title.max)
    expect(a.sections.length).toBeLessThanOrEqual(LIMITS.sections.max)
    for (const s of a.sections) {
      expect(s.heading.length).toBeLessThanOrEqual(LIMITS.heading.max)
      expect(s.body.length).toBeLessThanOrEqual(LIMITS.body.max)
      expect(s.steps.length).toBeLessThanOrEqual(LIMITS.steps.max)
      expect(s.steps.every((x) => x.length <= LIMITS.step.max)).toBe(true)
      expect(s.body.trim() !== '' || s.steps.length > 0).toBe(true)
    }
  })
})

describe('cabeceras, pies y números de página', () => {
  it('se descartan los números de página y lo que se repite en la mayoría de las páginas', () => {
    const page = (n: number) => [L('Velia · Documento interno', 9, 0, n), L(`${['Uno','Dos','Tres','Cuatro'][n - 1]} es el contenido propio de esta página.`, 12, 1, n), L(`Página ${n} de 4`, 9, 1, n)]
    const kept = removeBoilerplate([1, 2, 3, 4].flatMap(page))
    expect(kept.map((l) => l.text)).toEqual(['Uno', 'Dos', 'Tres', 'Cuatro'].map((w) => `${w} es el contenido propio de esta página.`))
  })

  it('con menos de 3 páginas no se descarta texto repetido (podría ser contenido)', () => {
    const lines = [L('Aviso', 12, 0, 1), L('Aviso', 12, 0, 2)]
    expect(removeBoilerplate(lines)).toHaveLength(2)
  })

  it('el tamaño de cuerpo es el más frecuente por caracteres', () => {
    expect(bodyFontSize([L('Título largo', 24), L('x'.repeat(200), 11), L('y'.repeat(50), 14)])).toBe(11)
  })

  it('sin líneas largas, el menor tamaño con peso suficiente (un pie diminuto no cuenta; un encabezado grande tampoco)', () => {
    const short = [L('Sección A', 16), L('Sección B', 16), L('Paso uno.', 12), L('Paso dos.', 12), L('Paso tres.', 12), L('pie', 8)]
    expect(bodyFontSize(short)).toBe(12)
  })
})
