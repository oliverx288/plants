import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import type { Lot, Tier, TagKey, VegKey, CatKey } from '../data/lots';
import { loadJSON, saveJSON } from '../services/storage';

export type Role = 'guest' | 'buyer' | 'producer' | 'admin';
export type FontSize = 18 | 21 | 24;
export type CookieChoice = 'pending' | 'necessary' | 'all';

export interface Draft {
  product: VegKey;
  name: string;
  hasPhoto: boolean;
  exc: boolean;
  cal: boolean;
  total: number;
  per: number;
  min: number;
  prices: [number, number, number];
  dayIdx: number;
  marketIdx: number;
}

export const EMPTY_DRAFT: Draft = {
  product: 'tomate', name: 'Tomate de pera', hasPhoto: true, exc: true, cal: false,
  total: 50, per: 2, min: 10, prices: [240, 210, 180], dayIdx: 0, marketIdx: 0,
};

export interface Account {
  name: string;
  email: string;
  phone: string;
  marketId: string;
  cardLast4: string;
  sms: boolean;
  mail: boolean;
}

export interface State {
  role: Role;
  fontSize: FontSize;
  cookies: CookieChoice;
  joined: string[];
  cancelled: string[];
  createdLots: Lot[];
  lastCreated: string | null;
  draft: Draft;
  account: Account;
  /** Estado de las acciones de administración. */
  adminOff: Record<string, boolean>;
  producerVerified: Record<string, boolean>;
  resolved: Record<string, boolean>;
  delivered: Record<string, boolean>;
}

export const INITIAL: State = {
  role: 'buyer',
  fontSize: 18,
  cookies: 'pending',
  joined: ['calabacin', 'naranja', 'patata'],
  cancelled: [],
  createdLots: [],
  lastCreated: null,
  draft: EMPTY_DRAFT,
  account: { name: 'Lucía Martín', email: 'lucia@ejemplo.com', phone: '600 000 000', marketId: 'sant-antoni', cardLast4: '4821', sms: true, mail: true },
  adminOff: { u4: true, p4: true, collblanc: true },
  producerVerified: {},
  resolved: {},
  delivered: {},
};

type Action =
  | { type: 'role'; role: Role }
  | { type: 'fontSize'; size: FontSize }
  | { type: 'cookies'; choice: CookieChoice }
  | { type: 'join'; id: string }
  | { type: 'leave'; id: string }
  | { type: 'draft'; patch: Partial<Draft> }
  | { type: 'resetDraft'; from?: Partial<Draft> }
  | { type: 'publish'; lot: Lot }
  | { type: 'cancelLot'; id: string }
  | { type: 'account'; patch: Partial<Account> }
  | { type: 'toggle'; key: 'adminOff' | 'producerVerified' | 'resolved' | 'delivered'; id: string; value: boolean }
  | { type: 'reset' };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'role': return { ...s, role: a.role };
    case 'fontSize': return { ...s, fontSize: a.size };
    case 'cookies': return { ...s, cookies: a.choice };
    case 'join': return s.joined.includes(a.id) ? s : { ...s, joined: [...s.joined, a.id] };
    case 'leave': return { ...s, joined: s.joined.filter((x) => x !== a.id) };
    case 'draft': return { ...s, draft: { ...s.draft, ...a.patch } };
    case 'resetDraft': return { ...s, draft: { ...EMPTY_DRAFT, ...a.from } };
    case 'publish': return { ...s, createdLots: [a.lot, ...s.createdLots], lastCreated: a.lot.id };
    case 'cancelLot': return { ...s, cancelled: [...s.cancelled, a.id] };
    case 'account': return { ...s, account: { ...s.account, ...a.patch } };
    case 'toggle': return { ...s, [a.key]: { ...s[a.key], [a.id]: a.value } };
    case 'reset': return { ...INITIAL, fontSize: s.fontSize, role: s.role };
    default: return s;
  }
}

const KEY = 'lotalot.v1';

interface Ctx { state: State; dispatch: Dispatch<Action> }
const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL, (init) => loadJSON<State>(KEY, init));
  useEffect(() => saveJSON(KEY, state), [state]);
  useEffect(() => {
    document.documentElement.style.fontSize = `${state.fontSize}px`;
  }, [state.fontSize]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreContext);
  if (!c) throw new Error('useStore fuera de StoreProvider');
  return c;
}

export const HOME_BY_ROLE: Record<Role, string> = { guest: '/', buyer: '/productos', producer: '/productor', admin: '/admin' };

export type { Tier, TagKey, CatKey };
