import { createContext, useContext } from 'react'
import type { Profile } from './profile'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  /** Hay sesión pero la cuenta no tiene perfil (o no se pudo leer): no se concede acceso. */
  | { status: 'denied'; reason: 'no-profile' | 'error' }
  | { status: 'signedIn'; email: string; profile: Profile }

export type SignInResult = { ok: true } | { ok: false; message: string }

export interface AuthContextValue {
  state: AuthState
  signIn: (email: string, password: string) => Promise<SignInResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return value
}
