import { Outlet } from 'react-router-dom'
import { ROLE_LABELS } from '../auth/profile'
import { useAuth } from '../auth/AuthContext'
import { Badge, Button } from './ui'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const { state, signOut } = useAuth()
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
