import type { PdfLine } from './structure'

/*
 * Extracción de texto de un PDF EN EL NAVEGADOR (pdf.js). El archivo no se sube a ningún sitio: se lee en la
 * máquina de la editora y solo el texto revisado llega a la base de datos, por la misma función (save_article) y las
 * mismas políticas RLS que cualquier otro artículo.
 */

export const PDF_LIMITS = {
  /** Un artículo de soporte no necesita más; además acota el trabajo de procesar un archivo no fiable. */
  maxBytes: 10 * 1024 * 1024,
  maxPages: 50,
  /** Por debajo de esto el PDF no tiene texto seleccionable (probablemente es un escaneado). */
  minChars: 20,
} as const

/** Error con mensaje listo para enseñar a la editora. */
export class PdfImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PdfImportError'
  }
}

/** Parte mínima de pdf.js que usamos; permite inyectar la compilación adecuada (navegador / pruebas en Node). */
export interface PdfJsLib {
  getDocument(params: Record<string, unknown>): {
    promise: Promise<{
      numPages: number
      getPage(n: number): Promise<{ getTextContent(): Promise<{ items: unknown[] }> }>
    }>
    destroy(): Promise<void>
  }
}

interface TextItem {
  str: string
  transform: number[]
  width: number
  height: number
}

const isTextItem = (item: unknown): item is TextItem => {
  const i = item as Partial<TextItem>
  return typeof i?.str === 'string' && Array.isArray(i.transform) && i.transform.length >= 6
}

/** Cabecera de un PDF: se comprueba el contenido, no solo la extensión ni el tipo que declara el navegador. */
export function looksLikePdf(bytes: Uint8Array): boolean {
  const head = String.fromCharCode(...bytes.slice(0, 1024))
  return head.includes('%PDF-')
}

/** Agrupa los fragmentos de texto de una página en líneas (por posición vertical), de arriba abajo. */
export function itemsToLines(items: unknown[], page: number): PdfLine[] {
  const texts = items.filter(isTextItem).filter((i) => i.str.trim() !== '' || i.width > 0)
  const rows: { y: number; size: number; items: TextItem[] }[] = []
  for (const item of texts) {
    const y = item.transform[5]
    const size = item.height || Math.hypot(item.transform[2], item.transform[3]) || 1
    const row = rows.find((r) => Math.abs(r.y - y) <= Math.max(2, r.size * 0.3))
    if (row) {
      row.items.push(item)
      row.size = Math.max(row.size, size)
    } else rows.push({ y, size, items: [item] })
  }
  rows.sort((a, b) => b.y - a.y)

  const lines: PdfLine[] = []
  let previousY: number | null = null
  for (const row of rows) {
    const sorted = [...row.items].sort((a, b) => a.transform[4] - b.transform[4])
    let text = ''
    let endX = 0
    for (const item of sorted) {
      const gap = item.transform[4] - endX
      if (text && !text.endsWith(' ') && !item.str.startsWith(' ') && gap > row.size * 0.15) text += ' '
      text += item.str
      endX = item.transform[4] + item.width
    }
    text = text.replace(/\s+/g, ' ').trim()
    if (!text) continue
    // 1,2 = interlineado normal; lo que sobra es espacio en blanco (0 = líneas seguidas, 1 = una línea en blanco).
    const gap = previousY === null ? 0 : Math.max(0, (previousY - row.y - row.size * 1.2) / row.size)
    lines.push({ text, size: Math.round(row.size * 10) / 10, page, gap: Math.round(gap * 100) / 100 })
    previousY = row.y
  }
  return lines
}

export async function extractPdfLines(
  data: Uint8Array,
  loadLib: () => Promise<PdfJsLib>,
): Promise<{ lines: PdfLine[]; pages: number }> {
  if (data.byteLength === 0) throw new PdfImportError('El archivo está vacío.')
  if (data.byteLength > PDF_LIMITS.maxBytes) {
    throw new PdfImportError(`El archivo pesa demasiado (máximo ${PDF_LIMITS.maxBytes / 1024 / 1024} MB).`)
  }
  if (!looksLikePdf(data)) throw new PdfImportError('El archivo no es un PDF válido.')

  const lib = await loadLib()
  // isEvalSupported:false → pdf.js no evalúa código generado (la vulnerabilidad CVE-2024-4367 se explotaba por ahí);
  // enableXfa:false → no se procesan formularios XFA.
  const task = lib.getDocument({ data: data.slice(), isEvalSupported: false, enableXfa: false, useSystemFonts: false })
  try {
    const pdf = await task.promise
    if (pdf.numPages > PDF_LIMITS.maxPages) {
      throw new PdfImportError(
        `El PDF tiene ${pdf.numPages} páginas (máximo ${PDF_LIMITS.maxPages}). Divídelo en partes más pequeñas.`,
      )
    }
    const lines: PdfLine[] = []
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      lines.push(...itemsToLines((await page.getTextContent()).items, n))
    }
    const chars = lines.reduce((sum, l) => sum + l.text.length, 0)
    if (chars < PDF_LIMITS.minChars) {
      throw new PdfImportError(
        'El PDF no contiene texto seleccionable (parece un documento escaneado). Esta versión no hace OCR: ' +
          'escribe el artículo a mano o usa un PDF con texto.',
      )
    }
    return { lines, pages: pdf.numPages }
  } catch (error) {
    if (error instanceof PdfImportError) throw error
    const name = (error as { name?: string })?.name
    if (name === 'PasswordException') throw new PdfImportError('El PDF está protegido con contraseña. Quita la protección y vuelve a subirlo.')
    if (name === 'InvalidPDFException' || name === 'FormatError') throw new PdfImportError('El archivo no es un PDF válido o está dañado.')
    throw new PdfImportError('No se pudo leer el PDF. Comprueba que no esté dañado e inténtalo de nuevo.')
  } finally {
    void task.destroy().catch(() => {})
  }
}
