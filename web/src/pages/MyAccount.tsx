import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Page } from '../components/Layout';
import { MARKETS } from '../data/markets';
import { HOME_BY_ROLE, useStore } from '../state/store';
import { useTitle } from '../state/useTitle';

export default function MyAccount() {
  useTitle('Mi cuenta');
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const a = state.account;
  const [saved, setSaved] = useState('');
  const [name, setName] = useState(a.name);
  const [phone, setPhone] = useState(a.phone);
  const [confirmOff, setConfirmOff] = useState(false);
  const isProd = state.role === 'producer';

  const flash = (m: string) => { setSaved(m); };
  const saveData = () => { dispatch({ type: 'account', patch: { name: name.trim() || a.name, phone } }); flash('Datos guardados.'); };

  return (
    <Page>
      <div style={{ padding: '1rem var(--pad) 3rem', display: 'flex', flexDirection: 'column', gap: 22, maxWidth: '52rem' }}>
        <h1 className="dsp" style={{ fontSize: '2.3rem' }}>Mi cuenta</h1>
        {saved && <p role="status" className="note note-green"><Icon name="check" size={22} stroke={3} />{saved}</p>}

        {state.role === 'guest' ? (
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <p>Para ver tu cuenta tienes que entrar.</p>
            <Link className="btn" to="/acceso?modo=entrar">Entrar</Link>
          </div>
        ) : (
          <>
            <section className="card" aria-labelledby="h-datos" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 id="h-datos" className="dsp" style={{ fontSize: '1.5rem' }}>Tus datos</h2>
              <div className="fld"><label className="lab" htmlFor="m-nom">Tu nombre</label><input id="m-nom" className="in" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="fld"><label className="lab" htmlFor="m-mail">Tu correo electrónico</label><input id="m-mail" className="in" value={a.email} readOnly aria-describedby="m-mail-h" /><span className="hint" id="m-mail-h">Para cambiarlo, llámanos al 900 000 000.</span></div>
              <div className="fld"><label className="lab" htmlFor="m-tel">Tu teléfono móvil</label><input id="m-tel" type="tel" className="in" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              {!isProd && (
                <div className="fld"><label className="lab" htmlFor="m-mer">Tu mercado de recogida</label>
                  <select id="m-mer" className="in" value={a.marketId} onChange={(e) => { dispatch({ type: 'account', patch: { marketId: e.target.value } }); flash('Mercado cambiado.'); }}>
                    {MARKETS.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.dayLabel.toLowerCase()})</option>)}
                  </select></div>
              )}
              <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} onClick={saveData}>Guardar mis datos</button>
            </section>

            <section className="card" aria-labelledby="h-tarj" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 id="h-tarj" className="dsp" style={{ fontSize: '1.5rem' }}>{isProd ? 'Dónde te pagamos' : 'Tu tarjeta'}</h2>
              <p style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon name="card" size={26} style={{ color: 'var(--verde-oscuro)' }} />
                {isProd ? <>Cuenta acabada en <strong>9027</strong></> : <>Tarjeta acabada en <strong>{a.cardLast4}</strong></>}</p>
              {!isProd && <p className="mut">La guardamos, pero no te cobramos nada hasta que una compra se confirme.</p>}
              <button type="button" className="btn2" style={{ alignSelf: 'flex-start' }} onClick={() => { dispatch({ type: 'account', patch: { cardLast4: String(1000 + ((Number(a.cardLast4) * 7 + 13) % 9000)) } }); flash('Hemos guardado una tarjeta nueva (de ejemplo).'); }}>{isProd ? 'Cambiar cuenta' : 'Usar otra tarjeta'}</button>
            </section>

            <section className="card" aria-labelledby="h-avisos" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h2 id="h-avisos" className="dsp" style={{ fontSize: '1.5rem' }}>Avisos</h2>
              <p className="mut">Te escribimos cuando una compra se confirma y antes de la recogida. Puedes darte de baja cuando quieras.</p>
              <label className="chkrow"><input type="checkbox" checked={a.sms} onChange={(e) => { dispatch({ type: 'account', patch: { sms: e.target.checked } }); flash(e.target.checked ? 'Volverás a recibir avisos por SMS.' : 'Te hemos dado de baja de los avisos por SMS.'); }} />Recibir avisos por SMS</label>
              <label className="chkrow"><input type="checkbox" checked={a.mail} onChange={(e) => { dispatch({ type: 'account', patch: { mail: e.target.checked } }); flash(e.target.checked ? 'Volverás a recibir avisos por correo.' : 'Te hemos dado de baja de los avisos por correo.'); }} />Recibir avisos por correo electrónico</label>
              {(!a.sms || !a.mail) && <p className="note note-warn">Sin avisos, tendrás que mirar «Mis compras» para saber si se confirma una compra.</p>}
            </section>

            <section className="card" aria-labelledby="h-salir" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 id="h-salir" className="dsp" style={{ fontSize: '1.5rem' }}>Salir</h2>
              {!confirmOff ? (
                <div className="row-btns">
                  <button type="button" className="btn2" onClick={() => { dispatch({ type: 'role', role: 'guest' }); navigate(HOME_BY_ROLE.guest); }}>Cerrar sesión</button>
                  <button type="button" className="btn2 danger" onClick={() => setConfirmOff(true)}>Borrar mi cuenta</button>
                </div>
              ) : (
                <div role="alertdialog" aria-labelledby="del-t" className="dialog-box red">
                  <h3 id="del-t" className="dsp" style={{ fontSize: '1.4rem' }}>¿Seguro que quieres borrar tu cuenta?</h3>
                  <p>Se cancelarán tus compras en curso y no se te cobrará nada. Esto no se puede deshacer.</p>
                  <div className="row-btns">
                    <button type="button" className="btn btn-red" onClick={() => { dispatch({ type: 'reset' }); dispatch({ type: 'role', role: 'guest' }); navigate('/'); }}>Sí, borrar mi cuenta</button>
                    <button type="button" className="btn2" onClick={() => setConfirmOff(false)}>No, volver</button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Page>
  );
}
