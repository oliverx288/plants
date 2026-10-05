import { LIMITS } from '../editor/draft'

/*
 * De las líneas de texto de un PDF a un borrador de artículo (título + secciones con texto y pasos).
 *
 * Función PURA y determinista: sin PDF, sin red, sin base de datos. Es una HEURÍSTICA (un PDF no guarda "esto es un
 * título", solo texto con un tamaño y una posición), así que puede equivocarse. Por eso el resultado NUNCA se publica
 * solo: se muestra como borrador para que la editora lo revise (ver ImportPdfPage).
 *
 * Reglas:
 *  - Cabeceras y pies repetidos en varias páginas y los números de página se descartan.
 *  - Título: el texto más grande de la primera página, si es claramente mayor que el cuerpo; si no, el nombre del archivo.
 *  - Encabezado de sección: línea corta con letra mayor que el cuerpo; si el documento no tiene tamaños distintos,
 *    líneas cortas tipo «1. Qué ocurre» o en MAYÚSCULAS.
 *  - Pasos: líneas que empiezan por viñeta (•, -, –, *) o numeración («1.», «2)», «Paso 3»).
 *  - Todo respeta los límites de la base de datos (LIMITS): lo que no cabe se reparte en secciones de continuación o,
 *    si es demasiado, se corta y SE AVISA.
 */

export interface PdfLine {
  text: string
  /** Tamaño de letra (alto en puntos). */
  size: number
  /** Página (empieza en 1). */
  page: number
  /** Espacio vertical en blanco antes de la línea, en múltiplos del tamaño de letra. 0 si es la primera de la página. */
  gap: number
}

export interface ImportedSection {
  heading: string
  body: string
  steps: string[]
}

export interface ImportedArticle {
  title: string
  sections: ImportedSection[]
  /** Avisos para la editora: qué se ha cortado o no se ha podido interpretar. */
  warnings: string[]
}

const HEADING_SIZE_RATIO = 1.12
const TITLE_SIZE_RATIO = 1.15
/** Espacio en blanco (en múltiplos del tamaño de letra) a partir del cual una línea empieza un párrafo nuevo. */
const PARAGRAPH_GAP = 0.6
const MAX_HEADING_CHARS = 100
const MAX_FALLBACK_HEADING_CHARS = 70

