const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** 240 -> "2,40 €" */
export const eur = (cents: number): string => `${(cents / 100).toFixed(2).replace('.', ',')} €`;
/** 4800 -> "48 €", 11880 -> "118,80 €" */
export const eurShort = (cents: number): string => (cents % 100 === 0 ? `${cents / 100} €` : eur(cents));

export const kilos = (n: number): string => `${n} ${n === 1 ? 'kilo' : 'kilos'}`;
export const personas = (n: number): string => `${n} ${n === 1 ? 'persona' : 'personas'}`;
export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const TZ = 'Europe/Madrid';
const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false });
const WD_INDEX = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const wdFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' });

interface Parts { y: number; m: number; day: number; h: number; min: number; wd: number }
/** Fecha y hora en Madrid, independientemente de la zona del navegador. */
const parts = (iso: string): Parts => {
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00+02:00` : iso);
  const o: Record<string, number> = {};
  fmt.formatToParts(date).forEach((p) => { if (p.type !== 'literal') o[p.type] = Number(p.value); });
  return { y: o.year, m: o.month - 1, day: o.day, h: o.hour % 24, min: o.minute, wd: WD_INDEX.indexOf(wdFmt.format(date)) };
};

/** "sábado 10" */
export const dayShort = (iso: string): string => {
  const x = parts(iso);
  return `${WEEKDAYS[x.wd]} ${x.day}`;
};
/** "sábado 10 de octubre" */
export const dayLong = (iso: string): string => {
  const x = parts(iso);
  return `${WEEKDAYS[x.wd]} ${x.day} de ${MONTHS[x.m]}`;
};
export const weekday = (iso: string): string => WEEKDAYS[parts(iso).wd];
export const dayNum = (iso: string): number => parts(iso).day;
export const monthName = (iso: string): string => MONTHS[parts(iso).m];
/** "20:00", "8:00" */
export const timeOf = (iso: string): string => {
  const x = parts(iso);
  return `${x.h}:${String(x.min).padStart(2, '0')}`;
};
export const sameMadridDay = (a: number | string, b: number | string): boolean => {
  const f = (v: number | string) => { const p = parts(typeof v === 'number' ? new Date(v).toISOString() : v); return `${p.y}-${p.m}-${p.day}`; };
  return f(a) === f(b);
};
export const dayMonthShort = (iso: string): string => `${dayNum(iso)} de ${monthName(iso)}`;

export const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);
