import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ROLE_LABELS } from '../auth/profile'
import { useAuth } from '../auth/AuthContext'
import { useIsEditor } from '../auth/useIsEditor'
import { Badge, Button } from './ui'
import styles from './AppLayout.module.css'

// Iconos de la navegación: decorativos (el texto del enlace ya dice lo mismo), por eso aria-hidden.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [styles.navLink, isActive ? styles.navLinkActive : ''].filter(Boolean).join(' ')

export function AppLayout() {
  const { state, signOut } = useAuth()
  const isEditor = useIsEditor()
  if (state.status !== 'signedIn') return null
  const { profile } = state

  return (
    <div className={styles.shell}>
      <a href="#contenido" className={styles.skip}>
        Saltar al contenido
      </a>
      <header className={styles.header}>
        <div className={styles.inner}>
          <span className={styles.brand}>Faro</span>
          <nav aria-label="Principal" className={styles.nav}>
            <NavLink to="/" end className={linkClass}>
              <Icon>
                <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" />
              </Icon>
              Asistente
            </NavLink>
            <NavLink to="/articulos" className={linkClass}>
              <Icon>
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
                <path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20" />
              </Icon>
              Artículos
            </NavLink>
            {isEditor && (
              <>
                <NavLink to="/preguntas" className={linkClass}>
                  <Icon>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7" />
                    <path d="M12 17h.01" />
                  </Icon>
                  Preguntas sin respuesta
                </NavLink>
                <NavLink to="/valoraciones" className={linkClass}>
                  <Icon>
                    <path d="M7 11v9H4v-9h3Zm0 0 4-7a2 2 0 0 1 2 2v3h5.3a2 2 0 0 1 2 2.3l-1 6a2 2 0 0 1-2 1.7H7" />
                  </Icon>
                  Valoraciones
                </NavLink>
              </>
            )}
          </nav>
          <div className={styles.user}>
            <span className={styles.name}>{profile.displayName}</span>
            <Badge>{ROLE_LABELS[profile.role]}</Badge>
            <Button variant="secondary" onClick={() => void signOut()}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>
      <main id="contenido" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
