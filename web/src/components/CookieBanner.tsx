import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../state/store';
import styles from './Layout.module.css';

/** Banner de cookies (LSSI/RGPD). Los dos botones tienen exactamente el mismo peso visual. */
export function CookieBanner() {
  const { state, dispatch } = useStore();
  const [choosing, setChoosing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  if (state.cookies !== 'pending') return null;
  return (
    <div role="dialog" aria-labelledby="ck-t" aria-describedby="ck-d" className={styles.cookie}>
      <div className={styles.cookieHead} style={{ flex: 1 }}>
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" focusable="false" style={{ flex: 'none' }}>
          <path d="M20 3a17 17 0 1017 17 6 6 0 01-7-6 6 6 0 01-6-7 6 6 0 01-4-4z" fill="#D9A066" />
          <circle cx="13" cy="16" r="2.5" fill="#7A4F22" /><circle cx="21" cy="26" r="2.5" fill="#7A4F22" />
          <circle cx="12" cy="27" r="2" fill="#7A4F22" /><circle cx="28" cy="22" r="2" fill="#7A4F22" />
        </svg>
        <div>
          <h2 id="ck-t" className="dsp" style={{ fontSize: '1.25rem' }}>¿Nos dejas usar cookies?</h2>
          <p id="ck-d" style={{ marginTop: 2 }}>
            Las necesarias hacen que la web funcione. Con tu permiso, usamos otras para saber qué páginas se visitan y mejorarla.{' '}
            <Link to="/info/cookies">Política de cookies</Link>
          </p>
          {choosing && (
            <div className={styles.cookiePrefs} style={{ marginTop: 10 }}>
              <label className="chkrow"><input type="checkbox" checked disabled /> Necesarias (siempre activas)</label>
              <label className="chkrow"><input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} /> Estadísticas para mejorar la web</label>
              <button type="button" className="btn2" onClick={() => dispatch({ type: 'cookies', choice: analytics ? 'all' : 'necessary' })}>Guardar mi elección</button>
            </div>
          )}
        </div>
      </div>
      <div className={styles.cookieBtns}>
        <div className={styles.cookieRow} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn2" onClick={() => dispatch({ type: 'cookies', choice: 'necessary' })}>Solo las necesarias</button>
          <button type="button" className="btn2" onClick={() => dispatch({ type: 'cookies', choice: 'all' })}>Aceptar todas</button>
        </div>
        <button type="button" className="link-btn" style={{ alignSelf: 'center' }} aria-expanded={choosing} onClick={() => setChoosing((v) => !v)}>Elegir cuáles</button>
      </div>
    </div>
  );
}
