import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { RequireRole } from '../components/RequireRole';
import { StatusPill } from '../components/StatusPill';
import { Veg } from '../components/Veg';
import { PAST_PURCHASES } from '../data/past';
import { getMarket } from '../data/markets';
import { category, currentPrice, isLastDay, lotsService, peopleCount, statusOf, STATUS_LABEL, type LotStatus } from '../services/lots';
import { dayLong, dayShort, eur, kilos, plural, sameMadridDay, timeOf } from '../services/format';
import { useStore } from '../state/store';
import { useNow } from '../state/useNow';
import { useTitle } from '../state/useTitle';
import styles from './MyPurchases.module.css';

const PICKUP_CODE = '4F7 K2Q';

export function QrArt() {
  // Dibujo de ejemplo: no es un QR real, se genera de forma estable a partir del código.
  const n = 13;
  let seed = [...PICKUP_CODE].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const cells: JSX.Element[] = [];
  const finder = (x: number, y: number) => (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let on = rnd() > 0.5;
    if (finder(x, y)) {
      const fx = x < 7 ? x : x - (n - 7);
      const fy = y < 7 ? y : y - (n - 7);
      on = fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4);
    }
    if (on) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#23301F" />);
  }
  return (
    <svg className={styles.qr} viewBox={`-0.5 -0.5 ${n + 1} ${n + 1}`} role="img" aria-label="Código QR para enseñar en el puesto" shapeRendering="crispEdges">
      {cells}
    </svg>
  );
}

type Row = {
  id: string; status: LotStatus; product: Parameters<typeof Veg>[0]['kind']; tile: string; name: string; what: string;
  amount: string; charge: string; action: string; href: string; amountMuted?: boolean;
};

