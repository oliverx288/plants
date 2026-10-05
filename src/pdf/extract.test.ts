import { describe, expect, it } from 'vitest'
import { PDF_LIMITS, PdfImportError, extractPdfLines, itemsToLines, looksLikePdf } from './extract'
import type { PdfJsLib } from './extract'
import { buildPdf, layoutPage } from './fixture'
import { structureLines } from './structure'

// En Node se usa la compilación «legacy» de pdf.js (la normal necesita APIs del navegador).
const loadLib = async () => (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsLib

const manual = buildPdf([
  layoutPage([
    { text: 'El reloj no carga', size: 24 },
    { text: 'Qué ocurre', size: 16, gap: 1 },
    { text: 'Al conectar el cable no aparece el icono de carga en la pantalla.', gap: 0.4 },
    { text: 'Qué comprobar primero', size: 16, gap: 1 },
    { text: '1. Usa la base y el cable originales.', gap: 0.4 },
    { text: '2. Limpia los contactos con un paño seco.' },
  ]),
  layoutPage([
    { text: 'Si sigue fallando', size: 16 },
    { text: '• Reinicia el reloj manteniendo pulsado el botón lateral.', gap: 0.4 },
    { text: '• Abre una incidencia con el número de serie (áéíóú ñ).' },
  ]),
])

describe('extracción con pdf.js sobre un PDF real', () => {
  it('lee el texto de todas las páginas, con tamaño y orden de arriba abajo, incluidos acentos y ñ', async () => {
    const { lines, pages } = await extractPdfLines(manual, loadLib)
    expect(pages).toBe(2)
    expect(lines.map((l) => [l.page, l.size, l.text])).toEqual([
      [1, 24, 'El reloj no carga'],
      [1, 16, 'Qué ocurre'],
      [1, 12, 'Al conectar el cable no aparece el icono de carga en la pantalla.'],
      [1, 16, 'Qué comprobar primero'],
      [1, 12, '1. Usa la base y el cable originales.'],
      [1, 12, '2. Limpia los contactos con un paño seco.'],
      [2, 16, 'Si sigue fallando'],
      [2, 12, '• Reinicia el reloj manteniendo pulsado el botón lateral.'],
      [2, 12, '• Abre una incidencia con el número de serie (áéíóú ñ).'],
    ])
  })

  it('PDF → líneas → artículo: título, secciones, texto y pasos', async () => {
    const { lines } = await extractPdfLines(manual, loadLib)
    const article = structureLines(lines, 'manual.pdf')
    expect(article.title).toBe('El reloj no carga')
    expect(article.sections.map((s) => s.heading)).toEqual(['Qué ocurre', 'Qué comprobar primero', 'Si sigue fallando'])
    expect(article.sections[0].body).toBe('Al conectar el cable no aparece el icono de carga en la pantalla.')
    expect(article.sections[1].steps).toEqual(['Usa la base y el cable originales.', 'Limpia los contactos con un paño seco.'])
    expect(article.sections[2].steps[1]).toBe('Abre una incidencia con el número de serie (áéíóú ñ).')
    expect(article.warnings).toEqual([])
  })
})

describe('extracción: entradas no válidas (mensajes para la editora)', () => {
  const fails = (data: Uint8Array) => extractPdfLines(data, loadLib).then(() => null, (e: unknown) => e)

  it('archivo vacío', async () => {
    const e = await fails(new Uint8Array())
    expect(e).toBeInstanceOf(PdfImportError)
    expect((e as Error).message).toMatch(/vacío/)
  })

  it('un archivo que no es PDF, aunque se llame .pdf, se rechaza por su contenido', async () => {
    const e = await fails(new TextEncoder().encode('<html><script>alert(1)</script></html>'))
    expect((e as Error).message).toMatch(/no es un PDF/)
  })

  it('más de 10 MB', async () => {
    const e = await fails(new Uint8Array(PDF_LIMITS.maxBytes + 1))
    expect((e as Error).message).toMatch(/pesa demasiado/)
  })

  it('un PDF dañado (cabecera correcta, contenido roto) da un mensaje claro, sin detalles internos', async () => {
    const e = await fails(new TextEncoder().encode('%PDF-1.4\nesto no es un pdf de verdad'))
    expect(e).toBeInstanceOf(PdfImportError)
    expect((e as Error).message).toMatch(/PDF/)
    expect((e as Error).message).not.toMatch(/Exception|stack|undefined/)
  })

  it('un PDF sin texto (escaneado) se explica y no se inventa nada', async () => {
    const e = await fails(buildPdf([[]]))
    expect((e as Error).message).toMatch(/escaneado/)
  })

  it('más de 50 páginas', async () => {
    const e = await fails(buildPdf(Array.from({ length: PDF_LIMITS.maxPages + 1 }, () => layoutPage([{ text: 'Texto de relleno de la página.' }]))))
    expect((e as Error).message).toMatch(/50 páginas|máximo 50/)
  })
})

describe('itemsToLines (agrupar fragmentos en líneas)', () => {
  const item = (str: string, x: number, y: number, size = 12, width = str.length * 6) => ({ str, transform: [size, 0, 0, size, x, y], width, height: size })

  it('une fragmentos de la misma línea por orden de x y separa palabras si hay hueco', () => {
    const lines = itemsToLines([item('mundo', 100, 700), item('Hola', 50, 700)], 1)
    expect(lines.map((l) => l.text)).toEqual(['Hola mundo'])
  })

  it('no mete un espacio entre fragmentos pegados (una palabra partida en dos fragmentos)', () => {
    expect(itemsToLines([item('Hol', 50, 700), item('a', 50 + 18, 700)], 1)[0].text).toBe('Hola')
  })

  it('ordena de arriba abajo y calcula el espacio en blanco previo', () => {
    const lines = itemsToLines([item('abajo', 50, 600), item('arriba', 50, 700), item('medio', 50, 685.6)], 1)
    expect(lines.map((l) => l.text)).toEqual(['arriba', 'medio', 'abajo'])
    expect(lines[0].gap).toBe(0)
    expect(lines[1].gap).toBe(0) // 14,4 pt de separación = interlineado normal de 12 pt
    expect(lines[2].gap).toBeGreaterThan(5)
  })

  it('ignora elementos que no son texto y los fragmentos vacíos', () => {
    expect(itemsToLines([{ type: 'beginMarkedContent' }, item('   ', 50, 700, 12, 0), item('Texto', 50, 650)], 1).map((l) => l.text)).toEqual(['Texto'])
  })
})

describe('looksLikePdf', () => {
  it('mira el contenido (la cabecera %PDF-), no la extensión', () => {
    expect(looksLikePdf(new TextEncoder().encode('%PDF-1.7\n...'))).toBe(true)
    expect(looksLikePdf(new TextEncoder().encode('PK\u0003\u0004 un zip'))).toBe(false)
    expect(looksLikePdf(new Uint8Array())).toBe(false)
  })
})
