import { Link } from 'react-router-dom';
import type { Lot } from '../data/lots';
import { category, currentPrice, isLastDay, joinWindowText, needText, peopleCount, statusOf, subline, tagsOf } from '../services/lots';
import { eur } from '../services/format';
import { useStore } from '../state/store';
import { useNow } from '../state/useNow';
import { Icon } from './Icon';
import { StatusPill } from './StatusPill';
import { Veg } from './Veg';
import styles from './LotCard.module.css';

export function LotCard({ lot, headingLevel = 2 }: { lot: Lot; headingLevel?: 2 | 3 }) {
  const { state } = useStore();
  const at = useNow();
  const count = peopleCount(lot, state.joined);
  const status = statusOf(lot, count, state.cancelled);
  const cat = category(lot);
  const H = (`h${headingLevel}`) as 'h2' | 'h3';
  const hot = isLastDay(lot, at);
  return (
    <article className={`card ${styles.card}`}>
      <div className={styles.top} style={{ background: cat.bg }}>
        <Veg kind={lot.product} size={lot.product === 'calabacin' || lot.product === 'judia' ? 104 : 96} />
        <span className={`tag ${styles.cat}`} style={{ color: cat.fg }}>{cat.label}</span>
      </div>
      <div className={styles.body}>
        <StatusPill status={status} />
        <div>
          <H className={`dsp ${styles.name}`}>{lot.name}</H>
          <p className="mut" style={{ marginTop: 2 }}>{subline(lot)}</p>
          {lot.tags.length > 0 && (
            <div className={styles.tags} style={{ marginTop: 8 }}>
              {tagsOf(lot).map((t) => <span key={t.label} className={`tag ${t.cls}`}>{t.label}</span>)}
            </div>
          )}
        </div>
        <div>
          <p><strong className={`dsp ${styles.count}`}>{count}</strong> personas apuntadas</p>
          <p className="mut b">Mínimo para comprar: {lot.min}</p>
          <div className="bar" style={{ marginTop: 16 }} role="img" aria-label={`${count} de ${lot.max} plazas ocupadas. El mínimo es ${lot.min}.`}>
            <i style={{ width: `${Math.min(100, (count / lot.max) * 100)}%` }} />
            <b className="flag" style={{ left: `${(lot.min / lot.max) * 100}%` }} />
          </div>
          <p className={styles.need} style={{ color: status === 'conf' ? 'var(--verde-oscuro)' : 'var(--aviso-texto)' }}>{needText(lot, count, status)}</p>
        </div>
        <div className={styles.price}>
          <p className="b">Pagas como máximo</p>
          <p><strong className={`dsp ${styles.priceBig}`}>{eur(currentPrice(lot, count))}</strong> el kilo</p>
          <p className={styles.down}>↓ Puede bajar si se apunta más gente</p>
        </div>
        <p className={styles.time} style={{ color: hot ? 'var(--aviso-texto)' : undefined }}>
          <Icon name="clock" size={20} />{joinWindowText(lot, at)}
        </p>
        <Link className={`btn2 ${styles.cta}`} to={`/productos/${lot.id}`}>
          Ver detalles<span className="sr-only"> de {lot.name}</span>
        </Link>
      </div>
    </article>
  );
}
