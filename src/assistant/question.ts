export const MIN_QUESTION_LENGTH = 3
export const MAX_QUESTION_LENGTH = 300

export type QuestionCheck = { ok: true; value: string } | { ok: false; error: string }

/**
 * Valida y limpia lo que escribe el agente antes de enviarlo.
 * Se eliminan los caracteres de control y se colapsan los espacios. La base de datos repite
 * la validación de longitud (CHECK), así que esto es comodidad, no la barrera de seguridad.
 */
export function normalizeQuestion(raw: string): QuestionCheck {
  const value = [...raw]
    .filter((char) => char.charCodeAt(0) >= 32 || char === '\n' || char === '\t')
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

  if (value.length < MIN_QUESTION_LENGTH) {
    return { ok: false, error: `Escribe al menos ${MIN_QUESTION_LENGTH} caracteres.` }
  }
  if (value.length > MAX_QUESTION_LENGTH) {
    return { ok: false, error: `La duda es demasiado larga (máximo ${MAX_QUESTION_LENGTH} caracteres).` }
  }
  return { ok: true, value }
}