export default function MyPurchases() {
  useTitle('Mis compras');
  const { state } = useStore();
  const at = useNow();
  const [showCode, setShowCode] = useState(false);
  const [filter, setFilter] = useState<'all' | LotStatus>('all');

  const rows: Row[] = useMemo(() => {
    const mine = lotsService.all(state.createdLots).filter((l) => state.joined.includes(l.id));
    const live: Row[] = mine.map((l) => {
      const count = peopleCount(l, state.joined);
      const status = statusOf(l, count, state.cancelled);
      const m = getMarket(l.marketId);
      const falta = Math.max(0, l.min - count);
      const hot = isLastDay(l, at);
      const what = status === 'conf'
        ? `Recoge tu parte el ${dayShort(m.nextDate)}, de ${m.hoursShort}, en el ${m.name}.`
        : hot
          ? `Faltan ${falta} ${plural(falta, 'persona', 'personas')}. ¡Se cierra ${sameMadridDay(at, l.deadline) ? 'hoy' : 'mañana'} a las ${timeOf(l.deadline)}!`
          : `Faltan ${falta} ${plural(falta, 'persona', 'personas')}. Puedes apuntarte hasta el ${dayShort(l.deadline)}.`;
      return {
        id: l.id, status, product: l.product, tile: category(l).bg, name: `${l.name} · ${kilos(l.perPerson)}`, what,
        amount: eur(l.perPerson * currentPrice(l, count)),
        charge: status === 'conf' ? `se cobra el ${dayShort(l.deadline)}` : 'como mucho · aún no has pagado',
        action: 'Ver detalles', href: `/productos/${l.id}`,
      };
    });
    const past: Row[] = PAST_PURCHASES.map((p) => ({ ...p, product: p.product, amountMuted: p.status === 'no' }));
    return [...live, ...past];
  }, [state.joined, state.cancelled, state.createdLots, at]);

  const count = (s: LotStatus) => rows.filter((r) => r.status === s).length;
  const tabs: { id: 'all' | LotStatus; label: string; n: number; bg: string; fg: string }[] = [
    { id: 'all', label: 'Todas', n: rows.length, bg: '#23301F', fg: '#FFFDF8' },
    { id: 'curso', label: 'En curso', n: count('curso'), bg: '#F4A261', fg: '#2E1603' },
    { id: 'conf', label: 'Confirmadas', n: count('conf'), bg: '#2E7D38', fg: '#fff' },
    { id: 'no', label: 'No salieron adelante', n: count('no'), bg: '#C62F3B', fg: '#fff' },
    { id: 'rec', label: 'Recogidas', n: count('rec'), bg: '#6A4C93', fg: '#fff' },
  ];
  const shown = rows.filter((r) => filter === 'all' || r.status === filter);
  const confLots = lotsService.all(state.createdLots).filter((l) => state.joined.includes(l.id) && statusOf(l, peopleCount(l, state.joined), state.cancelled) === 'conf');
  const nextMarket = confLots.length ? getMarket(confLots.map((l) => l.marketId).sort((a, b) => getMarket(a).nextDate.localeCompare(getMarket(b).nextDate))[0]) : null;
  const names = confLots.filter((l) => nextMarket && l.marketId === nextMarket.id).map((l) => `${l.name.split(' ')[0].toLowerCase()} (${kilos(l.perPerson)})`);

  return (
    <Page>
      <RequireRole roles={['buyer']}>
        <div className={styles.wrap}>
          <h1 className="dsp">Mis compras</h1>

          {nextMarket ? (
            <section aria-labelledby="h-prox" className={styles.next}>
              <span className={styles.nextC} aria-hidden="true" />
              <span className={styles.nextIcon}><Icon name="bag" size={40} stroke={2} /></span>
              <div className={styles.nextBody}>
                <h2 id="h-prox">Tu próxima recogida</h2>
                <strong className={`dsp ${styles.nextBig}`}>{dayLong(nextMarket.nextDate)}, {nextMarket.hours}</strong>
                <span style={{ fontSize: '1.05rem' }}>En el {nextMarket.name} · Te llevas: {names.join(' y ')}</span>
              </div>
              <button type="button" className={`btn ${styles.nextBtn}`} aria-expanded={showCode} aria-controls="codigo" onClick={() => setShowCode(!showCode)}>
                <Icon name="qr" size={24} />{showCode ? 'Ocultar mi código' : 'Ver mi código de recogida'}
              </button>
            </section>
          ) : (
            <section aria-labelledby="h-prox" className="card" style={{ padding: '1.3rem' }}>
              <h2 id="h-prox" className="dsp" style={{ fontSize: '1.4rem' }}>Aún no tienes ninguna recogida</h2>
              <p>Cuando una compra se confirme, aquí verás dónde y cuándo recogerla, con tu código.</p>
              <Link to="/productos" className="btn2" style={{ marginTop: 10 }}>Ver productos a la venta</Link>
            </section>
          )}

          {showCode && nextMarket && (
            <section id="codigo" role="region" aria-label="Código de recogida" className={`card ${styles.code}`}>
              <QrArt />
              <div className={styles.codeTxt}>
                <h2 className="dsp" style={{ fontSize: '1.5rem' }}>Enséñalo en el puesto de Lot a Lot</h2>
                <p style={{ fontSize: '1.1rem' }}>Si no puedes enseñar el móvil, di este código en voz alta:</p>
                <strong className={`dsp ${styles.codeBig}`} aria-label={PICKUP_CODE.split('').join(' ')}>{PICKUP_CODE}</strong>
                <p className="mut">También te lo hemos mandado por SMS.</p>
                <p className={styles.pass}><strong>¿No puedes ir el {nextMarket.dayLabel.toLowerCase().replace(/s$/, '')}?</strong> Pásale este código a otra persona y podrá recogerlo por ti.</p>
              </div>
            </section>
          )}

          <div role="tablist" aria-label="Ver compras según cómo van" className={styles.tabs}>
            {tabs.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={filter === t.id} className={`${styles.tab} ${filter === t.id ? styles.tabOn : ''}`} onClick={() => setFilter(t.id)}>
                <span className={styles.n} style={{ background: t.bg, color: t.fg }}>{t.n}</span>{t.label}
              </button>
            ))}
          </div>

          <section className={`card ${styles.list}`} aria-label="Lista de compras" role="tabpanel">
            {shown.length === 0 && <p className={styles.empty}>No tienes compras de este tipo ({filter === 'all' ? '' : STATUS_LABEL[filter as LotStatus].toLowerCase()}).</p>}
            {shown.map((r) => (
              <article key={r.id} className={styles.row}>
                <div className={styles.head}>
                  <div className={styles.tile} style={{ background: r.tile }}><Veg kind={r.product} size={62} /></div>
                  <div className={styles.headTxt}>
                    <h2 className={`dsp ${styles.nm}`}>{r.name}</h2>
                    <StatusPill status={r.status} size={20} />
                  </div>
                </div>
                <p style={{ fontSize: '1.05rem' }}>{r.what}</p>
                <div>
                  <strong className={`dsp ${styles.amt}`} style={{ color: r.amountMuted ? 'var(--texto-2)' : 'var(--verde-oscuro)' }}>{r.amount}</strong>
                  <p className="mut b">{r.charge}</p>
                </div>
                <Link className="btn2" to={r.href}>{r.action}</Link>
              </article>
            ))}
          </section>
        </div>
      </RequireRole>
    </Page>
  );
}
