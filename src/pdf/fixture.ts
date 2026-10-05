/*
 * Generador de PDFs mínimos para las PRUEBAS (no se usa en la aplicación). Escribe un PDF real, con su tabla de
 * referencias, con texto en Helvetica a distintos tamaños: así se prueba la extracción con pdf.js de verdad, no con
 * datos inventados.
 */
export interface FixtureText {
  text: string
  size: number
  /** Posición desde la esquina inferior izquierda (puntos). */
  x: number
  y: number
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

/** WinAnsi: los caracteres españoles (á, ñ…) caben en un byte (Latin-1); viñeta y rayas tienen su propio código. */
const WIN_ANSI_EXTRA: Record<string, number> = { '•': 0x95, '–': 0x96, '—': 0x97 }
const latin1 = (s: string) => Uint8Array.from(s, (c) => WIN_ANSI_EXTRA[c] ?? c.charCodeAt(0) & 0xff)

export function buildPdf(pages: FixtureText[][]): Uint8Array {
  const chunks: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0
  const push = (s: string) => {
    const bytes = latin1(s)
    chunks.push(bytes)
    length += bytes.length
  }
  const obj = (n: number, body: string) => {
    offsets[n] = length
    push(`${n} 0 obj\n${body}\nendobj\n`)
  }

  const pageCount = pages.length
  // Objetos: 1 catálogo, 2 páginas, 3 fuente, 4+2i página i, 5+2i contenido de la página i
  push('%PDF-1.4\n')
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + 2 * i} 0 R`).join(' ')}] /Count ${pageCount} >>`)
  obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  pages.forEach((items, i) => {
    const stream = items
      .map((t) => `BT /F1 ${t.size} Tf ${t.x} ${t.y} Td (${esc(t.text)}) Tj ET`)
      .join('\n')
    obj(4 + 2 * i, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + 2 * i} 0 R >>`)
    obj(5 + 2 * i, `<< /Length ${latin1(stream).length} >>\nstream\n${stream}\nendstream`)
  })

  const total = 4 + 2 * pageCount
  const xrefAt = length
  push(`xref\n0 ${total}\n0000000000 65535 f \n`)
  for (let n = 1; n < total; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`)

  const out = new Uint8Array(length)
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}

/**
 * Compone una página a partir de líneas «de arriba abajo» con su tamaño y el espacio en blanco previo
 * (0 = interlineado normal, 1 = una línea en blanco).
 */
export function layoutPage(lines: { text: string; size?: number; gap?: number }[], top = 780): FixtureText[] {
  const out: FixtureText[] = []
  let y = top
  for (const [i, l] of lines.entries()) {
    const size = l.size ?? 12
    if (i > 0) y -= size * 1.2 + (l.gap ?? 0) * size
    out.push({ text: l.text, size, x: 56, y })
  }
  return out
}
