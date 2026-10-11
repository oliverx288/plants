import { useParams } from 'react-router-dom';
import { Page } from '../components/Layout';
import { useTitle } from '../state/useTitle';

const PAGES: Record<string, { title: string; body: string[] }> = {
  'preguntas-frecuentes': {
    title: 'Preguntas frecuentes',
    body: ['¿Y si no se apunta suficiente gente? No pagas nada: la compra no sale adelante y no se cobra a nadie.', '¿Cuándo pago? Solo cuando la compra se confirma, al acabar el plazo para apuntarse. Hasta entonces guardamos tu tarjeta, pero no te cobramos.', '¿Dónde lo recojo? En tu mercado municipal, un día fijo a la semana. Te lo recordamos antes por SMS y correo.', '¿Y si no puedo ir? Otra persona puede recogerlo enseñando tu código.', '¿Necesitas ayuda? Llámanos gratis al 900 000 000, de lunes a sábado, de 9 a 20 h.'],
  },
  condiciones: { title: 'Condiciones de uso', body: ['Esta es una página de ejemplo del prototipo. Aquí irán las condiciones de uso de Lot a Lot, redactadas en un lenguaje llano.'] },
  'aviso-legal': { title: 'Aviso legal', body: ['Esta es una página de ejemplo del prototipo. Aquí irá el aviso legal con los datos del titular del servicio (LSSI).'] },
  privacidad: { title: 'Política de privacidad', body: ['Esta es una página de ejemplo del prototipo. Aquí irá la información sobre cómo tratamos tus datos personales (RGPD).'] },
  cookies: { title: 'Política de cookies', body: ['Usamos cookies necesarias para que la web funcione (por ejemplo, recordar el tamaño del texto). Solo usamos cookies de estadísticas si nos das tu permiso.', 'Puedes cambiar tu elección borrando los datos de esta web en tu navegador.'] },
  accesibilidad: { title: 'Accesibilidad', body: ['Lot a Lot está pensada para que la pueda usar todo el mundo: texto grande y ajustable, botones fáciles de pulsar, buen contraste y lectura compatible con lectores de pantalla.', 'Si algo no te funciona, llámanos al 900 000 000 y te ayudamos.'] },
};

export default function Legal() {
  const { slug = '' } = useParams();
  const page = PAGES[slug] ?? { title: 'Página no encontrada', body: ['No encontramos esta página.'] };
  useTitle(page.title);
  return (
    <Page>
      <article style={{ padding: '1rem var(--pad) 3rem', maxWidth: '46rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h1 className="dsp" style={{ fontSize: '2.3rem' }}>{page.title}</h1>
        {page.body.map((p) => <p key={p} style={{ fontSize: '1.1rem' }}>{p}</p>)}
      </article>
    </Page>
  );
}
