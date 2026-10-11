import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { LotCard } from '../components/LotCard';
import { Page } from '../components/Layout';
import { EggplantBasket, PeaPod, TomatoHello, Veg } from '../components/Veg';
import { useStore } from '../state/store';
import { lotsService } from '../services/lots';
import { useTitle } from '../state/useTitle';
import styles from './Home.module.css';

function Art({ desktop }: { desktop?: boolean }) {
  return (
    <div className={`${styles.art} ${desktop ? styles.artD : ''}`} aria-hidden="true">
      <span className={styles.artC1} /><span className={styles.artC2} />
      <span style={{ position: 'absolute', left: '8%', top: '12%' }}><Veg kind="tomate" size={desktop ? 110 : 76} /></span>
      <span style={{ position: 'absolute', right: '10%', top: '14%' }}>
        <svg width={desktop ? 100 : 70} height={desktop ? 100 : 70} viewBox="0 0 64 64" focusable="false"><path d="M42 20c9 7 8 22-2 31-9 8-24 6-26-4-1-8 7-12 12-18 4-5 7-12 16-9z" fill="#6A4C93" /><path d="M34 17c5-2 12 2 13 9-4-3-9-3-13-1-1-3-1-6 0-8z" fill="#1F5A27" /></svg>
      </span>
      <span style={{ position: 'absolute', left: '34%', bottom: '8%', transform: 'rotate(-20deg)' }}>
        <svg width={desktop ? 110 : 76} height={desktop ? 110 : 76} viewBox="0 0 64 64" focusable="false"><path d="M20 24c6-5 20-5 26 1L33 57c-1.5 3-4.5 3-6 0z" fill="#F4A261" stroke="#FFF8EC" strokeWidth="2" /><path d="M33 22c-1-7 1-13 5-15M33 22c4-5 9-7 13-6M32 22c-4-4-9-6-13-4" stroke="#1F5A27" strokeWidth="3.5" fill="none" strokeLinecap="round" /></svg>
      </span>
      <span style={{ position: 'absolute', right: '9%', bottom: '10%' }}>
        <svg width={desktop ? 100 : 70} height={desktop ? 100 : 70} viewBox="0 0 64 64" focusable="false"><ellipse cx="32" cy="36" rx="22" ry="16" fill="#FFD23F" stroke="#FFF8EC" strokeWidth="2" transform="rotate(-25 32 36)" /><path d="M44 18c2-7 9-9 13-8-2 6-8 9-13 8z" fill="#1F5A27" /></svg>
      </span>
    </div>
  );
}

export default function Home() {
  useTitle('Compra en grupo, directo del huerto');
  const { state } = useStore();
  const lots = lotsService.listed(state.createdLots);
  const featured = ['tomate', 'naranja', 'calabacin'].map((id) => lots.find((l) => l.id === id)).filter(Boolean) as typeof lots;
  return (
    <Page>
      <section className={styles.hero}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 className="dsp">Compra en grupo, directo del huerto a tu mercado</h1>
          <p className={styles.lead}>Los agricultores de la zona ponen a la venta lo que les sobra de la cosecha. <strong>Cuantas más personas os apuntéis, más barato sale.</strong> Si no se llega al mínimo, no pagas nada.</p>
        </div>
        <Art desktop />
      </section>

      <section aria-labelledby="h-que" className={styles.choices}>
        <h2 id="h-que" className="dsp">¿Qué quieres hacer?</h2>
        <div className={styles.choiceGrid}>
          <Link to="/productos" className={styles.choice} style={{ background: '#2E7D38', boxShadow: '0 5px 0 #1F5A27' }}>
            <span className={styles.ci} style={{ color: '#2E7D38' }}><Icon name="bag" size={40} stroke={2} /></span>
            <span className={styles.choiceTxt}><span className={`dsp ${styles.choiceTitle}`}>Quiero comprar</span><span className={styles.choiceSub}>Apúntate a compras en grupo y paga menos por producto de aquí.</span></span>
            <Icon className={styles.choiceArrow} name="arrow" size={34} stroke={2.6} />
          </Link>
          <Link to="/acceso?tipo=vender" className={styles.choice} style={{ background: '#6A4C93', boxShadow: '0 5px 0 #4E3474' }}>
            <span className={styles.ci} style={{ color: '#6A4C93' }}><Icon name="leaf" size={40} stroke={2} /></span>
            <span className={styles.choiceTxt}><span className={`dsp ${styles.choiceTitle}`}>Quiero vender mis productos</span><span className={styles.choiceSub}>Pon a la venta lo que te sobra de la cosecha. Te ayudamos por teléfono.</span></span>
            <Icon className={styles.choiceArrow} name="arrow" size={34} stroke={2.6} />
          </Link>
        </div>
      </section>
      <Art />

      <section id="como" aria-labelledby="h-como" className={styles.how}>
        <h2 id="h-como" className="dsp">Así de fácil</h2>
        <ol className={styles.steps}>
          <li className={styles.step} style={{ background: '#FDE4E6' }}>
            <span className={styles.stepArt}><TomatoHello /><span className={`dsp ${styles.stepNum}`} style={{ background: '#C62F3B' }} aria-hidden="true">1</span></span>
            <h3 className="dsp">1. Te apuntas</h3><p>Eliges lo que te apetece. <strong>Aún no pagas nada.</strong></p>
          </li>
          <li className={styles.step} style={{ background: '#E4F3DA' }}>
            <span className={styles.stepArt}><PeaPod /><span className={`dsp ${styles.stepNum}`} style={{ background: '#2E7D38' }} aria-hidden="true">2</span></span>
            <h3 className="dsp">2. Se junta gente</h3><p>Si se apunta bastante gente, se compra. <strong>Si no, nadie paga.</strong></p>
          </li>
          <li className={styles.step} style={{ background: '#ECE4F6' }}>
            <span className={styles.stepArt}><EggplantBasket /><span className={`dsp ${styles.stepNum}`} style={{ background: '#6A4C93' }} aria-hidden="true">3</span></span>
            <h3 className="dsp">3. Lo recoges</h3><p>En tu mercado, el día que toca.</p>
          </li>
        </ol>
      </section>

      <section aria-labelledby="h-llenan" className={styles.filling}>
        <div className={styles.fillHead}>
          <h2 id="h-llenan" className="dsp">Productos que se están llenando</h2>
          <Link to="/productos" style={{ fontSize: '1.05rem' }}>Ver todos los productos</Link>
        </div>
        <div className={styles.grid3}>{featured.map((l) => <LotCard key={l.id} lot={l} headingLevel={3} />)}</div>
      </section>

      <section aria-labelledby="h-faq" className={styles.faq}>
        <h2 id="h-faq" className="dsp">Preguntas que nos hacen a menudo</h2>
        <div className={styles.faqGrid}>
          <div className={styles.faqItem}><h3 className="dsp">¿Y si no se apunta suficiente gente?</h3><p>No pagas nada. La compra no sale adelante y no se cobra a nadie.</p></div>
          <div className={styles.faqItem}><h3 className="dsp">¿Cuándo pago?</h3><p>Solo cuando la compra se confirma, al acabar el plazo para apuntarse.</p></div>
          <div className={styles.faqItem}><h3 className="dsp">¿Dónde lo recojo?</h3><p>En tu mercado municipal, un día fijo a la semana. Te lo recordamos antes.</p></div>
        </div>
      </section>
    </Page>
  );
}
