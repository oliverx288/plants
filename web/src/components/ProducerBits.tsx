import { Link } from 'react-router-dom';
import type { VegKey } from '../data/lots';
import { Icon } from './Icon';
import { Veg } from './Veg';
import styles from '../pages/Producer.module.css';

export const BG_BY_PRODUCT: Record<VegKey, string> = {
  tomate: '#FDE4E6', pimiento: '#FDE4E6', patata: '#FDE7D3', zanahoria: '#FDE7D3', calabacin: '#DDF1DF',
  judia: '#ECE4F6', naranja: '#FFF1B8', manzana: '#FFF1B8', otro: '#EFE3C8',
};

export function VegBubble({ kind, size = 4, bg }: { kind: VegKey; size?: number; bg?: string }) {
  return (
    <span className={styles.ic} style={{ background: bg ?? BG_BY_PRODUCT[kind], width: `${size}rem`, height: `${size}rem` }}>
      <Veg kind={kind} size={Math.round(size * 12)} />
    </span>
  );
}

const STEPS = ['Qué vendes', 'Cantidad', 'Precio', 'Recogida y resumen'];

export function Stepper({ current }: { current: number }) {
  return (
    <ol aria-label="Pasos para poner a la venta" className={styles.steps}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const inner = (
          <>
            <span className={styles.sn} style={n < current ? { background: 'var(--verde)', color: '#fff' } : n === current ? { background: '#FFFDF8', color: 'var(--verde)' } : { border: '2.5px solid var(--texto-2)' }}>
              {n < current ? <Icon name="check" size={20} stroke={3.2} /> : n}
            </span>
            <span className={styles.stpTxt}>
              <span style={{ display: 'block', fontWeight: n < current ? 400 : undefined }} className={n > current ? 'mut' : undefined}>Paso {n}{n < current ? ' · hecho' : ''}</span>
              <strong>{label}</strong>
            </span>
            <span className="sr-only">{n === current ? `Paso ${n} de 4: ${label}, paso actual` : n < current ? `Paso ${n}: ${label}, hecho` : `Paso ${n}: ${label}`}</span>
          </>
        );
        if (n < current) return <li key={n}><Link to={`/productor/vender/${n}`} className={`${styles.stp} ${styles.stpDone}`}>{inner}</Link></li>;
        return <li key={n} aria-current={n === current ? 'step' : undefined} className={`${styles.stp} ${n === current ? styles.stpCur : styles.stpTodo}`}>{inner}</li>;
      })}
    </ol>
  );
}
