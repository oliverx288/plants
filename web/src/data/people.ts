export interface Person { initials: string; name: string; bg: string; fg: string; day: string }

/** Personas apuntadas de ejemplo (solo nombre y primera letra del apellido). */
export const PEOPLE: Person[] = [
  { initials: 'JP', name: 'Jordi P.', bg: '#C62F3B', fg: '#fff', day: '5 de octubre' },
  { initials: 'AR', name: 'Ana R.', bg: '#6A4C93', fg: '#fff', day: '5 de octubre' },
  { initials: 'MT', name: 'Marc T.', bg: '#F4A261', fg: '#2E1603', day: '6 de octubre' },
  { initials: 'CL', name: 'Carmen L.', bg: '#3FA34D', fg: '#0E2A12', day: '6 de octubre' },
  { initials: 'PS', name: 'Pau S.', bg: '#FFD23F', fg: '#3B2F00', day: '7 de octubre' },
  { initials: 'NG', name: 'Nuria G.', bg: '#C62F3B', fg: '#fff', day: '7 de octubre' },
  { initials: 'ED', name: 'Eva D.', bg: '#2E7D38', fg: '#fff', day: '8 de octubre' },
  { initials: 'RB', name: 'Raúl B.', bg: '#6A4C93', fg: '#fff', day: '8 de octubre' },
  { initials: 'IM', name: 'Irene M.', bg: '#F4A261', fg: '#2E1603', day: '8 de octubre' },
  { initials: 'SC', name: 'Sergi C.', bg: '#3FA34D', fg: '#0E2A12', day: '8 de octubre' },
  { initials: 'LV', name: 'Laia V.', bg: '#C62F3B', fg: '#fff', day: '8 de octubre' },
  { initials: 'OF', name: 'Oriol F.', bg: '#FFD23F', fg: '#3B2F00', day: '8 de octubre' },
];
