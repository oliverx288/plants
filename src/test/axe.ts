import axe from 'axe-core'

/**
 * Auditoría de accesibilidad con axe-core sobre el DOM renderizado (jsdom).
 * Comprueba estructura, ARIA, etiquetas de formulario, orden de encabezados, nombres accesibles, etc.
 * NO comprueba el contraste de color (jsdom no calcula estilos reales): eso se midió en un navegador real.
 */
export async function a11yViolations(root: Element = document.body): Promise<string[]> {
  const result = await axe.run(root, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    rules: { 'color-contrast': { enabled: false } },
  })
  return result.violations.map(
    (v) => `${v.id} [${v.impact}]: ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`,
  )
}
