/**
 * Formatea una fecha AAAA-MM-DD en español ("5 de septiembre de 2026").
 * Se fuerza UTC: una fecha sin hora se interpreta como medianoche UTC y, con la zona local,
 * podría mostrarse como el día anterior.
 */
export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return isoDate
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeZone: 'UTC' }).format(date)
}
