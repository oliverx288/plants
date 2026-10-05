// Orden "de recorrido" del cliente: desde la puesta en marcha hasta el mantenimiento.
// Las categorías nuevas que cree el editor van después, por orden alfabético.
const CATEGORY_ORDER = [
  'Primera configuración',
  'GPS y ubicación',
  'Batería y carga',
  'Botón SOS',
  'Llamadas',
  'App del familiar',
  'Notificaciones',
  'Suscripción',
  'Actualizaciones',
]

export interface CategoryGroup<T> {
  category: string
  items: T[]
}

function categoryRank(category: string): number {
  const index = CATEGORY_ORDER.indexOf(category)
  return index === -1 ? CATEGORY_ORDER.length : index
}

/** Agrupa por categoría (en orden de recorrido) y ordena los artículos de cada una por título. */
export function groupByCategory<T extends { category: string; title: string }>(items: T[]): CategoryGroup<T>[] {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const list = groups.get(item.category) ?? []
    list.push(item)
    groups.set(item.category, list)
  }
  return [...groups.entries()]
    .map(([category, list]) => ({ category, items: [...list].sort((a, b) => a.title.localeCompare(b.title, 'es')) }))
    .sort((a, b) => categoryRank(a.category) - categoryRank(b.category) || a.category.localeCompare(b.category, 'es'))
}

/** Tonos de las etiquetas de categoría (ver --tag-* en design/tokens.css). Solo presentación. */
export const CATEGORY_TONES = ['violet', 'green', 'amber', 'blue', 'pink', 'slate'] as const
export type CategoryTone = (typeof CATEGORY_TONES)[number]

/**
 * Tono de color de una categoría. Las categorías conocidas siguen el orden de recorrido (colores contiguos
 * distintos); las nuevas que cree el editor usan un hash estable del nombre, para que una misma categoría tenga
 * siempre el mismo color.
 */
export function categoryTone(category: string): CategoryTone {
  const known = CATEGORY_ORDER.indexOf(category)
  if (known !== -1) return CATEGORY_TONES[known % CATEGORY_TONES.length]
  let hash = 0
  for (const char of category) hash = (hash * 31 + char.codePointAt(0)!) >>> 0
  return CATEGORY_TONES[hash % CATEGORY_TONES.length]
}
