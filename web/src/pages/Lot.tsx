import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Crate } from '../components/Crate';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { StatusPill } from '../components/StatusPill';
import { Veg } from '../components/Veg';
import { getMarket } from '../data/markets';
import { dayLong, eur, kilos } from '../services/format';
import { category, currentTier, deadlineSentence, deadlineShort, lotsService, peopleCount, statusOf, tagsOf, tierRange, timeLeft, yourMax } from '../services/lots';
import { useStore } from '../state/store';
import { useNow } from '../state/useNow';
import { useTitle } from '../state/useTitle';
import styles from './Lot.module.css';

type Mode = 'idle' | 'confirm' | 'joined' | 'leave' | 'left';

export default function LotPage() {
  const { id } = useParams();
  const { state, dispatch } = useStore();
  const lot = lotsService.get(id, state.createdLots);
  const at = useNow();
  const alreadyIn = !!lot && state.joined.includes(lot.id);
  const [mode, setMode] = useState<Mode>(alreadyIn ? 'joined' : 'idle');
  const [showAuth, setShowAuth] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const leaveRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  useTitle(lot ? lot.name : 'Producto no encontrado');
  useEffect(() => { setMode(alreadyIn ? 'joined' : 'idle'); setShowAuth(false); /* al cambiar de producto */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    if (!tick) return;
    const el = mode === 'confirm' ? confirmRef.current : mode === 'leave' ? leaveRef.current : doneRef.current;
    el?.focus();
  }, [mode, tick]);
  const go = (m: Mode) => { setMode(m); setTick((t) => t + 1); };

  if (!lot) {
    return (
      <Page>
        <div className={`card ${styles.sorry}`}>
          <h1 className="dsp" style={{ fontSize: '2rem' }}>No encontramos este producto</h1>
          <p>Puede que ya no esté a la venta. Mira todos los que hay ahora.</p>
          <Link className="btn" to="/productos">Ver productos a la venta</Link>
        </div>
      </Page>
    );
  }

  const joined = state.joined.includes(lot.id);
  const count = peopleCount(lot, state.joined);
  const status = statusOf(lot, count, state.cancelled);
  const faltan = Math.max(0, lot.min - count);
  const cat = category(lot);
  const market = getMarket(lot.marketId);
  const { index: tierIdx } = currentTier(lot, count);
  const left = timeLeft(lot, at);
  const closed = left.ms === 0 || status === 'no';
  const maxPay = yourMax(lot, count);
  const maxPayJoin = lot.perPerson * currentTier(lot, count + (joined ? 0 : 1)).tier.price;
  const role = state.role;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${market.name} ${market.city}`)}`;
  const deadlineCap = deadlineShort(lot);

  const join = () => { dispatch({ type: 'join', id: lot.id }); go('joined'); };
  const leave = () => { dispatch({ type: 'leave', id: lot.id }); go('left'); };
  const ask = () => {
    if (role !== 'buyer') { setShowAuth(true); return; }
    go('confirm');
  };

  return (
    <Page>
      <div className={styles.back}>
        <Link to="/productos"><Icon name="back" size={22} stroke={2.6} />Volver a los productos</Link>
      </div>

      <div className={styles.grid}>
        <div className={`${styles.art}`} style={{ background: cat.bg }}>
          <span className={styles.artC1} style={{ background: lot.cat === 'roja' ? '#FBCFD3' : 'rgba(255,255,255,.55)' }} aria-hidden="true" />
          <span className={styles.artC2} aria-hidden="true" />
          <span style={{ position: 'relative' }}><Veg kind={lot.product} size={190} /></span>
          <span className={`tag ${styles.artCat}`} style={{ color: cat.fg }}>{cat.label}</span>
        </div>

        <aside aria-label="Compra en grupo" className={`card ${styles.aside}`}>
          <div className={styles.head}>
            <StatusPill status={status} label={status === 'curso' ? `En curso: faltan ${faltan} ${faltan === 1 ? 'persona' : 'personas'}` : undefined} size={20} />
            <h1 className="dsp">{lot.name}</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {tagsOf(lot).map((t) => <span key={t.label} className={`tag ${t.cls}`}>{t.label}</span>)}
            </div>
            <p className="mut">{lot.totalKg} kilos en total · tu parte: <strong style={{ color: 'var(--texto)' }}>{kilos(lot.perPerson)}</strong> · lo vende {lot.producerName}</p>
          </div>

          {mode === 'joined' && (
            <div role="status" ref={doneRef} tabIndex={-1} className="ok ok-solid">
              <Icon name="check" size={34} stroke={3} />
              <div>
                <strong className="dsp" style={{ fontSize: '1.35rem' }}>¡Listo, te has apuntado!</strong>
                <p style={{ marginTop: 4 }}>{status === 'conf' ? `La compra ya está confirmada. ` : `Te avisaremos por SMS y correo cuando se llegue a ${lot.min} personas. `}<strong>Todavía no se te ha cobrado nada</strong>: solo se cobra si se confirma la compra.</p>
              </div>
            </div>
          )}
          {mode === 'left' && (
            <div role="status" ref={doneRef} tabIndex={-1} className="ok ok-soft">
              <Icon name="check" size={30} stroke={3} style={{ color: 'var(--verde-oscuro)' }} />
              <div><strong className="dsp" style={{ fontSize: '1.25rem' }}>Te has borrado de esta compra</strong><p style={{ marginTop: 4 }}>No se te cobrará nada. Puedes volver a apuntarte cuando quieras.</p></div>
            </div>
          )}

          <section aria-labelledby="h-pers" className={styles.sec}>
            <h2 id="h-pers" className="sr-only">Personas apuntadas</h2>
            <p>
              <strong className={`dsp ${styles.count}`}>{count} de {lot.min}</strong><br />
              <strong style={{ fontSize: '1.1rem' }}>personas apuntadas</strong> <span className="mut">· cada {lot.product === 'otro' ? 'figura' : 'dibujo'} es una persona</span>
            </p>
            <Crate lot={lot} count={count} youIn={joined} />
            {status === 'curso' && (
              <p className="note note-red"><span>Faltan {faltan} {faltan === 1 ? 'persona' : 'personas'}. Si no se llega a {lot.min} antes del {deadlineCap}, <u>no se cobra a nadie</u>.</span></p>
            )}
            {status === 'conf' && (
              <p className="note note-green" style={{ color: 'var(--verde-oscuro)' }}>✓ Ya se ha llegado al mínimo: la compra se hará. Si se apunta más gente, el kilo puede seguir bajando hasta el {deadlineCap}.</p>
            )}
            {status === 'no' && (
              <p className="note note-red">Esta compra no salió adelante. No se ha cobrado nada a nadie.</p>
            )}
          </section>

          <section aria-labelledby="h-precio" className={styles.sec}>
            <h2 id="h-precio" className="dsp">Cuantas más personas, más barato</h2>
            <div className={styles.tiers}>
              {lot.tiers.map((t, i) => (
                <div key={t.from} className={`${styles.tier} ${i === tierIdx ? styles.tierNow : ''}`} style={{ '--h': `${[100, 88, 78][i] ?? 70}%`, '--i': i } as CSSProperties}>
                  {i === tierIdx && <span className={styles.nowTag}>Precio ahora</span>}
                  <span><b className={`dsp ${styles.tierPrice}`}>{eur(t.price)}</b> el kilo</span>
                  <span className="b">{tierRange(lot, i)}</span>
                </div>
              ))}
            </div>
            <p>Tu parte ({kilos(lot.perPerson)}) te costará <strong>{eur(maxPay)} como mucho</strong>. Si se apunta más gente, pagarás menos.</p>
          </section>

          <section aria-labelledby="h-plazo" className={styles.sec}>
            <h2 id="h-plazo" className="dsp">{closed ? 'El plazo para apuntarse ha terminado' : `Puedes apuntarte hasta el ${deadlineSentence(lot)}`}</h2>
            {!closed && (
              <div className="cds" role="timer" aria-label={`Quedan ${left.days} días, ${left.hours} horas y ${left.minutes} minutos`}>
                <div className="cd"><b>{left.days}</b><span>días</span></div>
                <div className="cd"><b>{left.hours}</b><span>horas</span></div>
                <div className="cd"><b>{left.minutes}</b><span>minutos</span></div>
              </div>
            )}
          </section>

          <section aria-labelledby="h-rec" className={styles.pickup}>
            <span className={styles.pickIcon}><Icon name="pin" size={28} stroke={2} /></span>
            <div style={{ flex: 1 }}>
              <h2 id="h-rec">Dónde y cuándo se recoge</h2>
              <strong className="dsp" style={{ fontSize: '1.3rem' }}>{market.name}</strong>
              <p className="b">{dayLong(market.nextDate)}, {market.hours}</p>
              <a href={mapUrl} target="_blank" rel="noopener noreferrer">Ver en el mapa<span className="sr-only"> (se abre en otra pestaña)</span></a>
            </div>
          </section>
          <p><strong>¿No puedes ir ese día?</strong> Puede recogerlo otra persona enseñando tu código, o puedes borrarte sin pagar nada hasta el {deadlineSentence(lot)}.</p>

          <div className={styles.cta}>
            {mode === 'confirm' && (
              <div role="dialog" aria-labelledby="c-t" ref={confirmRef} tabIndex={-1} className="dialog-box">
                <h2 id="c-t" className="dsp" style={{ fontSize: '1.5rem' }}>Revisa antes de apuntarte</h2>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <li style={{ display: 'flex', gap: 10 }}><Icon name="check" size={24} stroke={2.8} style={{ color: 'var(--verde-oscuro)', marginTop: 2 }} /><span><strong>{kilos(lot.perPerson)}</strong> de {lot.name.toLowerCase()}</span></li>
                  <li style={{ display: 'flex', gap: 10 }}><Icon name="check" size={24} stroke={2.8} style={{ color: 'var(--verde-oscuro)', marginTop: 2 }} /><span>Pagarás <strong>{eur(maxPayJoin)} como mucho</strong>, solo si se llega a {lot.min} personas</span></li>
                  <li style={{ display: 'flex', gap: 10 }}><Icon name="check" size={24} stroke={2.8} style={{ color: 'var(--verde-oscuro)', marginTop: 2 }} /><span>Lo recoges el <strong>{dayLong(market.nextDate)}</strong> en el {market.name}</span></li>
                </ul>
                <div style={{ background: 'var(--verde-suave)', borderRadius: 18, padding: '14px 16px', display: 'flex', gap: 12 }}>
                  <Icon name="card" size={24} style={{ color: 'var(--verde-oscuro)', marginTop: 2 }} />
                  <div>
                    <p>Pagarás con tu tarjeta acabada en <strong>{state.account.cardLast4}</strong>. <strong>La guardamos, pero no te cobramos nada</strong> hasta que se confirme la compra.</p>
                    <Link to="/mi-cuenta" style={{ display: 'inline-block', padding: '8px 0 0' }}>Usar otra tarjeta</Link>
                  </div>
                </div>
                <div className="row-btns">
                  <button type="button" className="btn" onClick={join}>Sí, apuntarme</button>
                  <button type="button" className="btn2" onClick={() => setMode('idle')}>No, volver</button>
                </div>
              </div>
            )}

            {(mode === 'idle' || mode === 'left') && !closed && role === 'buyer' && (
              <>
                <button type="button" className="btn btn-big" onClick={ask}>
                  <Icon name="bagS" size={28} stroke={2.4} />{mode === 'left' ? 'Apuntarme otra vez' : 'Apuntarme'}
                </button>
                {mode === 'idle' && <p className="mut b" style={{ textAlign: 'center' }}>Antes de apuntarte, te enseñamos un resumen.</p>}
              </>
            )}
            {(mode === 'idle' || mode === 'left') && !closed && role !== 'buyer' && !showAuth && (
              <button type="button" className="btn btn-big" onClick={ask}><Icon name="bagS" size={28} stroke={2.4} />Apuntarme</button>
            )}
            {showAuth && (
              <div role="alert" className="note note-warn" style={{ flexDirection: 'column' }}>
                {role === 'guest' ? (
                  <>
                    <span>Para apuntarte necesitas una cuenta. Es gratis y no se te cobra nada.</span>
                    <span className="row-btns" style={{ width: '100%' }}>
                      <Link className="btn" to="/acceso">Crear cuenta</Link>
                      <Link className="btn2" to="/acceso?modo=entrar">Ya tengo cuenta</Link>
                    </span>
                  </>
                ) : (
                  <span>Estás viendo la web como {role === 'producer' ? 'productor' : 'administración'}. Para apuntarte, cambia a «Persona compradora» en el selector de prototipo.</span>
                )}
              </div>
            )}
            {closed && mode !== 'joined' && <p className="note note-red">{status === 'no' ? 'Esta compra no salió adelante.' : 'Ya no se puede apuntar nadie a esta compra.'}</p>}

            {mode === 'joined' && (
              <>
                <Link className="btn btn-xl" to="/mis-compras">Ver mis compras</Link>
                <button type="button" className="btn2 danger" onClick={() => go('leave')}>Borrarme de esta compra</button>
              </>
            )}
            {mode === 'leave' && (
              <div role="dialog" aria-labelledby="l-t" ref={leaveRef} tabIndex={-1} className="dialog-box red">
                <h2 id="l-t" className="dsp" style={{ fontSize: '1.45rem' }}>¿Quieres borrarte de esta compra?</h2>
                <p>Dejarás tu sitio libre y no pagarás nada. Si cambias de idea, podrás volver a apuntarte hasta el {deadlineCap}.</p>
                <div className="row-btns">
                  <button type="button" className="btn btn-red" onClick={leave}>Sí, borrarme</button>
                  <button type="button" className="btn2" onClick={() => setMode('joined')}>No, seguir apuntada</button>
                </div>
              </div>
            )}
          </div>
        </aside>

        <section className={`card ${styles.desc}`} aria-labelledby="h-desc">
          <h2 id="h-desc" className="dsp">Cómo es {lot.name.toLowerCase().startsWith('a') ? 'esta' : 'este'} {lot.name.split(' ')[0].toLowerCase()}</h2>
          <p>{lot.description}</p>
          <div className={styles.facts}>
            <div className={styles.fact}><span className="mut">En total</span><strong className="dsp">{lot.totalKg} kilos</strong></div>
            <div className={styles.fact}><span className="mut">Tu parte</span><strong className="dsp">{kilos(lot.perPerson)}</strong></div>
            <div className={styles.fact}><span className="mut">Hay sitio para</span><strong className="dsp">{lot.max} personas</strong></div>
          </div>
        </section>

        <section className={`card ${styles.producer}`} aria-label="Quién lo vende">
          <span className={`dsp ${styles.pAv}`} aria-hidden="true">{lot.producerName.split(' ').filter((w) => w.length > 2).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>
          <div className={styles.pBody}>
            <span className="mut b">Lo vende</span>
            <h2 className="dsp">{lot.producerName}</h2>
            <p className="mut">{lot.town} · ha entregado {lot.deliveries} veces</p>
          </div>
        </section>
      </div>
    </Page>
  );
}
