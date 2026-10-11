export interface AdminUser { id: string; name: string; mail: string; tipo: 'Compra' | 'Vende'; compras: number | string; off: boolean }
export interface AdminProducer { id: string; name: string; owner: string; town: string; onSale: number; status: 'pendiente' | 'ok' | 'off' }

export const ADMIN_USERS: AdminUser[] = [
  { id: 'u1', name: 'Lucía Martín', mail: 'lucia@ejemplo.com', tipo: 'Compra', compras: 6, off: false },
  { id: 'u2', name: 'Jordi Puig', mail: 'jordi@ejemplo.com', tipo: 'Compra', compras: 2, off: false },
  { id: 'u3', name: 'Montse Ribes', mail: 'huerta@ejemplo.com', tipo: 'Vende', compras: '—', off: false },
  { id: 'u4', name: 'Persona de ejemplo', mail: 'persona@ejemplo.com', tipo: 'Compra', compras: 1, off: true },
  { id: 'u5', name: 'Ana Roca', mail: 'ana@ejemplo.com', tipo: 'Compra', compras: 1, off: false },
];

export const ADMIN_PRODUCERS: AdminProducer[] = [
  { id: 'p1', name: 'Finca Els Pins', owner: 'Pere Vidal', town: 'Figueres', onSale: 0, status: 'pendiente' },
  { id: 'p2', name: 'Huerta Can Ribes', owner: 'Montse Ribes', town: 'Vilafranca del Penedès', onSale: 3, status: 'ok' },
  { id: 'p3', name: 'Hort de la Ribera', owner: 'Vicent Soler', town: 'Alzira', onSale: 1, status: 'ok' },
  { id: 'p4', name: 'Cal Pagès', owner: 'Joan Pagès', town: 'Prades', onSale: 0, status: 'off' },
];

export interface Incident { id: string; when: string; text: string; who: string; resolved: boolean }
export const INCIDENTS: Incident[] = [
  { id: 'i1', when: 'Sábado 3 de octubre', text: 'Una persona no pudo recoger su pedido y no tenía el código.', who: 'Mercat de Sant Antoni · Ana Roca', resolved: false },
  { id: 'i2', when: 'Sábado 3 de octubre', text: 'Faltaba 1 kilo en una caja de manzana golden.', who: 'Mercat de la Concepció · Jordi Puig', resolved: true },
];
