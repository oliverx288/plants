import { Link } from 'react-router-dom'
import type { LinkProps } from 'react-router-dom'
import styles from './Button.module.css'

interface ButtonLinkProps extends LinkProps {
  variant?: 'primary' | 'secondary' | 'danger'
}

/** Enlace con aspecto de botón (para navegar; un <button> es para acciones). */
export function ButtonLink({ variant = 'primary', className, ...rest }: ButtonLinkProps) {
  return <Link className={[styles.button, styles[variant], styles.link, className].filter(Boolean).join(' ')} {...rest} />
}
