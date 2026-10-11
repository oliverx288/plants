import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { BG_BY_PRODUCT, Stepper } from '../components/ProducerBits';
import { RequireRole } from '../components/RequireRole';
import { Veg } from '../components/Veg';
import type { CatKey, Lot, TagKey, VegKey } from '../data/lots';
import { MARKETS } from '../data/markets';
import { cap, dayLong, eur, eurShort, kilos } from '../services/format';
import { useStore } from '../state/store';
import { useTitle } from '../state/useTitle';
import styles from './Producer.module.css';

const PRODUCTS: { key: VegKey; label: string; name: string; cat: CatKey; price: number }[] = [
  { key: 'tomate', label: 'Tomates', name: 'Tomate de pera', cat: 'roja', price: 240 },
  { key: 'pimiento', label: 'Pimientos', name: 'Pimiento rojo', cat: 'roja', price: 260 },
  { key: 'patata', label: 'Patatas', name: 'Patata agria', cat: 'raiz', price: 80 },
  { key: 'zanahoria', label: 'Zanahorias', name: 'Zanahoria', cat: 'raiz', price: 110 },
  { key: 'calabacin', label: 'Calabacines', name: 'Calabacín', cat: 'hoja', price: 160 },
  { key: 'judia', label: 'Judías verdes', name: 'Judía verde', cat: 'legumbre', price: 320 },
  { key: 'naranja', label: 'Naranjas', name: 'Naranja navel', cat: 'fruta', price: 105 },
  { key: 'otro', label: 'Otro producto', name: '', cat: 'hoja', price: 200 },
];
const DAYS = ['2026-10-10', '2026-10-12', '2026-10-14'];
const round5 = (c: number) => Math.round(c / 5) * 5;
export const proposed = (base: number): [number, number, number] => [base, round5(base * 0.875), round5(base * 0.75)];

function Card({ children, h1, kicker }: { children: ReactNode; h1: string; kicker: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <section className={`card ${styles.form}`}>
      <div><p className={styles.kicker}>{kicker}</p><h1 ref={ref} tabIndex={-1} className="dsp" style={{ marginTop: 4 }}>{h1}</h1></div>
      {children}
    </section>
  );
}

function Stepper2({ value, onChange, min, max, step = 1, label, unit, ariaLess, ariaMore, error }:
  { value: number; onChange: (n: number) => void; min: number; max: number; step?: number; label: string; unit: string; ariaLess: string; ariaMore: string; error?: boolean }) {
  return (
    <div className={styles.num} role="group" aria-label={label}>
      <button type="button" className={styles.pm} aria-label={ariaLess} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}><Icon name="minus" size={28} stroke={3} /></button>
      <span className={`${styles.val} ${error ? styles.valErr : ''}`} role="status">{unit === 'eur' ? <>{eur(value)} <span style={{ fontSize: '.55em' }}>el kilo</span></> : <>{value} <span style={{ fontSize: '.55em' }}>{unit}</span></>}</span>
      <button type="button" className={styles.pm} aria-label={ariaMore} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}><Icon name="plus" size={28} stroke={3} /></button>
    </div>
  );
}

