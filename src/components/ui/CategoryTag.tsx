import { categoryTone } from '../../lib/categories'
import styles from './CategoryTag.module.css'

/** Etiqueta de categoría con un color estable por categoría. El texto es siempre el nombre (el color no es el único canal). */
export function CategoryTag({ category }: { category: string }) {
  return <span className={[styles.tag, styles[categoryTone(category)]].join(' ')}>{category}</span>
}
