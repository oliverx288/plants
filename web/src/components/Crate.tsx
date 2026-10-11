import type { Lot } from '../data/lots';
import { eur } from '../services/format';
import { Veg } from './Veg';
import styles from './Crate.module.css';

interface Props { lot: Lot; count: number; youIn: boolean }

interface Lab { text: string; kind: 'min' | 'tier' | 'max' }

/** Cajón de madera: un hueco por persona (hasta el máximo), en filas de 5, que se llena de abajo arriba. */
export function Crate({ lot, count, youIn }: Props) {
  const rowsN = Math.ceil(lot.max / 5);
  const labels = new Map<number, Lab[]>();
  const add = (n: number, l: Lab) => labels.set(Math.ceil(n / 5), [...(labels.get(Math.ceil(n / 5)) ?? []), l]);
  add(lot.min, { kind: 'min', text: `⚑ Mínimo: ${lot.min}` });
  lot.tiers.slice(1).forEach((t) => add(t.from, { kind: 'tier', text: `${t.from} · baja a ${eur(t.price)}` }));
  add(lot.max, { kind: 'max', text: `${lot.max} · cajón lleno` });
  const marked = new Map<number, 'min' | 'tier'>();
  if (lot.min % 5 !== 0) marked.set(lot.min, 'min');
  lot.tiers.slice(1).forEach((t) => { if (t.from % 5 !== 0) marked.set(t.from, 'tier'); });

  const rows = [];
  for (let r = rowsN; r >= 1; r--) {
    const ls = labels.get(r);
    const kind = ls?.some((l) => l.kind === 'min') ? 'min' : ls?.some((l) => l.kind === 'tier') ? 'tier' : undefined;
    const cls = r === rowsN && kind !== 'min' && kind !== 'tier' ? styles.first : kind === 'min' ? styles.min : kind === 'tier' ? styles.tier : '';
    const cells = [];
    for (let k = 1; k <= 5; k++) {
      const i = (r - 1) * 5 + k;
      if (i > lot.max) { cells.push(<span key={k} className={styles.slot} style={{ visibility: 'hidden' }} />); continue; }
      const full = i <= count;
      const mine = youIn && i === count;
      const m = marked.get(i);
      cells.push(
        <span key={k} className={[styles.slot, full ? '' : styles.empty, mine ? styles.mine : '', m === 'min' ? styles.mark : m === 'tier' ? styles.markTier : ''].join(' ')}>
          {full && <Veg kind={lot.product} size={60} />}
          {mine && <span className={styles.you}>Tú</span>}
        </span>,
      );
    }
    rows.push({ r, cls, cells, ls });
  }
  return (
    <div className={styles.wrap} role="img" aria-label={`Cajón con ${count} de ${lot.max} plazas ocupadas: ${count} personas apuntadas. El mínimo es ${lot.min}.`}>
      <div className={styles.crate}>
        {rows.map((row) => <div key={row.r} className={`${styles.row} ${row.cls}`}>{row.cells}</div>)}
      </div>
      <div className={styles.labels} aria-hidden="true">
        {rows.map((row) => (
          <div key={row.r} className={styles.lab}>
            {row.ls && (
              <span className={styles[row.ls[0].kind === 'min' ? 'lMin' : row.ls[0].kind === 'tier' ? 'lTier' : 'lMax']}>
                {row.ls.map((l) => <span key={l.text}>{l.text}</span>)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
