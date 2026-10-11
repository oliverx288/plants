import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { HOME_BY_ROLE, useStore } from '../state/store';
import { Logo } from './Logo';
import { Icon } from './Icon';
import { FontSizeControl } from './FontSizeControl';
import { CookieBanner } from './CookieBanner';
import { DevRoleSwitcher } from './DevRoleSwitcher';
import styles from './Layout.module.css';

const HELP_TEL = '900 000 000';

interface NavItem { to: string; label: string; end?: boolean }

function navFor(role: string): NavItem[] {
  if (role === 'producer') {
    return [
      { to: '/productor', label: 'Mi panel', end: true },
      { to: '/productor/vender/1', label: 'Poner a la venta' },
    ];
  }
  if (role === 'buyer') {
    return [
      { to: '/productos', label: 'Productos a la venta' },
      { to: '/mis-compras', label: 'Mis compras' },
      { to: '/mercados', label: 'Dónde se recoge' },
    ];
  }
  return [
    { to: '/#como', label: 'Cómo funciona' },
    { to: '/productos', label: 'Productos a la venta' },
    { to: '/mercados', label: 'Dónde se recoge' },
  ];
}

function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export function HelpBar() {
  return (
    <div className={styles.hb} role="region" aria-label="Ayuda y tamaño del texto">
      <span className={styles.hbText}>
        <Icon name="phone" size={22} stroke={2} />
        <span>¿Necesitas ayuda? Llámanos gratis al <a href="tel:900000000">{HELP_TEL}</a> · lunes a sábado, de 9 a 20 h</span>
      </span>
      <FontSizeControl />
    </div>
  );
}

export function Header() {
  const { state } = useStore();
  const [help, setHelp] = useState(false);
  const role = state.role;
  const producer = role === 'producer';
  const nav = navFor(role);
  const loc = useLocation();
  useEffect(() => setHelp(false), [loc.pathname]);
  return (
    <>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to={HOME_BY_ROLE[role === 'buyer' ? 'guest' : role === 'admin' ? 'guest' : role]} className={styles.logoLink} aria-label="Lot a Lot, ir al inicio">
            <Logo />
          </Link>
          {producer && <span className={styles.badge}>Zona de productores</span>}
        </div>
        <nav className={styles.nav} aria-label="Principal">
          {nav.map((n) => (
            <NavItemLink key={n.label} item={n} />
          ))}
        </nav>
        {role === 'guest' ? (
          <Link className={`btn2 ${styles.entrar}`} to="/acceso" style={{ minHeight: '2.9rem' }}>
            <Icon name="user" /> Entrar
          </Link>
        ) : (
          <Link to="/mi-cuenta" className={styles.acct}>
            <span className={`${styles.avatar} dsp`} aria-hidden="true" style={{ background: producer ? '#3FA34D' : '#F4A261', color: producer ? '#0E2A12' : '#2E1603' }}>
              {initials(producer ? 'Montse Ribes' : state.account.name)}
            </span>
            Mi cuenta
          </Link>
        )}
        <button type="button" className={styles.helpBtn} aria-expanded={help} aria-controls="help-panel" onClick={() => setHelp((v) => !v)}>
          <Icon name="phone" size={20} />
          {help ? 'Cerrar' : 'Ayuda'}
        </button>
      </header>
      {help && (
        <div id="help-panel" role="region" aria-label="Ayuda" className={`${styles.helpPanel} on-dark`}>
          <strong className="dsp" style={{ fontSize: '1.35rem' }}>¿Necesitas ayuda?</strong>
          <a className={`btn ${styles.helpCall}`} href="tel:900000000"><Icon name="phone" /> Llamar al {HELP_TEL}</a>
          <span>Llamada gratuita · lunes a sábado, de 9 a 20 h</span>
          <FontSizeControl />
        </div>
      )}
      <nav className={styles.mnav} aria-label="Principal (móvil)">
        {nav.map((n) => (
          <NavItemLink key={n.label} item={n} />
        ))}
        {role === 'guest' && <Link to="/acceso">Entrar</Link>}
        {role !== 'guest' && <NavLink to="/mi-cuenta">Mi cuenta</NavLink>}
      </nav>
    </>
  );
}

function NavItemLink({ item }: { item: NavItem }) {
  if (item.to.includes('#')) return <Link to={item.to}>{item.label}</Link>;
  return <NavLink to={item.to} end={item.end}>{item.label}</NavLink>;
}

export function Footer() {
  return (
    <footer className={`${styles.footer} on-dark`}>
      <div>
        <Logo className="dsp" />
        <p style={{ marginTop: 4 }}>Ayuda por teléfono: <a style={{ color: "#FFD23F" }} href="tel:900000000">{HELP_TEL}</a></p>
      </div>
      <nav aria-label="Pie de página" className={styles.footNav}>
        <Link to="/info/preguntas-frecuentes">Preguntas frecuentes</Link>
        <Link to="/info/condiciones">Condiciones</Link>
        <Link to="/info/aviso-legal">Aviso legal</Link>
        <Link to="/info/privacidad">Privacidad</Link>
        <Link to="/info/cookies">Cookies</Link>
        <Link to="/info/accesibilidad">Accesibilidad</Link>
      </nav>
    </footer>
  );
}

/** Estructura común de las páginas públicas, de comprador y de productor. */
export function Page({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const loc = useLocation();
  useEffect(() => {
    if (loc.hash) {
      const el = document.getElementById(loc.hash.slice(1));
      if (el) { el.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
    ref.current?.focus({ preventScroll: true });
  }, [loc.pathname, loc.hash]);
  return (
    <div className="page">
      <a href="#contenido" className="skip" onClick={(e) => { e.preventDefault(); ref.current?.focus(); ref.current?.scrollIntoView(); }}>Saltar al contenido</a>
      <HelpBar />
      <Header />
      <main id="contenido" ref={ref} tabIndex={-1} className="main">
        {children}
      </main>
      <Footer />
      <CookieBanner />
      <DevRoleSwitcher />
    </div>
  );
}
