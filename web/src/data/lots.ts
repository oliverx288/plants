export type VegKey = 'tomate' | 'pimiento' | 'patata' | 'zanahoria' | 'calabacin' | 'judia' | 'naranja' | 'manzana' | 'otro';
export type CatKey = 'roja' | 'raiz' | 'legumbre' | 'hoja' | 'fruta';
export type TagKey = 'exc' | 'cal' | 'eco';

export interface Tier {
  /** Personas a partir de las cuales se aplica este precio. */
  from: number;
  /** Céntimos por kilo. */
  price: number;
}

export interface Lot {
  id: string;
  product: VegKey;
  name: string;
  cat: CatKey;
  producerId: string;
  producerName: string;
  /** Comarca, entre paréntesis en las tarjetas. */
  area: string;
  town: string;
  deliveries: number;
  totalKg: number;
  perPerson: number;
  min: number;
  max: number;
  tiers: Tier[];
  /** ISO con zona horaria. */
  deadline: string;
  marketId: string;
  tags: TagKey[];
  /** Personas apuntadas sin contar a la persona del prototipo. */
  baseCount: number;
  description: string;
  /** Si es false solo lo ve el productor (todavía no sale en el catálogo). */
  listed: boolean;
  publishedAt: string;
  /** Producto creado en esta sesión por la persona productora. */
  created?: boolean;
}

export const CATEGORIES: Record<CatKey, { label: string; bg: string; fg: string; dot: string }> = {
  roja: { label: 'Hortalizas rojas', bg: '#FDE4E6', fg: '#A31D2A', dot: '#E63946' },
  raiz: { label: 'Patatas y raíces', bg: '#FDE7D3', fg: '#7A3A0C', dot: '#F4A261' },
  legumbre: { label: 'Legumbres', bg: '#ECE4F6', fg: '#45306A', dot: '#6A4C93' },
  hoja: { label: 'Hoja y verdes', bg: '#DDF1DF', fg: '#1F5A27', dot: '#3FA34D' },
  fruta: { label: 'Fruta y cítricos', bg: '#FFF1B8', fg: '#4A3B00', dot: '#E8BC1E' },
};

export const TAGS: Record<TagKey, { label: string; cls: string }> = {
  exc: { label: 'Sobra de cosecha', cls: 't-exc' },
  cal: { label: 'Tamaño irregular', cls: 't-cal' },
  eco: { label: 'Ecológico', cls: 't-eco' },
};

const CAN_RIBES = { producerId: 'can-ribes', producerName: 'Huerta Can Ribes', area: 'Penedès', town: 'Vilafranca del Penedès', deliveries: 12 };

