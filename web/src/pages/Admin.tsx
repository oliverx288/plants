import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { FontSizeControl } from '../components/FontSizeControl';
import { Logo } from '../components/Logo';
import { CookieBanner } from '../components/CookieBanner';
import { DevRoleSwitcher } from '../components/DevRoleSwitcher';
import { RequireRole } from '../components/RequireRole';
import { ADMIN_PRODUCERS, ADMIN_USERS, INCIDENTS } from '../data/admin';
import { MARKETS } from '../data/markets';
import { dayShort } from '../services/format';
import { lotsService, peopleCount, statusOf, timeLeft } from '../services/lots';
import { useStore } from '../state/store';
import { useNow } from '../state/useNow';
import { useTitle } from '../state/useTitle';
import styles from './Admin.module.css';

type Sec = 'u' | 'p' | 'r' | 'c' | 'i';
const SECS: { id: Sec; label: string; color: string; title: string; sub: string; add?: string }[] = [
  { id: 'u', label: 'Personas usuarias', color: '#F4A261', title: 'Personas usuarias', sub: 'Quienes compran y quienes venden', add: 'Añadir persona' },
  { id: 'p', label: 'Productores', color: '#8CCB6A', title: 'Productores', sub: 'Huertas y fincas, y si ya las hemos comprobado', add: 'Añadir productor' },
  { id: 'r', label: 'Puntos de recogida', color: '#C9B4EA', title: 'Puntos de recogida', sub: 'Mercados y horarios de entrega', add: 'Añadir mercado' },
  { id: 'c', label: 'Compras en riesgo', color: '#FFD23F', title: 'Compras en riesgo', sub: 'Productos que cierran pronto y aún no llegan al mínimo' },
  { id: 'i', label: 'Avisos y problemas', color: '#F28B93', title: 'Avisos y problemas de recogida', sub: 'Lo que han contado compradores y productores' },
];