export default function ProducerCreate() {
  const { step = '1' } = useParams();
  const n = Number(step);
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const d = state.draft;
  const set = (patch: Partial<typeof d>) => dispatch({ type: 'draft', patch });
  const [tried, setTried] = useState(false);
  useTitle(`Poner a la venta · paso ${n}`);
  if (![1, 2, 3, 4].includes(n)) return <Navigate to="/productor/vender/1" replace />;

  const plazas = Math.floor(d.total / d.per);
  const rest = d.total - plazas * d.per;
  const maxMin = Math.max(2, Math.min(15, plazas));
  const min = Math.min(d.min, maxMin);
  const p = d.prices;
  const errs = [false, p[1] >= p[0], p[2] >= p[1]];
  const bad = errs[1] || errs[2];
  const froms = [min, min + 5, min + 10];
  const ranges = [[froms[0], froms[0] + 4], [froms[1], froms[1] + 4], [froms[2], Math.max(plazas, froms[2])]];
  const market = MARKETS.filter((m) => m.active)[d.marketIdx];
  const dayIso = DAYS[d.dayIdx];

  const pick = (k: VegKey) => {
    const pr = PRODUCTS.find((x) => x.key === k)!;
    set({ product: k, name: pr.name, prices: proposed(pr.price) });
  };

  const publish = () => {
    const pr = PRODUCTS.find((x) => x.key === d.product)!;
    const tags: TagKey[] = [...(d.exc ? ['exc' as const] : []), ...(d.cal ? ['cal' as const] : [])];
    const tiers = froms.map((from, i) => ({ from, price: p[i] })).filter((t) => t.from <= plazas);
    const lot: Lot = {
      id: `nuevo-${Date.now()}`, product: d.product, name: d.name.trim() || pr.label, cat: pr.cat,
      producerId: 'can-ribes', producerName: 'Huerta Can Ribes', area: 'Penedès', town: 'Vilafranca del Penedès', deliveries: 12,
      totalKg: d.total, perPerson: d.per, min, max: plazas, tiers, deadline: `${dayIso}T20:00:00+02:00`,
      marketId: market.id, tags, baseCount: 0, listed: true, publishedAt: '2026-10-08', created: true,
      description: `${d.name.trim() || pr.label} de Huerta Can Ribes, recogido esta semana.`,
    };
    dispatch({ type: 'publish', lot });
    navigate('/productor/vender/listo');
  };

  const back = (to: number) => (
    <Link className="btn2" to={`/productor/vender/${to}`}><Icon name="back" size={24} stroke={2.8} />Atrás</Link>
  );

  return (
    <Page>
      <RequireRole roles={['producer']}>
        <div className={styles.stepWrap}>
          <Stepper current={n} />
          {n === 1 && (
            <Card kicker="Paso 1 de 4" h1="¿Qué vas a vender?">
              <fieldset>
                <legend className="lab" style={{ padding: 0, marginBottom: 14 }}>Toca el producto</legend>
                <div className={styles.prods} role="radiogroup">
                  {PRODUCTS.map((x) => (
                    <button key={x.key} type="button" role="radio" aria-checked={d.product === x.key} className={`${styles.prod} ${d.product === x.key ? styles.prodOn : ''}`} onClick={() => pick(x.key)}>
                      {d.product === x.key && <span className={styles.chosen}><Icon name="check" size={16} stroke={3.4} />Elegido</span>}
                      <span className={styles.pbub} style={{ background: BG_BY_PRODUCT[x.key] }}>{x.key === 'otro' ? <Icon name="plus" size={40} stroke={2.6} /> : <Veg kind={x.key} size={54} />}</span>
                      {x.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="fld">
                <label className="lab" htmlFor="c1-nom" style={{ fontSize: '1.15rem' }}>¿Cómo quieres que se llame?</label>
                <span className="hint" id="c1-nom-h">Puedes añadir la variedad: de pera, cherry, raf…</span>
                <input id="c1-nom" className={`in ${tried && !d.name.trim() ? 'in-err' : ''}`} style={{ minHeight: '3.3rem' }} value={d.name} aria-describedby="c1-nom-h c1-err" aria-invalid={tried && !d.name.trim()} onChange={(e) => set({ name: e.target.value })} />
                {tried && !d.name.trim() && <span id="c1-err" role="alert" className="err"><Icon name="alert" size={22} stroke={2.6} />Falta el nombre. Escribe cómo quieres que se llame, por ejemplo «Tomate de pera».</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="lab">Añade una foto</span>
                <div className={styles.photo}>
                  <div className={styles.photoBox} style={{ background: BG_BY_PRODUCT[d.product] }} role="img" aria-label={d.hasPhoto ? 'Foto añadida' : 'Todavía no has añadido foto'}>
                    {d.hasPhoto ? <Veg kind={d.product} size={90} /> : <Icon name="camera" size={44} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
                    {d.hasPhoto && <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700, color: 'var(--verde-oscuro)' }}><Icon name="check" size={22} stroke={3} />Foto añadida</span>}
                    <button type="button" className="btn2" onClick={() => set({ hasPhoto: true })}><Icon name="camera" size={24} />{d.hasPhoto ? 'Hacer otra foto o elegirla' : 'Hacer una foto o elegirla'}</button>
                    <span className="hint">Vale cualquier foto hecha con el móvil.</span>
                  </div>
                </div>
              </div>
              <fieldset>
                <legend className="lab" style={{ padding: 0, marginBottom: 10 }}>¿Cómo es este producto? <span className="mut" style={{ fontWeight: 400 }}>(puedes marcar las dos o ninguna)</span></legend>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <label className={`${styles.chk} ${d.exc ? styles.chkOn : ''}`}><input type="checkbox" checked={d.exc} onChange={(e) => set({ exc: e.target.checked })} /><span><strong style={{ display: 'block' }}>Me ha sobrado cosecha</strong><span className="mut">Saldrá como «Sobra de cosecha»</span></span></label>
                  <label className={`${styles.chk} ${d.cal ? styles.chkOn : ''}`}><input type="checkbox" checked={d.cal} onChange={(e) => set({ cal: e.target.checked })} /><span><strong style={{ display: 'block' }}>Tamaño irregular o con marcas</strong><span className="mut">Saldrá como «Tamaño irregular»</span></span></label>
                </div>
              </fieldset>
            </Card>
          )}

          {n === 2 && (
            <Card kicker={`Paso 2 de 4 · ${d.name || 'Tu producto'}`} h1="¿Cuánto tienes?">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span className="lab" id="q-total" style={{ fontSize: '1.2rem' }}>¿Cuántos kilos tienes en total?</span>
                <Stepper2 value={d.total} onChange={(v) => set({ total: v })} min={5} max={2000} step={5} label="Kilos en total" unit="kilos" ariaLess="5 kilos menos" ariaMore="5 kilos más" />
                <span className="hint">Los botones suman o restan de 5 en 5.</span>
              </div>
              <fieldset>
                <legend className="lab" style={{ padding: 0, marginBottom: 12, fontSize: '1.2rem' }}>¿Cuántos kilos le tocan a cada persona?</legend>
                <div className={styles.opts} role="radiogroup">
                  {[1, 2, 3, 5].map((k) => <button key={k} type="button" role="radio" aria-checked={d.per === k} className={`${styles.opt} ${d.per === k ? styles.optOn : ''}`} onClick={() => set({ per: k })}>{kilos(k)}</button>)}
                </div>
              </fieldset>
              <div role="status" className={styles.plazas}>
                <span style={{ flex: 'none', width: '3.3rem', height: '3.3rem', borderRadius: 18, background: '#FFFDF8', color: 'var(--verde)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="users" size={34} /></span>
                <p style={{ fontSize: '1.2rem' }}>Se pueden apuntar hasta <strong className="dsp" style={{ fontSize: '1.4rem' }}>{plazas} personas</strong></p>
              </div>
              {rest > 0 && <p role="note" className="note note-warn"><Icon name="alert" size={24} stroke={2.4} />Te sobrarán {kilos(rest)}. Si quieres, sube o baja el total para que no sobre nada.</p>}
              {plazas < 2 && <p role="alert" className="err"><Icon name="alert" size={22} stroke={2.6} />Con estos kilos solo cabe una persona. Sube el total o baja los kilos por persona.</p>}
            </Card>
          )}

          {n === 3 && (
            <Card kicker={`Paso 3 de 4 · ${d.name || 'Tu producto'} · ${kilos(d.per)} por persona`} h1="¿A qué precio lo vendes?">
              {tried && bad && (
                <div role="alert" className="alert-box"><strong><Icon name="errx" size={24} stroke={2.6} />Antes de seguir, revisa los precios</strong><p>Cada escalón tiene que ser más barato que el anterior. Abajo te marcamos en rojo cuál cambiar.</p></div>
              )}
              <div role="note" className="note note-warn" style={{ fontWeight: 400, padding: '1rem 1.2rem', color: '#3b2f00', borderWidth: 0, borderRadius: 20 }}>
                <Icon name="help" size={26} /><p style={{ fontSize: '1.05rem' }}><strong>Ya te hemos puesto unos precios</strong> según lo que se paga esta semana en los mercados. Si te parecen bien, solo tienes que pulsar «Siguiente». Si no, cámbialos con los botones − y +.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span className="lab" id="q-min" style={{ fontSize: '1.2rem' }}>¿Cuántas personas hacen falta como mínimo?</span>
                <Stepper2 value={min} onChange={(v) => set({ min: v })} min={2} max={maxMin} label="Mínimo de personas" unit="personas" ariaLess="Una persona menos" ariaMore="Una persona más" />
                <span className="hint">Si no se apuntan {min} personas antes del último día, no se vende y no se cobra a nadie.</span>
              </div>
              <fieldset style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <legend className="lab" style={{ padding: 0, marginBottom: 12, fontSize: '1.2rem' }}>Precio del kilo según cuántas personas se apunten</legend>
                {[0, 1, 2].map((i) => (
                  <div key={i} className={styles.tier}>
                    <span className={`dsp ${styles.tierDot}`} style={{ background: ['#2E7D38', '#3FA34D', '#8CCB6A'][i], color: i === 0 ? '#fff' : '#0E2A12' }}>{i + 1}</span>
                    <span style={{ fontSize: '1.1rem' }}><strong>Si se apuntan de {ranges[i][0]} a {ranges[i][1]} personas</strong><br /><span className="mut">Cada persona pagará {eur(p[i] * d.per)} por sus {kilos(d.per)}</span></span>
                    <Stepper2 value={p[i]} onChange={(v) => { const np = [...p] as [number, number, number]; np[i] = v; set({ prices: np }); }} min={10} max={2000} step={10} label={`Precio del kilo con ${ranges[i][0]} a ${ranges[i][1]} personas`} unit="eur" ariaLess="Bajar 10 céntimos" ariaMore="Subir 10 céntimos" error={errs[i]} />
                    {errs[i] && <span className="err" style={{ gridColumn: '1 / -1' }}><Icon name="alert" size={22} stroke={2.6} />Con más personas el precio tiene que bajar. Ahora es {eur(p[i])} y tiene que ser menos de {eur(p[i - 1])}. Pulsa el botón −.</span>}
                  </div>
                ))}
              </fieldset>
              <button type="button" className="btn2" style={{ alignSelf: 'flex-start' }} onClick={() => { const pr = PRODUCTS.find((x) => x.key === d.product)!; set({ min: 10, prices: proposed(pr.price) }); setTried(false); }}><Icon name="refresh" size={24} />Volver a los precios propuestos</button>
              <div className={styles.two}>
                <div style={{ background: 'var(--verde-suave)', borderRadius: 22, padding: '1.1rem' }}>
                  <span className="mut b">Así lo verán los compradores</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: '7.5rem', marginTop: 10 }}>
                    {[0, 1, 2].map((i) => <div key={i} style={{ flex: 1, height: `${100 - i * 13}%`, background: ['#2E7D38', '#3FA34D', '#8CCB6A'][i], color: i === 0 ? '#fff' : '#0E2A12', borderRadius: '14px 14px 8px 8px', padding: 8, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', fontSize: '.9rem' }}><b className="dsp" style={{ fontSize: '1.1rem' }}>{eur(p[i])}</b>desde {froms[i]}</div>)}
                  </div>
                </div>
                <div style={{ background: 'var(--cat-legumbre)', borderRadius: 22, padding: '1.1rem', color: '#2e1f45', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="b" style={{ color: '#45306a' }}>Lo que puedes cobrar</span>
                  <p>Si se llega justo al mínimo: <strong className="dsp" style={{ fontSize: '1.3rem' }}>{eurShort(min * d.per * p[0])}</strong></p>
                  <p>Si se llenan las {plazas} plazas: <strong className="dsp" style={{ fontSize: '1.3rem' }}>{eurShort(plazas * d.per * p[2])}</strong></p>
                </div>
              </div>
            </Card>
          )}

          {n === 4 && (
            <>
              <Card kicker="Paso 4 de 4 · Último paso" h1="¿Hasta cuándo y dónde lo entregas?">
                <fieldset>
                  <legend className="lab" style={{ padding: 0, marginBottom: 6, fontSize: '1.2rem' }}>¿Hasta qué día se pueden apuntar?</legend>
                  <span className="hint">Tiene que ser al menos 2 días antes de la entrega. Se cierra a las 20:00.</span>
                  <div className={styles.opts} role="radiogroup" style={{ marginTop: 12 }}>
                    {DAYS.map((iso, i) => { const [, , dd] = iso.split('-'); return (
                      <button key={iso} type="button" role="radio" aria-checked={d.dayIdx === i} className={`${styles.day} ${d.dayIdx === i ? styles.optOn : ''}`} onClick={() => set({ dayIdx: i })}>
                        <span>{cap(dayLong(iso).split(' ')[0])}</span><strong className="dsp" style={{ fontSize: '1.6rem', lineHeight: 1.1 }}>{Number(dd)}</strong><span>octubre</span>
                      </button>); })}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="lab" style={{ padding: 0, marginBottom: 12, fontSize: '1.2rem' }}>¿En qué mercado lo entregas?</legend>
                  <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {MARKETS.filter((m) => m.active).map((m, i) => (
                      <button key={m.id} type="button" role="radio" aria-checked={d.marketIdx === i} className={`${styles.mk} ${d.marketIdx === i ? styles.mkOn : ''}`} onClick={() => set({ marketIdx: i })}>
                        <span className={`${styles.rd} ${d.marketIdx === i ? styles.rdOn : ''}`} aria-hidden="true" />
                        <span style={{ flex: 1 }}><strong className="dsp" style={{ display: 'block', fontSize: '1.3rem' }}>{m.name}</strong><span>{m.dayLabel}, {m.hours}</span></span>
                        <span className="mut b">Próxima: {dayLong(m.nextDate).split(' ').slice(0, 1)}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              </Card>
              <section className={`card ${styles.form}`} aria-labelledby="h-res" style={{ border: '3px solid #2e8b3e', gap: 6 }}>
                <h2 id="h-res" className="dsp" style={{ fontSize: '1.9rem', marginBottom: 6 }}>Revisa antes de ponerlo a la venta</h2>
                <div className={styles.sum}><span className="mut b">Qué vendes</span><span><strong>{d.name || '—'}</strong>{d.exc ? ' · sobra de cosecha' : ''}{d.cal ? ' · tamaño irregular' : ''}{d.hasPhoto ? ' · con foto' : ''}</span><Link to="/productor/vender/1" style={{ padding: 10 }}>Cambiar<span className="sr-only"> qué vendes</span></Link></div>
                <div className={styles.sum}><span className="mut b">Cantidad</span><span><strong>{d.total} kilos</strong>, {kilos(d.per)} por persona (hasta {plazas} personas)</span><Link to="/productor/vender/2" style={{ padding: 10 }}>Cambiar<span className="sr-only"> la cantidad</span></Link></div>
                <div className={styles.sum}><span className="mut b">Precio</span><span>Mínimo <strong>{min} personas</strong>. <strong>{eur(p[0])}</strong> el kilo, que baja a {eur(p[1])} con {froms[1]} y a {eur(p[2])} con {froms[2]}</span><Link to="/productor/vender/3" style={{ padding: 10 }}>Cambiar<span className="sr-only"> el precio</span></Link></div>
                <div className={styles.sum}><span className="mut b">Último día</span><span><strong>{cap(dayLong(dayIso))}</strong>, a las 20:00</span><span /></div>
                <div className={styles.sum} style={{ borderBottom: 0 }}><span className="mut b">Entrega</span><span><strong>{market.name}</strong> · {dayLong(market.nextDate)}, {market.hours.replace('de ', 'de ')}</span><span /></div>
                <p style={{ marginTop: 8, background: 'var(--verde-suave)', borderRadius: 18, padding: '0.9rem 1.1rem', fontSize: '1.05rem' }}>Si se llega al mínimo cobrarás <strong>entre {eurShort(min * d.per * p[0])} y {eurShort(plazas * d.per * p[2])}</strong>. Si no, no se vende y no tienes que preparar nada.</p>
              </section>
            </>
          )}

          <div className={styles.nav}>
            {n === 1 ? <Link to="/productor" style={{ padding: '0.9rem 0.5rem' }}>Cancelar</Link> : back(n - 1)}
            {n === 1 && <button type="button" className="btn" onClick={() => { if (!d.name.trim()) setTried(true); else navigate('/productor/vender/2'); }}>Siguiente: cantidad<Icon name="arrow" size={26} stroke={2.8} /></button>}
            {n === 2 && <button type="button" className="btn" disabled={plazas < 2} onClick={() => navigate('/productor/vender/3')}>Siguiente: precio<Icon name="arrow" size={26} stroke={2.8} /></button>}
            {n === 3 && <button type="button" className="btn" onClick={() => { if (bad) setTried(true); else { setTried(false); navigate('/productor/vender/4'); } }}>Siguiente: recogida<Icon name="arrow" size={26} stroke={2.8} /></button>}
            {n === 4 && <button type="button" className="btn btn-xl" onClick={publish}><Icon name="check" size={26} stroke={3} />Poner a la venta</button>}
          </div>
        </div>
      </RequireRole>
    </Page>
  );
}
