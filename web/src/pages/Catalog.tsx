import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { LotCard } from '../components/LotCard';
import { Page } from '../components/Layout';
import { CATEGORIES, type CatKey } from '../data/lots';
import { MARKETS } from '../data/markets';
import { lotsService, timeLeft } from '../services/lots';
import { useStore } from '../state/store';
import { useNow } from '../state/useNow';
import { useTitle } from '../state/useTitle';
import styles from './Catalog.module.css';

type Cat = CatKey | 'all';
type When = 'week' | 'soon' | 'any';

export default function Catalog() {
  useTitle('Productos a la venta');
  const { state } = useStore();
  const at = useNow();
  const [cat, setCat] = useState<Cat>('all');
  const [market, setMarket] = useState('all');
  const [when, setWhen] = useState<When>('week');
  const [exc, setExc] = useState(false);
  const [cal, setCal] = useState(false);

  const all = lotsService.listed(state.createdLots);
  const list = useMemo(() => all.filter((l) => {
    if (cat !== 'all' && l.cat !== cat) return false;
    if (market !== 'all' && l.marketId !== market) return false;
    const left = timeLeft(l, at).ms;
    if (when === 'soon' && left > 36 * 36e5) return false;
    if (when === 'week' && left > 7 * 864e5) return false;
    if (exc && !l.tags.includes('exc')) return false;
    if (cal && !l.tags.includes('cal')) return false;
    return true;
  }), [all, cat, market, when, exc, cal, at]);

  const clear = () => { setCat('all'); setMarket('all'); setWhen('week'); setExc(false); setCal(false); };
  const chips: { id: Cat; label: string; bg: string; fg: string; dot: string }[] = [
    { id: 'all', label: 'Todo', bg: '#23301F', fg: '#FFFDF8', dot: '#3FA34D' },
    ...(Object.keys(CATEGORIES) as CatKey[]).map((k) => ({ id: k as Cat, ...CATEGORIES[k] })),
  ];

  return (
    <Page>
      <div className={styles.wrap}>
        <div>
          <h1 className="dsp">Productos a la venta</h1>
          <p className={styles.sub}>Elige uno y apúntate. <strong>Solo pagas si se juntan las personas necesarias.</strong></p>
        </div>

        <section aria-label="Filtrar productos" className={`card ${styles.filters}`}>
          <div role="group" aria-labelledby="f-tipo" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span id="f-tipo" className="b" style={{ fontSize: '1.05rem' }}>¿Qué buscas?</span>
            <div className={styles.chips}>
              {chips.map((c) => (
                <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}
                  className={`${styles.cat} ${cat === c.id ? styles.catOn : ''}`} style={{ background: c.bg, color: c.fg }}>
                  <span className={styles.dot} aria-hidden="true"><svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill={c.dot} /></svg></span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.row}>
            <div className="fld"><label className="lab" htmlFor="f-punto">Dónde lo recoges</label>
              <select id="f-punto" className="in" value={market} onChange={(e) => setMarket(e.target.value)}>
                <option value="all">Todos los mercados</option>
                {MARKETS.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.dayLabel.toLowerCase()})</option>)}
              </select></div>
            <div className="fld"><label className="lab" htmlFor="f-fecha">Último día para apuntarse</label>
              <select id="f-fecha" className="in" value={when} onChange={(e) => setWhen(e.target.value as When)}>
                <option value="week">Esta semana</option><option value="soon">Hoy o mañana</option><option value="any">Cualquier día</option>
              </select></div>
            <div role="group" aria-label="Cómo es el producto" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" aria-pressed={exc} className={`${styles.tgl} ${exc ? styles.tglOn : ''}`} onClick={() => setExc(!exc)}>{exc && <Icon name="check" size={20} stroke={3} />}Sobra de cosecha</button>
              <button type="button" aria-pressed={cal} className={`${styles.tgl} ${cal ? styles.tglOn : ''}`} onClick={() => setCal(!cal)}>{cal && <Icon name="check" size={20} stroke={3} />}Tamaño irregular</button>
            </div>
            <button type="button" className="link-btn" onClick={clear}>Borrar filtros</button>
          </div>
        </section>

        <p role="status" className={styles.count}>{list.length === 1 ? 'Hay 1 producto a la venta' : `Hay ${list.length} productos a la venta`}</p>

        {list.length > 0 ? (
          <div className={styles.grid}>{list.map((l) => <LotCard key={l.id} lot={l} />)}</div>
        ) : (
          <div className={`card ${styles.empty}`}>
            <strong className="dsp" style={{ fontSize: '1.6rem' }}>Ahora no hay productos de este tipo</strong>
            <p>Los agricultores ponen productos a la venta cada semana. Prueba con otro tipo o vuelve en unos días.</p>
            <button type="button" className="btn2" onClick={clear}>Ver todos los productos</button>
          </div>
        )}
      </div>
    </Page>
  );
}
