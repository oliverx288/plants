import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { MARKETS } from '../data/markets';
import { HOME_BY_ROLE, useStore, type Role } from '../state/store';
import { useTitle } from '../state/useTitle';
import styles from './Access.module.css';

type Errors = Partial<Record<'name' | 'mail' | 'pass' | 'terms', string>>;

export function validateMail(v: string): string | null {
  const t = v.trim();
  if (!t) return 'Escribe tu correo electrónico, por ejemplo: lucia@correo.com';
  if (!t.includes('@')) return 'Falta la @. Escribe tu correo así: lucia@correo.com';
  const [user, domain = ''] = t.split('@');
  if (!user) return 'Falta lo que va antes de la @. Escribe tu correo así: lucia@correo.com';
  if (!domain.includes('.') || domain.endsWith('.')) return 'Falta el final del correo, por ejemplo «.com» o «.es». Así: lucia@correo.com';
  return null;
}
export function validatePass(v: string): string | null {
  if (!v) return 'Escribe una contraseña de al menos 8 letras o números.';
  if (v.length < 8) return `Es demasiado corta: tiene ${v.length}. Añade ${8 - v.length} letras o números más.`;
  return null;
}

function ErrMsg({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return <span className="err" id={id}><Icon name="alert" size={22} stroke={2.6} style={{ marginTop: 2 }} />{text}</span>;
}

export default function Access() {
  const [params] = useSearchParams();
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'reg' | 'log'>(params.get('modo') === 'entrar' ? 'log' : 'reg');
  const [tipo, setTipo] = useState<'c' | 'p'>(params.get('tipo') === 'vender' ? 'p' : 'c');
  useTitle(tab === 'reg' ? 'Crear cuenta' : 'Entrar');

  const [f, setF] = useState({ name: '', mail: '', pass: '', market: MARKETS[0].id, farm: '', town: '', terms: false });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);
  const [lmail, setLmail] = useState('');
  const [lpass, setLpass] = useState('');
  const [lerr, setLerr] = useState<{ mail?: string; pass?: string }>({});
  const summary = useRef<HTMLDivElement>(null);
  const hasErr = Object.keys(errors).length > 0;
  useEffect(() => { if (hasErr) summary.current?.focus(); }, [errors, hasErr]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const er: Errors = {};
    if (!f.name.trim()) er.name = 'Escribe tu nombre para que podamos saludarte.';
    const m = validateMail(f.mail); if (m) er.mail = m;
    const p = validatePass(f.pass); if (p) er.pass = p;
    if (!f.terms) er.terms = 'Para crear la cuenta tienes que aceptar las condiciones. Marca la casilla.';
    setErrors(er);
    if (Object.keys(er).length) return;
    dispatch({ type: 'account', patch: { name: f.name.trim(), email: f.mail.trim(), marketId: f.market } });
    dispatch({ type: 'role', role: tipo === 'c' ? 'buyer' : 'producer' });
    setDone(true);
  };

  const login = (e: FormEvent) => {
    e.preventDefault();
    const er: { mail?: string; pass?: string } = {};
    const m = validateMail(lmail); if (m) er.mail = m;
    if (!lpass) er.pass = 'Escribe tu contraseña.';
    setLerr(er);
    if (Object.keys(er).length) return;
    dispatch({ type: 'role', role: 'buyer' });
    navigate('/productos');
  };

  const enterAs = (role: Role) => { dispatch({ type: 'role', role }); navigate(HOME_BY_ROLE[role]); };
  const firstName = (f.name.trim() || state.account.name).split(' ')[0];
  const items: { id: string; label: string }[] = [];
  if (errors.name) items.push({ id: 'a-nom', label: 'Tu nombre' });
  if (errors.mail) items.push({ id: 'a-mail', label: 'El correo electrónico' });
  if (errors.pass) items.push({ id: 'a-pass', label: 'La contraseña' });
  if (errors.terms) items.push({ id: 'a-terms', label: 'Las condiciones de uso' });

  return (
    <Page>
      <div className={styles.wrap}>
        <div className={`card ${styles.box}`}>
          <h1 className="sr-only">{tab === 'reg' ? 'Crear cuenta' : 'Entrar'}</h1>
          <div className={styles.tabs} role="tablist" aria-label="Elige qué quieres hacer">
            <button type="button" role="tab" aria-selected={tab === 'reg'} className={`${styles.tab} ${tab === 'reg' ? styles.tabOn : ''}`} onClick={() => setTab('reg')}>Crear cuenta</button>
            <button type="button" role="tab" aria-selected={tab === 'log'} className={`${styles.tab} ${tab === 'log' ? styles.tabOn : ''}`} onClick={() => setTab('log')}>Entrar</button>
          </div>

          {tab === 'reg' && !done && (
            <form className={styles.form} onSubmit={submit} noValidate>
              <h2 className="dsp">Crea tu cuenta</h2>
              {hasErr && (
                <div role="alert" ref={summary} tabIndex={-1} className="alert-box">
                  <strong><Icon name="errx" size={24} stroke={2.6} />Hay {items.length} {items.length === 1 ? 'dato que corregir' : 'datos que corregir'}</strong>
                  <ul>{items.map((i) => <li key={i.id}><a href={`#${i.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(i.id)?.focus(); }}>{i.label}</a></li>)}</ul>
                </div>
              )}
              <fieldset style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <legend className="lab" style={{ padding: 0, marginBottom: 10 }}>¿Para qué vas a usar Lot a Lot?</legend>
                <div className={styles.opts} role="radiogroup">
                  <button type="button" role="radio" aria-checked={tipo === 'c'} className={`${styles.opt} ${tipo === 'c' ? styles.optOn : ''}`} onClick={() => setTipo('c')}>
                    <span className={`${styles.radio} ${tipo === 'c' ? styles.radioOn : ''}`} aria-hidden="true" />
                    <span><strong className="dsp" style={{ display: 'block', fontSize: '1.25rem' }}>Quiero comprar</strong><span className="mut">Me apunto y recojo en mi mercado</span></span>
                  </button>
                  <button type="button" role="radio" aria-checked={tipo === 'p'} className={`${styles.opt} ${tipo === 'p' ? styles.optOn : ''}`} onClick={() => setTipo('p')}>
                    <span className={`${styles.radio} ${tipo === 'p' ? styles.radioOn : ''}`} aria-hidden="true" />
                    <span><strong className="dsp" style={{ display: 'block', fontSize: '1.25rem' }}>Quiero vender</strong><span className="mut">Pongo a la venta lo que me sobra</span></span>
                  </button>
                </div>
              </fieldset>

              <div className="fld">
                <label className="lab" htmlFor="a-nom">Tu nombre</label>
                <input id="a-nom" className={errors.name ? 'in in-err' : 'in'} autoComplete="name" value={f.name} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'a-nom-e' : undefined} onChange={(e) => setF({ ...f, name: e.target.value })} />
                <ErrMsg id="a-nom-e" text={errors.name} />
              </div>
              <div className="fld">
                <label className="lab" htmlFor="a-mail">Tu correo electrónico</label>
                <span className="hint" id="a-mail-h">Ejemplo: nombre@correo.com</span>
                <input id="a-mail" type="email" inputMode="email" autoComplete="email" className={errors.mail ? 'in in-err' : 'in'} value={f.mail} aria-invalid={!!errors.mail} aria-describedby={`a-mail-h${errors.mail ? ' a-mail-e' : ''}`} onChange={(e) => setF({ ...f, mail: e.target.value })} />
                <ErrMsg id="a-mail-e" text={errors.mail} />
              </div>
              <div className="fld">
                <label className="lab" htmlFor="a-pass">Elige una contraseña</label>
                <span className="hint" id="a-pass-h">Al menos 8 letras o números. Apúntala en un lugar seguro.</span>
                <input id="a-pass" type={showPass ? 'text' : 'password'} autoComplete="new-password" className={errors.pass ? 'in in-err' : 'in'} value={f.pass} aria-invalid={!!errors.pass} aria-describedby={`a-pass-h${errors.pass ? ' a-pass-e' : ''}`} onChange={(e) => setF({ ...f, pass: e.target.value })} />
                <ErrMsg id="a-pass-e" text={errors.pass} />
                <label className="chkrow"><input type="checkbox" checked={showPass} onChange={(e) => setShowPass(e.target.checked)} />Mostrar la contraseña</label>
              </div>

              {tipo === 'c' ? (
                <div className="fld">
                  <label className="lab" htmlFor="a-punto">¿En qué mercado vas a recoger?</label>
                  <select id="a-punto" className="in" value={f.market} onChange={(e) => setF({ ...f, market: e.target.value })}>
                    {MARKETS.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.dayLabel.toLowerCase()})</option>)}
                  </select>
                  <span className="hint">Podrás cambiarlo cuando quieras.</span>
                </div>
              ) : (
                <div className={styles.prod}>
                  <div className="fld"><label className="lab" htmlFor="a-exp">Nombre de tu huerta o finca</label><input id="a-exp" className="in" placeholder="Por ejemplo: Huerta Can Ribes" value={f.farm} onChange={(e) => setF({ ...f, farm: e.target.value })} /></div>
                  <div className="fld"><label className="lab" htmlFor="a-mun">Pueblo o ciudad</label><input id="a-mun" className="in" placeholder="Por ejemplo: Vilafranca del Penedès" value={f.town} onChange={(e) => setF({ ...f, town: e.target.value })} /></div>
                  <p className="b" style={{ color: 'var(--verde-oscuro)' }}>Después te llamaremos para comprobar tus datos. No necesitas tenerlo todo ahora.</p>
                </div>
              )}

              <div className="fld">
                <label className="chkrow" style={{ alignItems: 'flex-start' }}>
                  <input id="a-terms" type="checkbox" checked={f.terms} aria-invalid={!!errors.terms} aria-describedby={errors.terms ? 'a-terms-e' : undefined} onChange={(e) => setF({ ...f, terms: e.target.checked })} style={{ marginTop: 3 }} />
                  <span>Acepto las <Link to="/info/condiciones">condiciones de uso</Link> y la <Link to="/info/privacidad">política de privacidad</Link>.</span>
                </label>
                <ErrMsg id="a-terms-e" text={errors.terms} />
              </div>
              <button type="submit" className="btn">Crear mi cuenta</button>
              <div className={styles.phone}>
                <Icon name="phone" size={26} style={{ marginTop: 2 }} />
                <p><strong>¿Prefieres que te ayudemos?</strong> Llámanos gratis al <a href="tel:900000000">900 000 000</a> y te creamos la cuenta por teléfono.</p>
              </div>
            </form>
          )}

          {tab === 'reg' && done && (
            <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start' }}>
              <span className={styles.okIcon}><Icon name="check" size={46} stroke={3} /></span>
              <h2 className="dsp" style={{ fontSize: '2rem' }}>¡Cuenta creada, {firstName}!</h2>
              <p style={{ fontSize: '1.1rem' }}>{tipo === 'c' ? 'Ya puedes apuntarte a compras en grupo. Te hemos enviado un correo de bienvenida con tus datos.' : 'Te llamaremos en 1 o 2 días laborables para comprobar tus datos. Mientras tanto, ya puedes preparar tu primer producto.'}</p>
              <Link className="btn" to={tipo === 'c' ? '/productos' : '/productor'}>{tipo === 'c' ? 'Ver productos a la venta' : 'Ir a mi panel'}</Link>
            </div>
          )}

          {tab === 'log' && (
            <form className={styles.form} onSubmit={login} noValidate>
              <h2 className="dsp">¡Qué bien verte!</h2>
              <div className="fld">
                <label className="lab" htmlFor="l-mail">Tu correo electrónico</label>
                <input id="l-mail" type="email" autoComplete="email" className={lerr.mail ? 'in in-err' : 'in'} placeholder="nombre@correo.com" value={lmail} onChange={(e) => setLmail(e.target.value)} aria-invalid={!!lerr.mail} aria-describedby={lerr.mail ? 'l-mail-e' : undefined} />
                <ErrMsg id="l-mail-e" text={lerr.mail} />
              </div>
              <div className="fld">
                <label className="lab" htmlFor="l-pass">Tu contraseña</label>
                <input id="l-pass" type={showPass ? 'text' : 'password'} autoComplete="current-password" className={lerr.pass ? 'in in-err' : 'in'} value={lpass} onChange={(e) => setLpass(e.target.value)} aria-invalid={!!lerr.pass} aria-describedby={lerr.pass ? 'l-pass-e' : undefined} />
                <ErrMsg id="l-pass-e" text={lerr.pass} />
                <label className="chkrow"><input type="checkbox" checked={showPass} onChange={(e) => setShowPass(e.target.checked)} />Mostrar la contraseña</label>
              </div>
              <button type="submit" className="btn">Entrar</button>
              <Link to="/info/preguntas-frecuentes" style={{ alignSelf: 'center', padding: 8 }}>He olvidado mi contraseña</Link>
              <p className="mut" style={{ textAlign: 'center' }}>
                Prototipo: entrar como{' '}
                <button type="button" className="link-btn" onClick={() => enterAs('buyer')}>persona que compra</button>,{' '}
                <button type="button" className="link-btn" onClick={() => enterAs('producer')}>productora</button> o{' '}
                <button type="button" className="link-btn" onClick={() => enterAs('admin')}>administración</button>.
              </p>
            </form>
          )}
        </div>
      </div>
    </Page>
  );
}
