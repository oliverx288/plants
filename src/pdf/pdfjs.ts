import type { PdfJsLib } from './extract'

/**
 * Carga pdf.js (y su worker) solo cuando la editora entra en «Importar PDF»: no pesa en el resto de la aplicación.
 * El worker se sirve desde el propio dominio (Vite lo empaqueta), así que cumple la CSP (`script-src 'self'`).
 */
export async function loadPdfJs(): Promise<PdfJsLib> {
  const [lib, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  lib.GlobalWorkerOptions.workerSrc = worker.default
  return lib as unknown as PdfJsLib
}
