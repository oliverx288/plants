import type { SVGProps } from 'react';

const PATHS = {
  phone: <path d="M5 3h4l2 5-2.5 1.5a11 11 0 006 6L16 13l5 2v4a2 2 0 01-2 2A17 17 0 013 5a2 2 0 012-2z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  bag: <><path d="M3 9h18l-2 11H5z" /><path d="M8 9l3-5M16 9l-3-5M9 13v4M15 13v4" /></>,
  bagS: <><path d="M3 9h18l-2 11H5z" /><path d="M8 9l3-5M16 9l-3-5" /></>,
  leaf: <><path d="M12 21v-9" /><path d="M12 12C12 7 8 4 3 4c0 5 4 8 9 8z" /><path d="M12 14c0-4 3-7 8-7 0 4-3 7-8 7z" /><path d="M5 21h14" /></>,
  pin: <><path d="M11 20s-6-5.5-6-10a6 6 0 0112 0c0 4.5-6 10-6 10z" transform="translate(1 1)" /><circle cx="12" cy="11" r="2.2" /></>,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6 15h4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14.5c3 0 6 2 6 5" /></>,
  qr: <><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  share: <><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="6" r="2.6" /><circle cx="18" cy="18" r="2.6" /><path d="M8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  alert: <><circle cx="12" cy="12" r="10" /><path d="M12 7v6M12 16.5v.5" /></>,
  errx: <><circle cx="12" cy="12" r="10" /><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" /></>,
  download: <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />,
  refresh: <path d="M20 12a8 8 0 10-2.5 5.8M20 5v7h-7" />,
  help: <><circle cx="12" cy="12" r="10" /><path d="M9.5 9.5a2.6 2.6 0 115 .8c0 1.6-2.5 2-2.5 3.7M12 17v.5" /></>,
  cookie: <path d="M20 3a17 17 0 1017 17 6 6 0 01-7-6 6 6 0 01-6-7 6 6 0 01-4-4z" transform="translate(-8 -2) scale(.85)" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  box: <><path d="M3 8l9-5 9 5v9l-9 5-9-5z" /><path d="M3 8l9 5 9-5M12 13v9" /></>,
  money: <><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="3" /></>,
  flag: <path d="M6 21V4M6 5h11l-2 4 2 4H6" />,
  sliders: <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" />,
} as const;

export type IconName = keyof typeof PATHS;

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name' | 'stroke'> {
  name: IconName;
  size?: number | string;
  stroke?: number;
}

/** Iconos SVG en línea. Siempre decorativos (aria-hidden): el texto lleva el significado. */
export function Icon({ name, size = 22, stroke = 2.2, ...rest }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flex: 'none' }} {...rest}>
      {PATHS[name]}
    </svg>
  );
}
