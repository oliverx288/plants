import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { MARKETS } from '../data/markets';
import { dayLong } from '../services/format';
import { useTitle } from '../state/useTitle';

export default function Markets() {
  useTitle('Dónde se recoge');
  return (
    <Page>
      <div style={{ padding: '1rem var(--pad) 3rem', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h1 className="dsp" style={{ fontSize: '2.3rem' }}>Dónde se recoge</h1>
          <p style={{ marginTop: 6, fontSize: '1.1rem' }}>Recogida semanal en mercados municipales. Enseñas tu código en el puesto de Lot a Lot y te llevas tu parte.</p>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(17rem, 1fr))' }}>
          {MARKETS.filter((m) => m.active).map((m) => (
            <li key={m.id} className="card" style={{ padding: '1.3rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ width: '3.1rem', height: '3.1rem', borderRadius: 16, background: 'var(--berenjena)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="pin" size={28} stroke={2} /></span>
              <h2 className="dsp" style={{ fontSize: '1.35rem' }}>{m.name}</h2>
              <p className="mut">{m.city}</p>
              <p className="b">{m.dayLabel}, {m.hours}</p>
              <p>Próxima recogida: <strong>{dayLong(m.nextDate)}</strong></p>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${m.name} ${m.city}`)}`} target="_blank" rel="noopener noreferrer" style={{ padding: '0.5rem 0' }}>Ver en el mapa<span className="sr-only"> de {m.name} (se abre en otra pestaña)</span></a>
            </li>
          ))}
        </ul>
        <p className="mut">¿No puedes ir ese día? Puede recogerlo otra persona con tu código. <Link to="/productos">Ver productos a la venta</Link></p>
      </div>
    </Page>
  );
}
