import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { BG_BY_PRODUCT, VegBubble } from '../components/ProducerBits';
import { RequireRole } from '../components/RequireRole';
import { StatusPill } from '../components/StatusPill';
import { PRODUCER_ORDERS } from '../data/past';
import { currentPrice, lotsService, peopleCount, statusOf, timeLeft } from '../services/lots';
import { eur, plural } from '../services/format';
import { useStore } from '../state/store';
import { useNow } from '../state/useNow';
import { useTitle } from '../state/useTitle';
import styles from './Producer.module.css';

export default function ProducerPanel() {
  useTitle('Mi panel');
  const { state } = useStore();
  const at = useNow();
  const mine = lotsService.all(state.createdLots).filter((l) => l.producerId === 'can-ribes');
  const live = mine.filter((l) => !state.cancelled.includes(l.id));
  const cancelled = mine.filter((l) => state.cancelled.includes(l.id));
  const onSale = live.filter((l) => statusOf(l, peopleCount(l, state.joined), state.cancelled) === 'curso');
  const liveConf = live.filter((l) => statusOf(l, peopleCount(l, state.joined), state.cancelled) === 'conf');
  const confOrders = PRODUCER_ORDERS.filter((o) => o.status === 'conf');
  const doneOrders = PRODUCER_ORDERS.filter((o) => o.status !== 'conf');
  const confTotal = confOrders.reduce((a, o) => a + (o.total ?? 0), 0) + liveConf.reduce((a, l) => a + peopleCount(l, state.joined) * l.perPerson * currentPrice(l, peopleCount(l, state.joined)), 0);
  const confCount = confOrders.length + liveConf.length;
  const urgent = [...onSale].sort((a, b) => timeLeft(a, at).ms - timeLeft(b, at).ms)[0];

  return (
    <Page>
      <RequireRole roles={['producer']}>
        <div className={styles.wrap}>
          <div className={styles.top}>
            <div>
              <h1 className="dsp">¡Buenos días, Montse!</h1>
              <p className="mut" style={{ marginTop: 4, fontSize: '1.1rem' }}>Huerta Can Ribes · tu cuenta está comprobada</p>
            </div>
            <Link className="btn btn-xl" to="/productor/vender/1" onClick={() => undefined}><Icon name="plus" size={26} stroke={2.8} />Poner a la venta</Link>
          </div>

          <section aria-label="Resumen" className={styles.kpis}>
            <div className={styles.kpi} style={{ background: '#FDE7D3', color: '#2E1603' }}>
              <span className={styles.ki} style={{ background: '#F4A261' }}><Icon name="leaf" size={30} stroke={2} /></span>
              <div><strong className={`dsp ${styles.kn}`}>{onSale.length}</strong><strong style={{ fontSize: '1.1rem' }}>a la venta</strong><p>Buscando personas</p></div>
            </div>
            <div className={styles.kpi} style={{ background: '#2E7D38', color: '#fff' }}>
              <span className={styles.ki} style={{ background: '#FFFDF8', color: '#2E7D38' }}><Icon name="check" size={30} stroke={3} /></span>
              <div><strong className={`dsp ${styles.kn}`}>{confCount}</strong><strong style={{ fontSize: '1.1rem' }}>confirmadas</strong><p>Para entregar el sábado 17 · cobrarás {eur(confTotal)}</p></div>
            </div>
            <div className={styles.kpi} style={{ background: '#ECE4F6', color: '#2E1F45' }}>
              <span className={styles.ki} style={{ background: '#6A4C93', color: '#fff' }}><Icon name="box" size={30} stroke={2} /></span>
              <div><strong className={`dsp ${styles.kn}`}>{6 + cancelled.length}</strong><strong style={{ fontSize: '1.1rem' }}>terminadas</strong><p>5 entregadas y {1 + cancelled.length} que no salió adelante</p></div>
            </div>
          </section>

          {urgent && (
            <div role="note" className={styles.alertBox}>
              <span style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: '1.1rem' }}>
                <Icon name="alert" size={30} stroke={2.2} />
                <span><strong>Al {urgent.name.toLowerCase()} le {urgent.min - peopleCount(urgent, state.joined) === 1 ? 'falta 1 persona' : `faltan ${urgent.min - peopleCount(urgent, state.joined)} personas`}</strong> y se cierra en {timeLeft(urgent, at).days} {plural(timeLeft(urgent, at).days, 'día', 'días')}. Si se lo cuentas a tus clientes, es más fácil llegar.</span>
              </span>
              <Link className="btn2" to={`/productor/producto/${urgent.id}`} style={{ borderColor: '#3B2F00', color: '#3B2F00' }}>Ver y compartir</Link>
            </div>
          )}

          <section id="a-la-venta" aria-labelledby="h-venta" className={styles.sec}>
            <h2 id="h-venta" className="dsp">A la venta ahora</h2>
            {onSale.length === 0 ? (
              <p className="card" style={{ padding: '1.4rem' }}>Ahora no tienes nada a la venta. Pulsa «Poner a la venta» para empezar.</p>
            ) : (
              <div className={styles.cards}>
                {onSale.map((l) => {
                  const c = peopleCount(l, state.joined);
                  const falta = l.min - c;
                  return (
                    <article key={l.id} className={`card ${styles.pc}`}>
                      <div className={styles.pcHead}><VegBubble kind={l.product} /><h3 className="dsp" style={{ fontSize: '1.35rem' }}>{l.name}</h3></div>
                      <StatusPill status="curso" label={`Faltan ${falta} ${plural(falta, 'persona', 'personas')}`} />
                      <div>
                        <p><strong className="dsp" style={{ fontSize: '1.4rem' }}>{c} de {l.min}</strong> personas apuntadas</p>
                        <div className="bar" style={{ marginTop: 14 }} role="img" aria-label={`${c} de ${l.min} personas apuntadas`}><i style={{ width: `${Math.min(100, (c / l.max) * 100)}%` }} /><b className="flag" style={{ left: `${(l.min / l.max) * 100}%` }} /></div>
                      </div>
                      <p>Precio ahora: <strong>{eur(currentPrice(l, c))} el kilo</strong><br />Se cierra en <strong>{timeLeft(l, at).days} {plural(timeLeft(l, at).days, 'día', 'días')}</strong>{!l.listed && <><br /><span className="mut">Saldrá en el catálogo mañana.</span></>}</p>
                      <Link className="btn2" to={`/productor/producto/${l.id}`}>Ver personas apuntadas<span className="sr-only"> de {l.name}</span></Link>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section id="entregas" aria-labelledby="h-conf" className={styles.sec}>
            <h2 id="h-conf" className="dsp">Prepara estos pedidos para el sábado</h2>
            <div className={`card ${styles.list}`}>
              {liveConf.map((l) => {
                const c = peopleCount(l, state.joined);
                return (
                  <article key={l.id} className={styles.orow}>
                    <VegBubble kind={l.product} size={4} />
                    <div><strong className="dsp" style={{ fontSize: '1.2rem' }}>{l.name}</strong><br /><StatusPill status="conf" label="Venta confirmada" size={18} /></div>
                    <p>{c} personas · {eur(currentPrice(l, c))} el kilo<br /><strong>Cobrarás {eur(c * l.perPerson * currentPrice(l, c))}</strong></p>
                    <Link className="btn2" to={`/productor/producto/${l.id}`}>Ver lista de entrega<span className="sr-only"> de {l.name}</span></Link>
                  </article>
                );
              })}
              {confOrders.map((o) => (
                <article key={o.id} className={styles.orow}>
                  <VegBubble kind={o.product} bg={o.tile} size={4} />
                  <div><strong className="dsp" style={{ fontSize: '1.2rem' }}>{o.name}</strong><br /><StatusPill status="conf" label="Venta confirmada" size={18} /></div>
                  <p>{o.people} personas · {eur(o.priceKg ?? 0)} el kilo<br /><strong>Cobrarás {eur(o.total ?? 0)}</strong></p>
                  <Link className="btn2" to="/productor/producto/tomate">Ver lista de entrega<span className="sr-only"> de {o.name}</span></Link>
                </article>
              ))}
            </div>
            <p className="mut">Entrega: sábado 17 de octubre, de 10:00 a 13:00, en el Mercat de Sant Antoni.</p>
          </section>

          <section id="terminadas" aria-labelledby="h-term" className={styles.sec}>
            <h2 id="h-term" className="dsp">Terminadas</h2>
            <div className={`card ${styles.list}`}>
              {cancelled.map((l) => (
                <article key={l.id} className={styles.orow}>
                  <VegBubble kind={l.product} size={4} />
                  <div><strong className="dsp" style={{ fontSize: '1.2rem' }}>{l.name}</strong><br /><StatusPill status="no" label="Venta cancelada" size={18} /></div>
                  <p>Cancelaste la venta.<br />No se cobró a nadie.</p>
                  <Link className="btn2" to="/productor/vender/1">Volver a ponerlo a la venta</Link>
                </article>
              ))}
              {doneOrders.map((o) => (
                <article key={o.id} className={styles.orow}>
                  <VegBubble kind={o.product} bg={BG_BY_PRODUCT[o.product]} size={4} />
                  <div><strong className="dsp" style={{ fontSize: '1.2rem' }}>{o.name}</strong><br />
                    {o.status === 'done' ? <StatusPill status="rec" label="Entregada" size={18} /> : <StatusPill status="no" size={18} />}</div>
                  <p>{o.status === 'done' ? <>{o.date}<br /><strong>Cobraste {eur(o.total ?? 0)}</strong></> : <>{o.note}<br />No se cobró a nadie.</>}</p>
                  {o.status === 'done' ? <Link className="btn2" to="/info/preguntas-frecuentes">Ver resumen</Link> : <Link className="btn2" to="/productor/vender/1">Volver a ponerlo a la venta</Link>}
                </article>
              ))}
            </div>
          </section>
        </div>
      </RequireRole>
    </Page>
  );
}
