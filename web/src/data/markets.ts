export interface Market {
  id: string;
  name: string;
  city: string;
  /** "Sábados", "Viernes"… */
  dayLabel: string;
  /** "de 10:00 a 13:00" */
  hours: string;
  /** "10 a 13 h" */
  hoursShort: string;
  /** Próxima recogida, formato ISO (solo fecha). */
  nextDate: string;
  active: boolean;
  onSale: number;
}

export const MARKETS: Market[] = [
  { id: 'sant-antoni', name: 'Mercat de Sant Antoni', city: 'Barcelona', dayLabel: 'Sábados', hours: 'de 10:00 a 13:00', hoursShort: '10 a 13 h', nextDate: '2026-10-17', active: true, onSale: 9 },
  { id: 'concepcio', name: 'Mercat de la Concepció', city: 'Barcelona', dayLabel: 'Sábados', hours: 'de 9:00 a 12:00', hoursShort: '9 a 12 h', nextDate: '2026-10-17', active: true, onSale: 4 },
  { id: 'ninot', name: 'Mercat del Ninot', city: 'Barcelona', dayLabel: 'Viernes', hours: 'de 17:00 a 20:00', hoursShort: '17 a 20 h', nextDate: '2026-10-16', active: true, onSale: 2 },
  { id: 'collblanc', name: 'Mercat de Collblanc', city: 'L’Hospitalet de Llobregat', dayLabel: 'Jueves', hours: 'de 18:00 a 20:00', hoursShort: '18 a 20 h', nextDate: '2026-10-15', active: false, onSale: 0 },
];

export const getMarket = (id: string): Market => MARKETS.find((m) => m.id === id) ?? MARKETS[0];
