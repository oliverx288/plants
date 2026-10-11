import { useNavigate } from 'react-router-dom';
import { HOME_BY_ROLE, useStore, type Role } from '../state/store';
import styles from './Layout.module.css';

const ROLES: { role: Role; label: string }[] = [
  { role: 'guest', label: 'Sin sesión' },
  { role: 'buyer', label: 'Persona compradora' },
  { role: 'producer', label: 'Productor' },
  { role: 'admin', label: 'Administración' },
];

/** Selector de rol solo para desarrollo: permite recorrer toda la web sin login real. */
export function DevRoleSwitcher() {
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  if (!import.meta.env.DEV) return null;
  const current = ROLES.find((r) => r.role === state.role)?.label;
  return (
    <details className={styles.dev}>
      <summary>Prototipo · {current}</summary>
      <div className={styles.devPanel}>
        <small>Cambiar de rol (sin login real)</small>
        {ROLES.map((r) => (
          <button key={r.role} type="button" aria-pressed={state.role === r.role}
            onClick={() => { dispatch({ type: 'role', role: r.role }); navigate(HOME_BY_ROLE[r.role]); }}>
            {r.label}
          </button>
        ))}
        <button type="button" onClick={() => { if (window.confirm('¿Borrar los datos del prototipo y empezar de cero?')) { dispatch({ type: 'reset' }); navigate('/'); } }}>
          Reiniciar datos
        </button>
      </div>
    </details>
  );
}