// \uF0B7 y \uF0A7: viñetas de la fuente Symbol de Word, que los PDF exportados desde Word conservan tal cual.
const BULLET = /^\s*(?:[•·▪●○◦‣⁃*\-–—\uF0B7\uF0A7])\s+/
const NUMBERED = /^\s*(?:(?:paso\s+)?\d{1,2}\s*[.)\-:]|[a-z]\)|\(\d{1,2}\))\s+/i
const PAGE_NUMBER = /^(?:p[áa]g(?:ina)?\.?\s*)?\d{1,4}(?:\s*(?:de|\/)\s*\d{1,4})?$/i
const SENTENCE_END = /[.!?:;…»")\]]$/

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()

function isStepStart(text: string): boolean {
  return BULLET.test(text) || NUMBERED.test(text)
}

function stripStepMarker(text: string): string {
  return normalize(text.replace(BULLET, '').replace(NUMBERED, ''))
}

const LONG_LINE_CHARS = 30
const MIN_SIZE_SHARE = 0.15

/**
 * Tamaño de letra del cuerpo del texto.
 *  - Normal: el más frecuente (por nº de caracteres) entre las líneas largas: los encabezados son cortos, así que
 *    no pueden «ganar» a un cuerpo de texto aunque el artículo sea breve.
 *  - Si no hay líneas largas (artículo hecho solo de frases cortas o viñetas): el MENOR tamaño que tenga al menos un
 *    15 % de los caracteres, para que un pie de página diminuto no cuente como cuerpo ni un encabezado grande tampoco.
 */
export function bodyFontSize(lines: PdfLine[]): number {
  const weigh = (subset: PdfLine[]) => {
    const weight = new Map<number, number>()
    for (const line of subset) {
      const size = Math.round(line.size * 2) / 2
      weight.set(size, (weight.get(size) ?? 0) + line.text.length)
    }
    return weight
  }
  const long = lines.filter((l) => l.text.length >= LONG_LINE_CHARS)
  if (long.length > 0) {
    let best = 0
    let bestWeight = -1
    for (const [size, w] of weigh(long)) {
      if (w > bestWeight || (w === bestWeight && size < best)) {
        best = size
        bestWeight = w
      }
    }
    return best
  }
  const weight = weigh(lines)
  const total = [...weight.values()].reduce((a, b) => a + b, 0)
  const candidates = [...weight].filter(([, w]) => w >= total * MIN_SIZE_SHARE).map(([size]) => size)
  return candidates.length > 0 ? Math.min(...candidates) : 0
}

/** Quita números de página y las líneas que se repiten en la mayoría de las páginas (cabeceras y pies). */
export function removeBoilerplate(lines: PdfLine[]): PdfLine[] {
  const pages = new Set(lines.map((l) => l.page)).size
  const pagesWith = new Map<string, Set<number>>()
  for (const line of lines) {
    const key = normalize(line.text).replace(/\d+/g, '#').toLowerCase()
    if (!pagesWith.has(key)) pagesWith.set(key, new Set())
    pagesWith.get(key)!.add(line.page)
  }
  return lines.filter((line) => {
    const text = normalize(line.text)
    if (!text || PAGE_NUMBER.test(text)) return false
    const key = text.replace(/\d+/g, '#').toLowerCase()
    return !(pages >= 3 && (pagesWith.get(key)?.size ?? 0) > pages / 2)
  })
}

function titleFromFilename(filename: string): string {
  return normalize(filename.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '))
}

function clamp(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}

/** Une líneas de un mismo párrafo: arregla las palabras partidas con guion al final de línea. */
function joinLines(lines: string[]): string {
  let out = ''
  for (const raw of lines) {
    const line = normalize(raw)
    if (!out) out = line
    else if (/[a-záéíóúüñ]-$/i.test(out) && /^[a-záéíóúüñ]/.test(line)) out = out.slice(0, -1) + line
    else out = `${out} ${line}`
  }
  return out
}

interface RawSection {
  heading: string
  /** Párrafos de texto (cada uno es una lista de líneas). */
  paragraphs: string[][]
  steps: string[][]
}

export function structureLines(rawLines: PdfLine[], filename = 'documento.pdf'): ImportedArticle {
  const warnings: string[] = []
  const lines = removeBoilerplate(rawLines).map((l) => ({ ...l, text: normalize(l.text) }))
  const body = bodyFontSize(lines)

  // ---- Título -------------------------------------------------------------------------------------------------
  let title = ''
  let start = 0
  const firstPage = lines.filter((l) => l.page === lines[0]?.page)
  const maxSize = Math.max(0, ...firstPage.map((l) => l.size))
  if (lines.length > 0 && maxSize >= body * TITLE_SIZE_RATIO && firstPage.some((l) => l.size === maxSize)) {
    const parts: string[] = []
    let i = lines.findIndex((l) => l.page === firstPage[0].page && l.size === maxSize)
    while (i < lines.length && lines[i].size === maxSize && lines[i].page === firstPage[0].page) {
      parts.push(lines[i].text)
      i++
    }
    title = joinLines(parts)
    start = i
    // Si el título ocupa el principio del documento, las líneas anteriores (p. ej. un logotipo) se ignoran.
  }
  if (title.length < LIMITS.title.min) {
    title = titleFromFilename(filename)
    start = 0
    warnings.push('No se ha podido detectar el título en el PDF: se ha usado el nombre del archivo. Revísalo.')
  }
  if (title.length < LIMITS.title.min) title = 'Artículo importado'
  if (title.length > LIMITS.title.max) {
    title = clamp(title, LIMITS.title.max)
    warnings.push('El título era demasiado largo y se ha acortado.')
  }

  const content = lines.slice(start)

  // ---- Encabezados --------------------------------------------------------------------------------------------
  const bySize = (l: PdfLine) => l.size >= body * HEADING_SIZE_RATIO && l.text.length <= MAX_HEADING_CHARS && !isStepStart(l.text)
  let isHeading = bySize
  if (!content.some(bySize)) {
    // Sin tamaños distintos (PDF de texto uniforme): líneas cortas «1. Título» o en MAYÚSCULAS, sin punto final.
    isHeading = (l) => {
      if (l.text.length > MAX_FALLBACK_HEADING_CHARS || SENTENCE_END.test(l.text)) return false
      const upper = l.text === l.text.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3}/.test(l.text)
      const numberedTitle = /^\d{1,2}[.)]\s+\p{Lu}/u.test(l.text) && l.gap >= PARAGRAPH_GAP
      return upper || numberedTitle
    }
  }

  const raw: RawSection[] = []
  let current: RawSection | null = null
  // Líneas de antes del primer encabezado → sección «Contenido».
  const ensureSection = (heading = 'Contenido') => {
    if (!current) {
      current = { heading, paragraphs: [], steps: [] }
      raw.push(current)
    }
    return current
  }

  let lastKind: 'paragraph' | 'step' | null = null
  let previous: PdfLine | null = null
  for (const line of content) {
    const before = previous
    previous = line
    if (isHeading(line)) {
      const heading = stripStepMarker(line.text) || line.text
      // Encabezado que ocupa varias líneas seguidas (mismo tamaño, sin hueco): es un solo encabezado.
      const continuesHeading =
        current && before && lastKind === null && isHeading(before) && before.size === line.size && line.gap < PARAGRAPH_GAP
      if (current && continuesHeading) current.heading = joinLines([current.heading, heading])
      else {
        current = { heading, paragraphs: [], steps: [] }
        raw.push(current)
      }
      lastKind = null
      continue
    }
    const section = ensureSection()
    if (isStepStart(line.text)) {
      section.steps.push([stripStepMarker(line.text)])
      lastKind = 'step'
      continue
    }
    const lastStep = section.steps[section.steps.length - 1]
    const continuesStep =
      lastKind === 'step' && lastStep && line.gap < PARAGRAPH_GAP && !SENTENCE_END.test(lastStep[lastStep.length - 1])
    if (continuesStep) {
      lastStep.push(line.text)
      continue
    }
    const lastParagraph = section.paragraphs[section.paragraphs.length - 1]
    if (lastKind === 'paragraph' && lastParagraph && line.gap < PARAGRAPH_GAP) lastParagraph.push(line.text)
    else section.paragraphs.push([line.text])
    lastKind = 'paragraph'
  }

  // ---- A secciones respetando los límites de la base de datos ---------------------------------------------------
  const sections: ImportedSection[] = []
  let truncatedSteps = 0
  for (const rs of raw) {
    const paragraphs = rs.paragraphs.map(joinLines).filter(Boolean)
    const steps = rs.steps.map(joinLines).filter(Boolean).map((s) => {
      if (s.length > LIMITS.step.max) truncatedSteps++
      return clamp(s, LIMITS.step.max)
    })
    if (paragraphs.length === 0 && steps.length === 0) continue // encabezado sin contenido

    // Párrafos → bloques de ≤ LIMITS.body.max caracteres; pasos → bloques de ≤ LIMITS.steps.max.
    const bodies: string[] = []
    let bodyText = ''
    for (let p of paragraphs) {
      if (p.length > LIMITS.body.max) {
        warnings.push(`Un párrafo de «${clamp(rs.heading, 40)}» superaba ${LIMITS.body.max} caracteres y se ha cortado.`)
        p = clamp(p, LIMITS.body.max)
      }
      const joined = bodyText ? `${bodyText}\n\n${p}` : p
      if (joined.length > LIMITS.body.max) {
        bodies.push(bodyText)
        bodyText = p
      } else bodyText = joined
    }
    if (bodyText) bodies.push(bodyText)
    const stepChunks: string[][] = []
    for (let i = 0; i < steps.length; i += LIMITS.steps.max) stepChunks.push(steps.slice(i, i + LIMITS.steps.max))

    const parts = Math.max(bodies.length, stepChunks.length)
    for (let i = 0; i < parts; i++) {
      sections.push({
        heading: clamp(i === 0 ? rs.heading : `${rs.heading} (continuación)`, LIMITS.heading.max),
        body: bodies[i] ?? '',
        steps: stepChunks[i] ?? [],
      })
    }
  }
  if (truncatedSteps > 0) {
    warnings.push(`${truncatedSteps} paso(s) superaban ${LIMITS.step.max} caracteres y se han cortado. Revísalos.`)
  }
  if (sections.length > LIMITS.sections.max) {
    warnings.push(
      `El PDF da más de ${LIMITS.sections.max} secciones (el máximo de un artículo). Se han importado las primeras ${LIMITS.sections.max}: ` +
        'divide el resto en otro artículo.',
    )
    sections.length = LIMITS.sections.max
  }
  if (sections.length === 0) {
    warnings.push('No se ha encontrado contenido que importar.')
  } else if (!raw.some((r) => r.heading !== 'Contenido')) {
    warnings.push('No se han detectado encabezados: todo el texto está en una sola sección. Divídela como prefieras.')
  }

  return { title, sections, warnings }
}
