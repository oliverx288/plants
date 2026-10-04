import type { HTMLAttributes } from 'react'
import styles from './Badge.module.css'

export function Badge({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={[styles.badge, className].filter(Boolean).join(' ')} {...rest} />
}
