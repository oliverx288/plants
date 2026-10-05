import { emptySection, newSectionKey, todayIso } from '../editor/draft'
import type { ArticleDraft } from '../editor/draft'
import { extractPdfLines } from './extract'
import { loadPdfJs } from './pdfjs'
import { structureLines } from './structure'
import type { ImportedArticle } from './structure'

/** Lee un PDF en el navegador y propone un artículo. Lanza PdfImportError con un mensaje para la editora si no puede. */
export async function importPdf(file: File): Promise<ImportedArticle> {
  const data = new Uint8Array(await file.arrayBuffer())
  const { lines } = await extractPdfLines(data, loadPdfJs)
  return structureLines(lines, file.name)
}

/** Borrador para el formulario del editor. La categoría queda vacía: la elige la editora (es obligatoria). */
export function importedToDraft(article: ImportedArticle, today = todayIso()): ArticleDraft {
  return {
    title: article.title,
    category: '',
    lastReviewedAt: today,
    sections:
      article.sections.length > 0
        ? article.sections.map((s) => ({ key: newSectionKey(), heading: s.heading, body: s.body, stepsText: s.steps.join('\n') }))
        : [emptySection()],
  }
}
