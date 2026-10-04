import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContext'
import type { AuthContextValue, AuthState, SignInResult } from './AuthContext'
import { loginErrorMessage } from './authErrors'
import { parseProfile } from './profile'
import type { Profile } from './profile'

type ProfileResult = { userId: string; profile: Profile | null; failed: boolean }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [profileResult, setProfileResult] = useState<ProfileResult | null>(null)

  // 1) Sesión. onAuthStateChange emite INITIAL_SESSION al suscribirse, así que no hace falta getSession().
  //    El callback solo guarda la sesión: hacer peticiones a Supabase dentro de él puede provocar
  //    bloqueos (deadlock) en supabase-js, por eso el perfil se carga en otro efecto.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setSessionLoaded(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // 2) Perfil (y por tanto el rol) desde la base de datos. Depende solo del id: un refresco de token
  //    cambia el objeto session pero no el usuario, y no debe volver a pedirlo.
  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    let active = true
    supabase
      .from('profiles')
      .select('id, role, display_name')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        setProfileResult({ userId, profile: error ? null : parseProfile(data), failed: Boolean(error) })
      })
    return () => {
      active = false
    }
  }, [userId])

  // Estado derivado: nunca se queda un perfil de otro usuario "pegado" tras cerrar sesión o cambiar de cuenta.
  const state: AuthState = useMemo(() => {
    if (!sessionLoaded) return { status: 'loading' }
    if (!session) return { status: 'signedOut' }
    if (!profileResult || profileResult.userId !== session.user.id) return { status: 'loading' }
    if (profileResult.profile) {
      return { status: 'signedIn', email: session.user.email ?? '', profile: profileResult.profile }
    }
    return { status: 'denied', reason: profileResult.failed ? 'error' : 'no-profile' }
  }, [sessionLoaded, session, profileResult])

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? { ok: false, message: loginErrorMessage(error) } : { ok: true }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value: AuthContextValue = useMemo(() => ({ state, signIn, signOut }), [state, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
