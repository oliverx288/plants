import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { BG_BY_PRODUCT } from '../components/ProducerBits';
import { RequireRole } from '../components/RequireRole';
import { Veg } from '../components/Veg';
import { getMarket } from '../data/markets';
import { PEOPLE } from '../data/people';
import { dayLong, dayShort, eur, kilos, plural } from '../services/format';
import { currentPrice, lotsService, peopleCount, statusOf } from '../services/lots';
import { useStore } from '../state/store';
import { useNow } from '../state/useNow';
import { useTitle } from '../state/useTitle';
import { timeLeft } from '../services/lots';
import { copyShareLink } from './ProducerDone';
import styles from './Producer.module.css';

export default function ProducerLot() {
  const { id } = useParams();
  const { state, dispatch } = useStore();
  const at = useNow();
  const lot = lotsService.get(id, state.createdLots);
  const [shared, setShared] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useTitle(lot ? `${lot.name} · mi producto` : 'Producto no encontrado');

  if (!lot) {
    return <Page><RequireRole roles={['producer']}><div className="card" style={{ margin: '2rem var(--pad)', padding: '2rem' }}><h1 className="dsp">No encontramos este producto</h1><Link to="/productor" className="btn" style={{ marginTop: 12 }}>Volver a mi panel</Link></div></RequireRole></Page>;
  }
  const cancelled = state.cancelled.includes(lot.id);
  const count = peopleCount(lot, state.joined);
  const status = cancelled ? 'no' : statusOf(lot, count);
  const falta = Math.max(0, lot.min - count);
  const market = getMarket(lot.marketId);
  const left = timeLeft(lot, at);
  const people = [
    ...PEOPLE.slice(0, lot.baseCount),
    ...(state.joined.includes(lot.id) ? [{ initials: 'LM', name: 'Lucía M.', bg: '#23301F', fg: '#FFD23F', day: '8 de octubre' }] : []),
  ];
  const sBg = cancelled ? '#C62F3B' : status === 'conf' ? '#2E7D38' : '#F4A261';
  const sFg = cancelled || status === 'conf' ? '#fff' : '#2E1603';
  const sLabel = cancelled ? 'Venta cancelada' : status === 'conf' ? 'Venta confirmada' : `A la venta: faltan ${falta} ${plural(falta, 'persona', 'personas')}`;
  const price = currentPrice(lot, count);

  return (
    <Page>
      <RequireRole roles={['producer']}>
        <div className={styles.wrap}>
          <Link to="/productor" style={{ alignSelf: 'flex-start', display: 'inline-flex', gap: 8, alignItems: 'center', minHeight: '2.9rem' }}><Icon name="back" size={22} stroke={2.6} />Volver a mi panel</Link>
          <div className={styles.shead}>
            <div className={styles.sBig} style={{ background: BG_BY_PRODUCT[lot.product] }}><Veg kind={lot.product} size={66} /></div>
            <div>
              <span className="s" style={{ background: sBg, color: sFg }}><Icon name={cancelled ? 'x' : status === 'conf' ? 'check' : 'clock'} size={18} stroke={2.6} />{sLabel}</span>
              <h1 className="dsp" style={{ fontSize: '2.2rem', lineHeight: 1.05, marginTop: 8 }}>{lot.name} · {lot.totalKg} kilos</h1>
              <p className="mut" style={{ marginTop: 2 }}>A la venta desde el {lot.publishedAt.slice(8).replace(/^0/, '')} de octubre · {kilos(lot.perPerson)} por persona</p>
            </div>
          </div>

          {shared && <p role="status" className="note note-green" style={{ alignItems: 'center' }}><Icon name="check" size={22} stroke={3} />Enlace copiado. Pégalo en WhatsApp o en un mensaje a tus clientes.</p>}
          {cancelled && <p role="status" className="note note-red" style={{ alignItems: 'center', border: '2.5px solid var(--aviso)' }}><Icon name="x" size={22} stroke={3} />Venta cancelada. Hemos avisado a las {count} personas y no se cobrará a nadie.</p>}

          <section className={`card ${styles.prog}`} aria-label="Cómo va la venta">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p><strong className={`dsp ${styles.big}`}>{count} de {lot.min}</strong><br /><strong style={{ fontSize: '1.1rem' }}>personas apuntadas</strong></p>
              <div style={{ paddingTop: 18 }}>
                <div className="bar" role="img" aria-label={`${count} de ${lot.min} personas apuntadas. ${falta > 0 ? `Faltan ${falta} para el mínimo.` : 'Ya se ha llegado al mínimo.'}`}><i style={{ width: `${Math.min(100, (count / lot.max) * 100)}%` }} /><b className="flag" style={{ left: `${(lot.min / lot.max) * 100}%` }} /></div>
                <div style={{ position: 'relative', height: '1.9rem', marginTop: 10, fontWeight: 700 }}>
                  <span style={{ position: 'absolute', left: `${(lot.min / lot.max) * 100}%`, transform: 'translateX(-50%)', color: 'var(--aviso-texto)', whiteSpace: 'nowrap' }}>Mínimo: {lot.min}</span>
                  <span className="mut" style={{ position: 'absolute', right: 0 }}>Máximo: {lot.max}</span>
                </div>
              </div>
              {status === 'curso' && <p className="note note-red">Faltan {falta} {plural(falta, 'persona', 'personas')}. Si no se llega antes del {dayShort(lot.deadline)}, no se vende y no tienes que preparar nada.</p>}
              {status === 'conf' && <p className="note note-green" style={{ color: 'var(--verde-oscuro)' }}>✓ Venta confirmada. Cobrarás {eur(count * lot.perPerson * price)} y tienes que preparar {kilos(count * lot.perPerson)}.</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><span className="b">Se cierra en</span>
                <div className="cds" style={{ marginTop: 6 }} role="timer" aria-label={`${left.days} días y ${left.hours} horas`}><div className="cd"><b>{left.days}</b>días</div><div className="cd"><b>{left.hours}</b>horas</div></div></div>
              <p>Precio ahora: <strong>{eur(price)} el kilo</strong></p>
              <p>Entrega: <strong>{dayLong(market.nextDate)}</strong>, de {market.hoursShort}, en el {market.name}</p>
            </div>
          </section>

          {!cancelled && (
            <div className={styles.acts}>
              <button type="button" className="btn" onClick={async () => { await copyShareLink(lot.id); setShared(true); }}><Icon name="share" size={24} />Compartir para que se apunte más gente</button>
              <button type="button" className="btn2" onClick={() => { const rows = people.map((p) => `${p.name};${kilos(lot.perPerson)}`).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([`Nombre;Kilos\n${rows}`], { type: 'text/csv' })); a.download = `${lot.id}-personas.csv`; a.click(); }}><Icon name="download" size={24} />Descargar la lista</button>
              <button type="button" className="btn2 danger" style={{ marginLeft: 'auto' }} onClick={() => setConfirm(true)}>Cancelar la venta</button>
            </div>
          )}

          {confirm && !cancelled && (
            <div role="dialog" aria-labelledby="cx-t" className="dialog-box red" style={{ maxWidth: '42rem' }}>
              <h2 id="cx-t" className="dsp" style={{ fontSize: '1.6rem' }}>¿Seguro que quieres cancelar la venta?</h2>
              <p style={{ fontSize: '1.05rem' }}>Avisaremos a las {count} personas apuntadas y <strong>no se cobrará a nadie</strong>. Esto no se puede deshacer, pero podrás volver a ponerlo a la venta.</p>
              <div className="row-btns"><button type="button" className="btn btn-red" onClick={() => { dispatch({ type: 'cancelLot', id: lot.id }); setConfirm(false); }}>Sí, cancelar la venta</button><button type="button" className="btn2" onClick={() => setConfirm(false)}>No, seguir vendiendo</button></div>
            </div>
          )}

          <section className={`card ${styles.list}`} aria-labelledby="h-pers">
            <div style={{ padding: '1.3rem 1.3rem 0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
              <h2 id="h-pers" className="dsp" style={{ fontSize: '1.7rem' }}>Personas apuntadas ({count})</h2>
              <span className="mut">Solo ves el nombre y la inicial del apellido</span>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {people.map((p) => {
                const key = `${lot.id}:${p.name}`;
                const done = !!state.delivered[key];
                return (
                  <li key={p.name} className={styles.pr}>
                    <span className="av" style={{ background: p.bg, color: p.fg }} aria-hidden="true">{p.initials}</span>
                    <strong>{p.name}<span className="mut" style={{ fontWeight: 400 }}> · se apuntó el {p.day} · {kilos(lot.perPerson)}</span></strong>
                    <span style={{ gridColumn: '2' }}>
                      {status === 'conf' ? (
                        <button type="button" className={done ? 'btn' : 'btn2'} style={{ minHeight: '2.7rem', padding: '0.3rem 1rem', fontSize: '1rem' }} aria-pressed={done} onClick={() => dispatch({ type: 'toggle', key: 'delivered', id: key, value: !done })}>{done ? '✓ Entregado' : 'Marcar como entregado'}<span className="sr-only"> a {p.name}</span></button>
                      ) : cancelled ? <span className={styles.pend}><Icon name="x" size={18} stroke={2.6} />No se cobra</span>
                        : <span className={styles.pend}><Icon name="clock" size={18} />Se cobra si se llega al mínimo</span>}
                    </span>
                  </li>
                );
              })}
              {falta > 0 && !cancelled && (
                <li className={styles.pr} style={{ background: 'var(--crema)', borderBottom: 0 }}>
                  <span className="av" style={{ border: '2.5px dashed #8A7A55', color: 'var(--texto-2)' }} aria-hidden="true">+{falta}</span>
                  <strong>Faltan {falta} {plural(falta, 'persona', 'personas')} para llegar al mínimo</strong>
                </li>
              )}
            </ul>
            <p className="mut" style={{ padding: '1rem 1.3rem 1.3rem' }}>{status === 'conf' ? 'El día de la recogida, marca cada pedido como «Entregado».' : 'Cuando la venta se confirme, aquí podrás marcar cada pedido como «Entregado» el día de la recogida.'}</p>
          </section>
        </div>
      </RequireRole>
    </Page>
  );
}
