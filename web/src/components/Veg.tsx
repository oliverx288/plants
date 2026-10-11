import type { VegKey } from '../data/lots';

interface Props { kind: VegKey; size?: number; className?: string }

/** Verduras ilustradas en SVG. Son decorativas: el nombre siempre aparece en texto. */
export function Veg({ kind, size = 96, className }: Props) {
  const common = { width: size, height: size, viewBox: '0 0 64 64', 'aria-hidden': true, focusable: false, className } as const;
  switch (kind) {
    case 'tomate':
      return (
        <svg {...common}>
          <circle cx="32" cy="37" r="21" fill="#E63946" />
          <ellipse cx="24" cy="31" rx="4" ry="7" fill="#fff" opacity=".35" />
          <path d="M32 18c-4 3-10 3-13 1 3 5 9 6 13 3 4 3 10 2 13-3-3 2-9 2-13-1z" fill="#3FA34D" />
          <path d="M32 19v-8" stroke="#2E7D38" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'pimiento':
      return (
        <svg {...common}>
          <path d="M20 14c6 0 8 6 10 14 3 12 8 20 14 24-10 2-22-6-26-20-2-8-2-18 2-18z" fill="#E63946" />
          <path d="M20 14c-2-4 0-8 4-8" stroke="#2E7D38" strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'patata':
      return (
        <svg {...common}>
          <path d="M12 36c0-12 12-20 26-18 10 1 16 8 15 17-1 11-12 17-24 16-10-1-17-6-17-15z" fill="#D9A066" />
          <circle cx="24" cy="32" r="1.8" fill="#9C6A34" /><circle cx="36" cy="40" r="1.8" fill="#9C6A34" /><circle cx="42" cy="28" r="1.8" fill="#9C6A34" />
        </svg>
      );
    case 'zanahoria':
      return (
        <svg {...common} style={{ transform: 'rotate(-25deg)' }}>
          <path d="M20 24c6-5 20-5 26 1L33 57c-1.5 3-4.5 3-6 0z" fill="#F4A261" />
          <path d="M26 33h6M28 41h5M24 28h4" stroke="#D9803D" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M33 22c-1-7 1-13 5-15M33 22c4-5 9-7 13-6M32 22c-4-4-9-6-13-4" stroke="#3FA34D" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'calabacin':
      return (
        <svg {...common}>
          <path d="M10 46c14-1 30-11 40-26 4 1 5 6 3 9-10 15-26 23-41 22-4-1-5-4-2-5z" fill="#3FA34D" />
          <path d="M18 46c10-3 22-10 30-21M24 47c8-3 16-8 22-15" stroke="#2E7D38" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'judia':
      return (
        <svg {...common}>
          <path d="M8 42c10 10 36 8 48-18-12 6-32 8-48 18z" fill="#3FA34D" />
          <circle cx="22" cy="42" r="5" fill="#8CCB6A" /><circle cx="33" cy="39" r="5" fill="#8CCB6A" /><circle cx="44" cy="33" r="4.5" fill="#8CCB6A" />
        </svg>
      );
    case 'naranja':
      return (
        <svg {...common}>
          <circle cx="32" cy="36" r="20" fill="#F4A261" />
          <circle cx="32" cy="36" r="17" fill="none" stroke="#E08A45" strokeWidth="1.5" strokeDasharray="1 5" />
          <path d="M32 17c3-6 10-8 14-6-3 5-9 8-14 6z" fill="#3FA34D" />
        </svg>
      );
    case 'manzana':
      return (
        <svg {...common}>
          <path d="M32 22c-10-6-22 2-20 16 2 12 10 20 20 16 10 4 18-4 20-16 2-14-10-22-20-16z" fill="#FFD23F" />
          <path d="M34 16c4-4 10-4 12-2-3 4-8 5-12 2z" fill="#3FA34D" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M32 18v28M18 32h28" stroke="#23301F" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
  }
}

export function TomatoHello() {
  return (
    <svg viewBox="0 0 120 120" width="130" height="130" aria-hidden="true" focusable="false">
      <path d="M98 62l12-26" stroke="#E63946" strokeWidth="8" strokeLinecap="round" /><circle cx="111" cy="32" r="7" fill="#E63946" />
      <circle cx="60" cy="68" r="40" fill="#E63946" /><ellipse cx="42" cy="54" rx="6" ry="10" fill="#fff" opacity=".3" />
      <path d="M60 30c-6 4-15 4-20 1 4 7 13 9 20 4 7 5 16 3 20-4-5 3-14 3-20-1z" fill="#3FA34D" />
      <path d="M60 31v-10" stroke="#2E7D38" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="38" cy="78" rx="7" ry="4.5" fill="#FF9AA8" /><ellipse cx="82" cy="78" rx="7" ry="4.5" fill="#FF9AA8" />
      <circle cx="48" cy="66" r="5.5" fill="#23301F" /><circle cx="72" cy="66" r="5.5" fill="#23301F" />
      <circle cx="50" cy="64" r="1.8" fill="#fff" /><circle cx="74" cy="64" r="1.8" fill="#fff" />
      <path d="M49 80q11 11 22 0" stroke="#23301F" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function PeaPod() {
  const pea = (cx: number) => (
    <g key={cx}>
      <circle cx={cx} cy="66" r="15" fill="#7BC95F" stroke="#2E7D38" strokeWidth="2.5" />
      <circle cx={cx - 5} cy="63" r="2.6" fill="#23301F" /><circle cx={cx + 5} cy="63" r="2.6" fill="#23301F" />
      <path d={`M${cx - 5} 70q5 5 10 0`} stroke="#23301F" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </g>
  );
  return (
    <svg viewBox="0 0 120 120" width="130" height="130" aria-hidden="true" focusable="false">
      <path d="M110 58c6-8 4-16-3-20" stroke="#2E7D38" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="60" cy="68" rx="54" ry="28" fill="#2E7D38" /><ellipse cx="60" cy="66" rx="48" ry="20" fill="#B8E39A" />
      {[30, 60, 90].map(pea)}
      <path d="M8 78q52 32 104 0" stroke="#1F5A27" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}

export function EggplantBasket() {
  return (
    <svg viewBox="0 0 120 120" width="130" height="130" aria-hidden="true" focusable="false">
      <path d="M50 30c25 0 32 30 28 50-4 24-52 24-56 0-4-20 3-50 28-50z" fill="#6A4C93" />
      <ellipse cx="36" cy="52" rx="5" ry="10" fill="#fff" opacity=".25" />
      <path d="M34 34q16-12 32 0-8 6-16 2-8 4-16-2z" fill="#3FA34D" /><path d="M50 30v-10" stroke="#2E7D38" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="32" cy="74" rx="6" ry="4" fill="#C9A6F0" /><ellipse cx="68" cy="74" rx="6" ry="4" fill="#C9A6F0" />
      <circle cx="40" cy="62" r="5" fill="#fff" /><circle cx="60" cy="62" r="5" fill="#fff" />
      <circle cx="41" cy="63" r="2.6" fill="#23301F" /><circle cx="61" cy="63" r="2.6" fill="#23301F" />
      <path d="M41 76q9 8 18 0" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M80 82q14-26 28 0" stroke="#9C6A34" strokeWidth="5" fill="none" />
      <path d="M74 82h40l-6 28H80z" fill="#D9A066" stroke="#9C6A34" strokeWidth="3" strokeLinejoin="round" />
      <path d="M78 92h32M80 101h28" stroke="#9C6A34" strokeWidth="2.5" />
      <circle cx="86" cy="80" r="6" fill="#E63946" /><path d="M98 80c2-8 8-10 12-8-2 6-8 9-12 8z" fill="#3FA34D" />
    </svg>
  );
}
