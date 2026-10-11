import type { VegKey } from './lots';

/** Compras ya terminadas de la persona compradora de ejemplo. */
export interface PastPurchase {
  id: string;
  status: 'no' | 'rec';
  product: VegKey;
  tile: string;
  name: string;
  what: string;
  amount: string;
  charge: string;
  action: string;
  href: string;
}

export const PAST_PURCHASES: PastPurchase[] = [
  { id: 'padron', status: 'no', product: 'pimiento', tile: '#F1ECE2', name: 'Pimiento de Padrón · 1 kilo', what: 'No se juntaron las personas necesarias antes del 2 de octubre.', amount: '0 €', charge: 'no se te ha cobrado nada', action: 'Ver productos parecidos', href: '/productos' },
  { id: 'manzana', status: 'rec', product: 'manzana', tile: '#FFF1B8', name: 'Manzana golden · 3 kilos', what: 'La recogiste el sábado 3 de octubre en Sant Antoni.', amount: '3,90 €', charge: 'pagado', action: 'Valorar al agricultor', href: '#' },
];

/** Historial del productor de ejemplo (Huerta Can Ribes). */
export interface ProducerOrder {
  id: string;
  status: 'conf' | 'done' | 'no';
  product: VegKey;
  tile: string;
  name: string;
  people?: number;
  priceKg?: number;
  total?: number;
  date?: string;
  note?: string;
}

export const PRODUCER_ORDERS: ProducerOrder[] = [
  { id: 'o1', status: 'conf', product: 'calabacin', tile: '#DDF1DF', name: 'Calabacín', people: 13, priceKg: 150, total: 3900 },
  { id: 'o2', status: 'conf', product: 'zanahoria', tile: '#FDE7D3', name: 'Zanahoria', people: 21, priceKg: 190, total: 7980 },
  { id: 'o3', status: 'done', product: 'naranja', tile: '#FFF1B8', name: 'Naranja', date: 'Sábado 3 de octubre', total: 5400 },
  { id: 'o4', status: 'no', product: 'pimiento', tile: '#F1ECE2', name: 'Pimiento de Padrón', note: 'Se apuntaron 6 de 12.' },
];
