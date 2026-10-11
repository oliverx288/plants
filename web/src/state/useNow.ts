import { useEffect, useState } from 'react';
import { now } from '../services/clock';

/** Hora simulada, refrescada cada 30 segundos para que las cuentas atrás avancen. */
export function useNow(): number {
  const [t, setT] = useState(now());
  useEffect(() => {
    const id = window.setInterval(() => setT(now()), 30000);
    return () => window.clearInterval(id);
  }, []);
  return t;
}
