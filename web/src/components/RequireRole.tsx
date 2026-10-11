import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HOME_BY_ROLE, useStore, type Role } from '../state/store';

const LABEL: Record<Role, string> = { guest: 'sin sesión', buyer: 'persona compradora', producer: 'productor', admin: 'administración' };

/** Si el rol no corresponde, explica por qué y ofrece entrar (en el prototipo, cambiar de rol). */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  if (roles.includes(state.role)) return <>{children}</>;
  const target = roles[0];
  return (
    <div className="card" style={{ margin: '2.5rem var(--pad)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start', maxWidth: 40 + 'rem' }}>
      <h1 className="dsp" style={{ fontSize: '2rem' }}>Esta zona es para {LABEL[target] === 'sin sesión' ? 'otro tipo de cuenta' : `la ${target === 'buyer' ? 'persona compradora' : target === 'producer' ? 'persona productora' : 'administración'}`}</h1>
      <p>Ahora estás {state.role === 'guest' ? 'sin haber entrado' : `como ${LABEL[state.role]}`}. Entra con la cuenta adecuada para ver esta página.</p>
      <Link className="btn" to="/acceso?modo=entrar">Entrar</Link>
      <button type="button" className="btn2" onClick={() => { dispatch({ type: 'role', role: target }); navigate(HOME_BY_ROLE[target]); }}>
        Prototipo: entrar como {LABEL[target]}
      </button>
    </div>
  );
}
