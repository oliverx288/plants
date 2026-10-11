import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { BG_BY_PRODUCT } from '../components/ProducerBits';
import { RequireRole } from '../components/RequireRole';
import { StatusPill } from '../components/StatusPill';
import { Veg } from '../components/Veg';
import { eur } from '../services/format';
import { lotsService } from '../services/lots';
import { useStore } from '../state/store';
import { useTitle } from '../state/useTitle';
import styles from './Producer.module.css';

export async function copyShareLink(id: string): Promise<void> {
  const url = `${window.location.origin}/productos/${id}`;
  try { await navigator.clipboard.writeText(url); } catch { /* sin portapapeles: el aviso sigue siendo válido en el prototipo */ }
}

export default function ProducerDone() {
  const { state } = useStore();
  const lot = lotsService.get(state.lastCreated ?? undefined, state.createdLots);
  const [shared, setShared] = useState(false);
  useTitle('¡Ya está a la venta!');
  if (!lot) return <Navigate to="/productor" replace />;
  return (
    <Page>
      <RequireRole roles={['producer']}>
        <div className={styles.stepWrap}>
          <div className={styles.listo}>
            <section role="status" style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start' }}>
              <span className={styles.bigOk}><Icon name="check" size={56} stroke={3} /></span>
              <h1 className="dsp" style={{ fontSize: '2.5rem', lineHeight: 1.05 }}>¡Tu {lot.name.toLowerCase()} ya está a la venta!</h1>
              <p style={{ fontSize: '1.2rem' }}>Ya se pueden apuntar. <strong>Te mandaremos un SMS</strong> cada vez que se apunte alguien y cuando se llegue a {lot.min} personas.</p>
              <p className="mut">Mientras no se apunte nadie, puedes cambiar lo que quieras.</p>
              {shared && <p role="status" className="note note-green" style={{ alignItems: 'center' }}><Icon name="check" size={22} stroke={3} />Enlace copiado. Pégalo en WhatsApp o en un mensaje a tus clientes.</p>}
              <button type="button" className="btn btn-xl" onClick={async () => { await copyShareLink(lot.id); setShared(true); }}><Icon name="share" size={26} />Compartir con mis clientes</button>
              <Link className="btn2" to="/productor">Volver a mi panel</Link>
            </section>
            <aside aria-label="Así lo ven los compradores" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="mut b">Así lo ven los compradores</span>
              <article className="card" style={{ overflow: 'hidden' }}>
                <div style={{ height: '8.5rem', background: BG_BY_PRODUCT[lot.product], display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Veg kind={lot.product} size={96} /></div>
                <div style={{ padding: '1.3rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <StatusPill status="curso" />
                  <h2 className="dsp" style={{ fontSize: '1.45rem' }}>{lot.name}</h2>
                  <p><strong className="dsp" style={{ fontSize: '1.4rem' }}>0 de {lot.min}</strong> personas apuntadas</p>
                  <div className="bar" style={{ marginTop: 8 }} role="img" aria-label={`0 de ${lot.min} personas apuntadas`}><b className="flag" style={{ left: `${(lot.min / lot.max) * 100}%` }} /></div>
                  <p style={{ marginTop: 8 }}><strong className="dsp" style={{ fontSize: '1.6rem', color: 'var(--verde-oscuro)' }}>{eur(lot.tiers[0].price)}</strong> el kilo</p>
                </div>
              </article>
            </aside>
          </div>
        </div>
      </RequireRole>
    </Page>
  );
}