export default function Admin() {
  useTitle('Administración');
  const { state, dispatch } = useStore();
  const at = useNow();
  const [sec, setSec] = useState<Sec>('u');
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('todos');
  const [dlg, setDlg] = useState<{ name: string; kind: 'adminOff'; id: string } | null>(null);
  const [toast, setToast] = useState('');
  const mainRef = useRef<HTMLElement>(null);
  const meta = SECS.find((s) => s.id === sec)!;
  const off = (id: string, dflt = false) => state.adminOff[id] ?? dflt;
  const matches = (...t: string[]) => !q.trim() || t.some((x) => x.toLowerCase().includes(q.trim().toLowerCase()));
  const show = (isOff: boolean) => estado === 'todos' || (estado === 'activos' ? !isOff : isOff);
  const setOff = (id: string, v: boolean, msg: string) => { dispatch({ type: 'toggle', key: 'adminOff', id, value: v }); setToast(msg); setDlg(null); };
  const ask = (name: string, id: string) => { setDlg({ name, kind: 'adminOff', id }); setToast(''); };

  const risky = lotsService.all(state.createdLots).filter((l) => {
    const c = peopleCount(l, state.joined);
    return statusOf(l, c, state.cancelled) === 'curso' && timeLeft(l, at).ms < 4 * 864e5;
  });

  return (
    <div className={styles.shell}>
      <a href="#admin-main" className="skip">Saltar al contenido</a>
      <div className={styles.hb} role="region" aria-label="Soporte y tamaño del texto">
        <span>Soporte interno: <a href="tel:900000001">900 000 001</a></span>
        <FontSizeControl />
      </div>
      <RequireRole roles={['admin']}>
        <div className={styles.body}>
          <nav className={`${styles.side} on-dark`} aria-label="Administración">
            <div className={styles.brand}><Link to="/" aria-label="Lot a Lot, ir al inicio" style={{ color: '#fff', textDecoration: 'none' }}><Logo /></Link><small>Administración</small></div>
            {SECS.map((s) => (
              <button key={s.id} type="button" className={`${styles.si} ${sec === s.id ? styles.siOn : ''}`} aria-current={sec === s.id ? 'page' : undefined}
                onClick={() => { setSec(s.id); setDlg(null); setToast(''); setQ(''); setEstado('todos'); }}>
                <span className={styles.dot} style={{ background: s.color }} aria-hidden="true" />{s.label}
              </button>
            ))}
            <Link to="/productos" className={styles.si}>Ver la web pública</Link>
          </nav>

          <main id="admin-main" ref={mainRef} className={styles.main} tabIndex={-1}>
            <div className={styles.head}>
              <div><h1 className="dsp">{meta.title}</h1><p className="mut" style={{ marginTop: 2 }}>{meta.sub}</p></div>
              {meta.add && <button type="button" className="btn" onClick={() => setToast(`${meta.add}: en esta versión de prueba aún no se pueden crear.`)}><Icon name="plus" size={22} stroke={2.6} />{meta.add}</button>}
            </div>

            {toast && <p role="status" className="note note-green" style={{ alignItems: 'center' }}><Icon name="check" size={22} stroke={3} />{toast}</p>}

            {dlg && (
              <div role="dialog" aria-labelledby="dlg-t" className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12, border: '3px solid var(--aviso)', maxWidth: '40rem' }}>
                <h2 id="dlg-t" className="dsp" style={{ fontSize: '1.5rem' }}>¿Desactivar a {dlg.name}?</h2>
                <p>Si tiene productos a la venta, se cancelarán y <strong>no se cobrará a nadie</strong>. Avisaremos por correo a las personas apuntadas.</p>
                <label className="fld" style={{ fontWeight: 700 }}>Motivo (solo lo ve el equipo)<input className="in" placeholder="Escribe el motivo" /></label>
                <div className="row-btns"><button type="button" className="btn btn-red" onClick={() => setOff(dlg.id, true, `Hecho: ${dlg.name} está desactivado. Hemos avisado por correo a quien corresponde.`)}>Sí, desactivar</button><button type="button" className={styles.bo} onClick={() => setDlg(null)}>No, volver</button></div>
              </div>
            )}

            {(sec === 'u' || sec === 'p' || sec === 'r') && (
              <div className={styles.filters}>
                <label className="fld">Buscar<input className="in" type="search" placeholder={sec === 'u' ? 'Nombre o correo' : 'Nombre o pueblo'} value={q} onChange={(e) => setQ(e.target.value)} /></label>
                <label className="fld">Estado<select className="in" value={estado} onChange={(e) => setEstado(e.target.value)}><option value="todos">Todos</option><option value="activos">Activos</option><option value="desactivados">Desactivados</option></select></label>
              </div>
            )}

            {sec === 'u' && (
              <div className={`card ${styles.tableWrap}`}><table>
                <caption className="sr-only">Personas usuarias</caption>
                <thead><tr><th scope="col">Persona</th><th scope="col">Tipo</th><th scope="col">Compras</th><th scope="col">Estado</th><th scope="col" style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
                <tbody>
                  {ADMIN_USERS.filter((u) => matches(u.name, u.mail) && show(off(u.id, u.off))).map((u) => {
                    const o = off(u.id, u.off);
                    return (
                      <tr key={u.id} className={o ? styles.off : ''}>
                        <td><strong>{u.name}</strong><div className="mut" style={{ fontSize: '.95rem' }}>{u.mail}</div></td><td>{u.tipo}</td><td>{u.compras}</td>
                        <td><span className={`${styles.pill} ${o ? styles.pOff : styles.pOk}`}><Icon name={o ? 'x' : 'check'} size={16} stroke={3} />{o ? 'Desactivado' : 'Activo'}</span></td>
                        <td><div className={styles.acts}>
                          <button type="button" className={styles.bo} onClick={() => setToast(`Edición de ${u.name}: no disponible en la versión de prueba.`)}>Editar<span className="sr-only"> {u.name}</span></button>
                          {o ? <button type="button" className={styles.bo} onClick={() => setOff(u.id, false, `Cuenta de ${u.name} reactivada.`)}>Reactivar<span className="sr-only"> {u.name}</span></button>
                            : <button type="button" className={styles.bd} onClick={() => ask(u.name, u.id)}>Desactivar<span className="sr-only"> {u.name}</span></button>}
                        </div></td>
                      </tr>
                    );
                  })}
                </tbody></table></div>
            )}

            {sec === 'p' && (
              <div className={`card ${styles.tableWrap}`}><table>
                <caption className="sr-only">Productores</caption>
                <thead><tr><th scope="col">Huerta o finca</th><th scope="col">Pueblo</th><th scope="col">A la venta</th><th scope="col">Comprobación</th><th scope="col" style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
                <tbody>
                  {ADMIN_PRODUCERS.filter((p) => matches(p.name, p.owner, p.town) && show(off(p.id, p.status === 'off'))).map((p) => {
                    const o = off(p.id, p.status === 'off');
                    const verified = p.status === 'ok' || !!state.producerVerified[p.id];
                    return (
                      <tr key={p.id} className={o ? styles.off : p.status === 'pendiente' && !verified ? styles.warn : ''}>
                        <td><strong>{p.name}</strong><div className="mut" style={{ fontSize: '.95rem' }}>{p.owner}</div></td><td>{p.town}</td><td>{p.onSale}</td>
                        <td>{o ? <span className={`${styles.pill} ${styles.pOff}`}><Icon name="x" size={16} stroke={3} />Desactivada</span>
                          : verified ? <span className={`${styles.pill} ${styles.pOk}`}><Icon name="check" size={16} stroke={3} />Comprobada</span>
                            : <span className={`${styles.pill} ${styles.pPen}`}><Icon name="phone" size={16} />Pendiente de llamar</span>}</td>
                        <td><div className={styles.acts}>
                          {!verified && !o && <button type="button" className="btn" style={{ minHeight: '2.9rem', fontSize: '.95rem' }} onClick={() => { dispatch({ type: 'toggle', key: 'producerVerified', id: p.id, value: true }); setToast(`${p.name} marcada como comprobada.`); }}>Marcar como comprobada<span className="sr-only"> {p.name}</span></button>}
                          <button type="button" className={styles.bo} onClick={() => setToast(`Edición de ${p.name}: no disponible en la versión de prueba.`)}>Editar<span className="sr-only"> {p.name}</span></button>
                          {o ? <button type="button" className={styles.bo} onClick={() => setOff(p.id, false, `${p.name} reactivada.`)}>Reactivar<span className="sr-only"> {p.name}</span></button>
                            : <button type="button" className={styles.bd} onClick={() => ask(p.name, p.id)}>Desactivar<span className="sr-only"> {p.name}</span></button>}
                        </div></td>
                      </tr>
                    );
                  })}
                </tbody></table></div>
            )}

            {sec === 'r' && (
              <div className={`card ${styles.tableWrap}`}><table>
                <caption className="sr-only">Puntos de recogida</caption>
                <thead><tr><th scope="col">Mercado</th><th scope="col">Día y hora</th><th scope="col">A la venta</th><th scope="col">Estado</th><th scope="col" style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
                <tbody>
                  {MARKETS.filter((m) => matches(m.name, m.city) && show(off(m.id, !m.active))).map((m) => {
                    const o = off(m.id, !m.active);
                    return (
                      <tr key={m.id} className={o ? styles.off : ''}>
                        <td><strong>{m.name}</strong><div className="mut" style={{ fontSize: '.95rem' }}>{m.city}</div></td><td>{m.dayLabel}, {m.hoursShort}</td><td>{m.onSale}</td>
                        <td><span className={`${styles.pill} ${o ? styles.pOff : styles.pOk}`}><Icon name={o ? 'x' : 'check'} size={16} stroke={3} />{o ? 'Desactivado' : 'Activo'}</span></td>
                        <td><div className={styles.acts}>
                          <button type="button" className={styles.bo} onClick={() => setToast(`Edición de ${m.name}: no disponible en la versión de prueba.`)}>Editar<span className="sr-only"> {m.name}</span></button>
                          {o ? <button type="button" className={styles.bo} onClick={() => setOff(m.id, false, `${m.name} reactivado.`)}>Reactivar<span className="sr-only"> {m.name}</span></button>
                            : <button type="button" className={styles.bd} onClick={() => ask(m.name, m.id)}>Desactivar<span className="sr-only"> {m.name}</span></button>}
                        </div></td>
                      </tr>
                    );
                  })}
                </tbody></table></div>
            )}

            {sec === 'c' && (
              <div className={`card ${styles.tableWrap}`}>
                {risky.length === 0 ? <p style={{ padding: '1.5rem' }}>Ahora mismo no hay compras en riesgo.</p> : (
                  <table>
                    <caption className="sr-only">Compras en riesgo</caption>
                    <thead><tr><th scope="col">Producto</th><th scope="col">Productor</th><th scope="col">Personas</th><th scope="col">Cierra</th><th scope="col" style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
                    <tbody>
                      {risky.map((l) => {
                        const c = peopleCount(l, state.joined);
                        const warned = !!state.resolved[`r:${l.id}`];
                        return (
                          <tr key={l.id} className={timeLeft(l, at).ms < 36 * 36e5 ? styles.warn : ''}>
                            <td><strong>{l.name}</strong></td><td>{l.producerName}</td>
                            <td>{c} de {l.min} <span className="mut">(faltan {l.min - c})</span></td><td>{dayShort(l.deadline)}</td>
                            <td><div className={styles.acts}>
                              {warned ? <span className={`${styles.pill} ${styles.pOk}`}><Icon name="check" size={16} stroke={3} />Productor avisado</span>
                                : <button type="button" className={styles.bo} onClick={() => { dispatch({ type: 'toggle', key: 'resolved', id: `r:${l.id}`, value: true }); setToast(`Hemos avisado a ${l.producerName} para que lo comparta con sus clientes.`); }}>Avisar al productor<span className="sr-only"> de {l.name}</span></button>}
                              <Link className={styles.bo} to={`/productos/${l.id}`}>Ver<span className="sr-only"> {l.name}</span></Link>
                            </div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {sec === 'i' && (
              <div className={`card ${styles.tableWrap}`}><table>
                <caption className="sr-only">Incidencias de recogida</caption>
                <thead><tr><th scope="col">Cuándo</th><th scope="col">Qué ha pasado</th><th scope="col">Dónde y quién</th><th scope="col">Estado</th><th scope="col" style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
                <tbody>
                  {INCIDENTS.map((i) => {
                    const done = i.resolved || !!state.resolved[i.id];
                    return (
                      <tr key={i.id}>
                        <td>{i.when}</td><td style={{ minWidth: '14rem' }}>{i.text}</td><td>{i.who}</td>
                        <td><span className={`${styles.pill} ${done ? styles.pOk : styles.pPen}`}><Icon name={done ? 'check' : 'alert'} size={16} stroke={2.6} />{done ? 'Resuelta' : 'Pendiente'}</span></td>
                        <td><div className={styles.acts}>{!done && <button type="button" className={styles.bo} onClick={() => { dispatch({ type: 'toggle', key: 'resolved', id: i.id, value: true }); setToast('Incidencia marcada como resuelta.'); }}>Marcar como resuelta<span className="sr-only">: {i.text}</span></button>}</div></td>
                      </tr>
                    );
                  })}
                </tbody></table></div>
            )}
          </main>
        </div>
      </RequireRole>
      <CookieBanner />
      <DevRoleSwitcher />
    </div>
  );
}
