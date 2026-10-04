import type { HTMLAttributes } from 'react'
import styles from './Alert.module.css'

type Tone = 'info' | 'success' | 'warning' | 'danger'

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone
  title?: string
}

// El color nunca es el único canal: cada tono lleva un icono de texto y, si procede, título.
const ICONS: Record<Tone, string> = { info: 'ℹ', success: '✓', warning: '!', danger: '✕' }

export function Alert({ tone = 'info', title, children, className, ...rest }: AlertProps) {
  // danger/warning se anuncian de inmediato; el resto de forma educada.
  const role = tone === 'danger' || tone === 'warning' ? 'alert' : 'status'
  return (
    <div role={role} className={[styles.alert, styles[tone], className].filter(Boolean).join(' ')} {...rest}>
      <span className={styles.icon} aria-hidden="true">
        {ICONS[tone]}
      </span>
      <div>
        {title && <strong className={styles.title}>{title}</strong>}
        {children}
      </div>
    </div>
  )
}
