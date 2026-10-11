import { LOTS, CATEGORIES, TAGS, type Lot, type Tier } from '../data/lots';
import { getMarket } from '../data/markets';
import { dayLong, dayShort, eur, kilos, plural, sameMadridDay, timeOf } from './format';
import { now } from './clock';

export type LotStatus = 'curso' | 'conf' | 'no' | 'rec';

export const STATUS_LABEL: Record<LotStatus, string> = {
  curso: 'En curso: faltan personas',
  conf: 'Compra confirmada',
  no: 'No salió adelante',
  rec: 'Recogida',
};

/** Capa de datos de productos. Hoy lee datos simulados; mañana puede llamar a una API. */
export const lotsService = {
  all(extra: Lot[] = []): Lot[] {
    return [...extra, ...LOTS];
  },
  listed(extra: Lot[] = []): Lot[] {
    return this.all(extra).filter((l) => l.listed);
  },
  get(id: string | undefined, extra: Lot[] = []): Lot | undefined {
    return this.all(extra).find((l) => l.id === id);
  },
};

export const peopleCount = (lot: Lot, joined: string[]): number => lot.baseCount + (joined.includes(lot.id) ? 1 : 0);

export const statusOf = (lot: Lot, count: number, cancelled: string[] = []): LotStatus => {
  if (cancelled.includes(lot.id)) return 'no';
  return count >= lot.min ? 'conf' : 'curso';
};

/** Precio por kilo (céntimos) del último tramo alcanzado; si aún no se llega al mínimo, el primero. */
export const currentTier = (lot: Lot, count: number): { tier: Tier; index: number } => {
  let index = 0;
  lot.tiers.forEach((t, i) => {
    if (count >= t.from) index = i;
  });
  return { tier: lot.tiers[index], index };
};
export const currentPrice = (lot: Lot, count: number): number => currentTier(lot, count).tier.price;

export const tierRange = (lot: Lot, i: number): string => {
  const from = lot.tiers[i].from;
  const to = i < lot.tiers.length - 1 ? lot.tiers[i + 1].from - 1 : lot.max;
  return `De ${from} a ${to} personas`;
};

export const nextTier = (lot: Lot, count: number): Tier | undefined => lot.tiers.find((t) => t.from > count);

export const subline = (lot: Lot): string => `Te llevas ${kilos(lot.perPerson)} · ${lot.producerName} (${lot.area})`;

export const category = (lot: Lot) => CATEGORIES[lot.cat];
export const tagsOf = (lot: Lot) => lot.tags.map((t) => TAGS[t]);

export interface TimeLeft { days: number; hours: number; minutes: number; ms: number }
export const timeLeft = (lot: Lot, at: number = now()): TimeLeft => {
  const ms = Math.max(0, Date.parse(lot.deadline) - at);
  return { days: Math.floor(ms / 864e5), hours: Math.floor((ms % 864e5) / 36e5), minutes: Math.floor((ms % 36e5) / 6e4), ms };
};
export const isLastDay = (lot: Lot, at: number = now()): boolean => timeLeft(lot, at).ms < 30 * 36e5;

/** "Puedes apuntarte 2 días más" / "¡Último día! Cierra mañana a las 8:00" */
export const joinWindowText = (lot: Lot, at: number = now()): string => {
  const left = timeLeft(lot, at);
  if (left.ms === 0) return 'Ya no se puede apuntar nadie';
  if (isLastDay(lot, at)) {
    const sameDay = sameMadridDay(at, lot.deadline);
    return `¡Último día! Cierra ${sameDay ? 'hoy' : 'mañana'} a las ${timeOf(lot.deadline)}`;
  }
  return `Puedes apuntarte ${left.days} ${plural(left.days, 'día', 'días')} más`;
};

export const deadlineSentence = (lot: Lot): string => `${dayLong(lot.deadline)}, a las ${timeOf(lot.deadline)}`;
export const deadlineShort = (lot: Lot): string => dayShort(lot.deadline);

export const pickupLine = (lot: Lot): { market: string; when: string; long: string } => {
  const m = getMarket(lot.marketId);
  return { market: m.name, when: `${dayLong(m.nextDate)}, ${m.hours.replace('de ', 'de ')}`, long: `${dayLong(m.nextDate)}, ${m.hours}` };
};

export const needText = (lot: Lot, count: number, status: LotStatus): string => {
  if (status === 'conf') return '✓ Se comprará seguro. Aún puedes apuntarte.';
  const falta = Math.max(0, lot.min - count);
  return `Faltan ${falta} ${plural(falta, 'persona', 'personas')} para llegar al mínimo`;
};

export const maxEarn = (lot: Lot): number => lot.max * lot.perPerson * lot.tiers[lot.tiers.length - 1].price;
export const minEarn = (lot: Lot): number => lot.min * lot.perPerson * lot.tiers[0].price;
export const yourMax = (lot: Lot, count: number): number => lot.perPerson * currentPrice(lot, count);
export { eur };
