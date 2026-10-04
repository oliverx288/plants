import type { ElementType, HTMLAttributes } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Etiqueta HTML semántica (por defecto div). */
  as?: ElementType
}

export function Card({ as: Tag = 'div', className, ...rest }: CardProps) {
  return <Tag className={[styles.card, className].filter(Boolean).join(' ')} {...rest} />
}
