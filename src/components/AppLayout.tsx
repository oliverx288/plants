import { NavLink, Outlet } from 'react-router-dom'
import { ROLE_LABELS } from '../auth/profile'
import { useAuth } from '../auth/AuthContext'
import { useIsEditor } from '../auth/useIsEditor'
import { Badge, Button } from './ui'
import styles from './AppLayout.module.css'

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
              Asistente
            </NavLink>
            <NavLink to="/articulos" className={linkClass}>
              Artículos
            </NavLink>
            {isEditor && (
              <>
                <NavLink to="/preguntas" className={linkClass}>
                  Preguntas sin respuesta
                </NavLink>
                <NavLink to="/valoraciones" className={linkClass}>
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