export const LOTS: Lot[] = [
  {
    id: 'tomate', product: 'tomate', name: 'Tomate de pera', cat: 'roja', ...CAN_RIBES,
    totalKg: 50, perPerson: 2, min: 10, max: 25,
    tiers: [{ from: 10, price: 240 }, { from: 15, price: 210 }, { from: 20, price: 180 }],
    deadline: '2026-10-10T20:00:00+02:00', marketId: 'sant-antoni', tags: ['exc'], baseCount: 7, listed: true,
    publishedAt: '2026-10-05',
    description: 'Tomate de pera recogido esta semana. Es lo que le ha sobrado al agricultor: mismo sabor y calidad, aunque algunas piezas tienen marcas en la piel. Muy bueno para salsa, sofrito y conserva.',
  },
  {
    id: 'calabacin', product: 'calabacin', name: 'Calabacín', cat: 'hoja',
    producerId: 'mas-del-pi', producerName: 'Mas del Pi', area: 'Maresme', town: 'Cabrera de Mar', deliveries: 8,
    totalKg: 40, perPerson: 2, min: 8, max: 20,
    tiers: [{ from: 8, price: 160 }, { from: 12, price: 140 }, { from: 16, price: 120 }],
    deadline: '2026-10-09T08:00:00+02:00', marketId: 'concepcio', tags: ['exc', 'cal'], baseCount: 3, listed: true,
    publishedAt: '2026-10-04',
    description: 'Calabacín de temporada, algunos más grandes de lo normal. Perfecto para cremas, al horno o a la plancha.',
  },
  {
    id: 'patata', product: 'patata', name: 'Patata agria', cat: 'raiz',
    producerId: 'cal-pages', producerName: 'Cal Pagès', area: 'Prades', town: 'Prades', deliveries: 21,
    totalKg: 200, perPerson: 5, min: 20, max: 40,
    tiers: [{ from: 20, price: 80 }, { from: 30, price: 70 }, { from: 35, price: 60 }],
    deadline: '2026-10-09T20:00:00+02:00', marketId: 'sant-antoni', tags: ['exc'], baseCount: 21, listed: true,
    publishedAt: '2026-10-01',
    description: 'Patata agria de la montaña de Prades. Ideal para freír, hacer tortilla o cocer. Se conserva semanas en un sitio fresco y oscuro.',
  },
  {
    id: 'judia', product: 'judia', name: 'Judía verde', cat: 'legumbre', ...CAN_RIBES,
    totalKg: 10, perPerson: 1, min: 6, max: 10,
    tiers: [{ from: 6, price: 320 }, { from: 8, price: 290 }, { from: 10, price: 260 }],
    deadline: '2026-10-12T20:00:00+02:00', marketId: 'concepcio', tags: ['eco'], baseCount: 2, listed: true,
    publishedAt: '2026-10-06',
    description: 'Judía verde ecológica, fina y tierna. Se recoge la víspera de la entrega para que llegue fresca.',
  },
  {
    id: 'naranja', product: 'naranja', name: 'Naranja navel', cat: 'fruta',
    producerId: 'hort-ribera', producerName: 'Hort de la Ribera', area: 'Alzira', town: 'Alzira', deliveries: 15,
    totalKg: 120, perPerson: 5, min: 15, max: 24,
    tiers: [{ from: 15, price: 105 }, { from: 18, price: 95 }, { from: 21, price: 85 }],
    deadline: '2026-10-12T20:00:00+02:00', marketId: 'sant-antoni', tags: ['cal'], baseCount: 17, listed: true,
    publishedAt: '2026-10-02',
    description: 'Naranja navel de Alzira, dulce y sin pepitas. Algunas piezas son más pequeñas o tienen la piel con manchas, pero por dentro son iguales.',
  },
  {
    id: 'zanahoria', product: 'zanahoria', name: 'Zanahoria', cat: 'raiz',
    producerId: 'cal-pages', producerName: 'Cal Pagès', area: 'Prades', town: 'Prades', deliveries: 21,
    totalKg: 60, perPerson: 2, min: 15, max: 30,
    tiers: [{ from: 15, price: 110 }, { from: 20, price: 95 }, { from: 25, price: 80 }],
    deadline: '2026-10-13T20:00:00+02:00', marketId: 'ninot', tags: ['cal'], baseCount: 11, listed: true,
    publishedAt: '2026-10-06',
    description: 'Zanahoria con tierra, de formas y tamaños variados. Muy dulce, buena para ralladas, cremas y guisos.',
  },
  {
    id: 'pimiento', product: 'pimiento', name: 'Pimiento rojo', cat: 'roja', ...CAN_RIBES,
    totalKg: 30, perPerson: 2, min: 9, max: 15,
    tiers: [{ from: 9, price: 260 }, { from: 11, price: 230 }, { from: 13, price: 200 }],
    deadline: '2026-10-14T20:00:00+02:00', marketId: 'sant-antoni', tags: ['exc'], baseCount: 1, listed: false,
    publishedAt: '2026-10-08',
    description: 'Pimiento rojo carnoso, bueno para asar y para conserva.',
  },
];
