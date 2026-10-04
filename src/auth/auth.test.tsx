// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ---- Supabase simulado: controlamos sesión, perfiles y el listener de cambios de sesión ----------
const fake = vi.hoisted(() => {
  type Listener = (event: string, session: unknown) => void
  const state = {
    session: null as unknown,
    listeners: new Set<Listener>(),
    users: {} as Record<string, { password: string; id: string; metadata?: Record<string, unknown> }>,
    profiles: {} as Record<string, unknown>,
    profileError: false,
    signInError: null as null | { status: number; code: string },
  }
  const emit = (event: string, session: unknown) => state.listeners.forEach((l) => l(event, session))
  const sessionFor = (email: string) => ({
    user: { id: state.users[email].id, email, user_metadata: state.users[email].metadata ?? {} },
  })

  const client = {
    auth: {
      onAuthStateChange: vi.fn((cb: Listener) => {
        state.listeners.add(cb)
        queueMicrotask(() => cb('INITIAL_SESSION', state.session))
        return { data: { subscription: { unsubscribe: () => state.listeners.delete(cb) } } }
      }),
      signInWithPassword: vi.fn(async ({ email, password }: { email: string; password: string }) => {
        if (state.signInError) return { data: {}, error: state.signInError }
        const user = state.users[email]
        if (!user || user.password !== password) {
          return { data: {}, error: { status: 400, code: 'invalid_credentials' } }
        }
        state.session = sessionFor(email)
        emit('SIGNED_IN', state.session)
        return { data: { session: state.session }, error: null }
      }),
      signOut: vi.fn(async () => {
        state.session = null
        emit('SIGNED_OUT', null)
        return { error: null }
      }),
    },
    from: vi.fn(() => ({
      select: () => ({
        eq: (_column: string, id: string) => ({
          maybeSingle: async () =>
            state.profileError
              ? { data: null, error: { message: 'boom' } }
              : { data: state.profiles[id] ?? null, error: null },
        }),
      }),
    })),
  }
  return { state, client, sessionFor }
})

vi.mock('../lib/supabase', () => ({ supabase: fake.client }))

import { AppRoutes } from '../App'
import { AuthProvider } from './AuthProvider'
import { RequireAuth } from './RequireAuth'
import { RequireRole } from './RequireRole'

const LUCIA = { id: 'u-lucia', password: 'clave-lucia-123' }
const NURIA = { id: 'u-nuria', password: 'clave-nuria-123' }

function setup(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <AppRoutes />
        <Routes>
          <Route element={<RequireAuth />}>
            <Route element={<RequireRole role="editor" />}>
              <Route path="/solo-editor" element={<p>Panel del editor</p>} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  fake.state.session = null
  fake.state.listeners.clear()
  fake.state.profileError = false
  fake.state.signInError = null
  fake.state.users = {
    'lucia@velia-demo.test': { ...LUCIA },
    'nuria@velia-demo.test': { ...NURIA },
  }
  fake.state.profiles = {
    [LUCIA.id]: { id: LUCIA.id, role: 'agent', display_name: 'Lucía' },
    [NURIA.id]: { id: NURIA.id, role: 'editor', display_name: 'Nuria' },
  }
  vi.clearAllMocks()
})
afterEach(cleanup)

async function logIn(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Correo electrónico'), email)
  await user.type(screen.getByLabelText('Contraseña'), password)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
  return user
}

describe('rutas protegidas', () => {
  it('sin sesión, redirige al login', async () => {
    setup('/')
    expect(await screen.findByRole('heading', { name: 'Faro' })).toBeTruthy()
    expect(screen.getByLabelText('Correo electrónico')).toBeTruthy()
    expect(screen.queryByText(/Has iniciado sesión/)).toBeNull()
  })

  it('con sesión y perfil, muestra la app con nombre y rol', async () => {
    fake.state.session = fake.sessionFor('lucia@velia-demo.test')
    setup('/')
    expect(await screen.findByRole('heading', { name: 'Hola, Lucía' })).toBeTruthy()
    expect(screen.getByText('Agente')).toBeTruthy()
  })
})

describe('login', () => {
  it('inicia sesión, normaliza el correo y entra en la app', async () => {
    setup('/')
    await logIn('  LUCIA@Velia-Demo.test ', LUCIA.password)

    expect(await screen.findByRole('heading', { name: 'Hola, Lucía' })).toBeTruthy()
    expect(fake.client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'lucia@velia-demo.test',
      password: LUCIA.password,
    })
  })

  it('con credenciales incorrectas muestra un mensaje genérico y vacía la contraseña', async () => {
    setup('/')
    await logIn('lucia@velia-demo.test', 'mala-clave-xx')

    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeTruthy()
    expect((screen.getByLabelText('Contraseña') as HTMLInputElement).value).toBe('')
  })

  it('usa el mismo mensaje si el correo no existe (no revela qué correos tienen cuenta)', async () => {
    setup('/')
    await logIn('nadie@velia-demo.test', 'cualquier-clave')
    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeTruthy()
  })

  it('valida los campos en el cliente sin llamar al servidor', async () => {
    setup('/')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Escribe tu correo electrónico.')).toBeTruthy()
    expect(screen.getByText('Escribe tu contraseña.')).toBeTruthy()

    await user.type(screen.getByLabelText('Correo electrónico'), 'esto-no-es-un-correo')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText(/Escribe un correo válido/)).toBeTruthy()
    expect(fake.client.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('muestra el aviso de demasiados intentos', async () => {
    fake.state.signInError = { status: 429, code: 'over_request_rate_limit' }
    setup('/')
    await logIn('lucia@velia-demo.test', LUCIA.password)
    expect(await screen.findByText(/Demasiados intentos/)).toBeTruthy()
  })

  it('vuelve a la ruta interna que se había pedido antes del login', async () => {
    // Las redirecciones externas se descartan en getSafeRedirect (ver redirect.test.ts).
    setup('/solo-editor')
    await logIn('nuria@velia-demo.test', NURIA.password)
    expect(await screen.findByText('Panel del editor')).toBeTruthy()
  })
})

describe('perfil y rol', () => {
  it('una cuenta sin perfil NO accede, aunque tenga sesión', async () => {
    fake.state.users['intruso@velia-demo.test'] = { id: 'u-intruso', password: 'clave-intruso-1' }
    setup('/')
    await logIn('intruso@velia-demo.test', 'clave-intruso-1')

    expect(await screen.findByText(/no tiene acceso a Faro/)).toBeTruthy()
    expect(screen.queryByText(/Hola,/)).toBeNull()
  })

  it('si falla la lectura del perfil, deniega el acceso', async () => {
    fake.state.profileError = true
    fake.state.session = fake.sessionFor('lucia@velia-demo.test')
    setup('/')
    expect(await screen.findByText(/No se pudo comprobar tu perfil/)).toBeTruthy()
    expect(screen.queryByText(/Hola,/)).toBeNull()
  })

  it('el rol sale de la base de datos, NO de user_metadata (que el usuario puede manipular)', async () => {
    fake.state.users['lucia@velia-demo.test'].metadata = { role: 'editor' }
    setup('/solo-editor')
    await logIn('lucia@velia-demo.test', LUCIA.password)

    expect(await screen.findByText('No tienes permiso para ver esta página')).toBeTruthy()
    expect(screen.queryByText('Panel del editor')).toBeNull()
  })

  it('el editor sí accede a las rutas de editor y el agente no', async () => {
    fake.state.session = fake.sessionFor('nuria@velia-demo.test')
    const { unmount } = setup('/solo-editor')
    expect(await screen.findByText('Panel del editor')).toBeTruthy()
    unmount()

    fake.state.session = fake.sessionFor('lucia@velia-demo.test')
    setup('/solo-editor')
    expect(await screen.findByText('No tienes permiso para ver esta página')).toBeTruthy()
  })
})

describe('cerrar sesión', () => {
  it('cierra la sesión y vuelve al login sin dejar el perfil anterior', async () => {
    fake.state.session = fake.sessionFor('nuria@velia-demo.test')
    setup('/')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))

    await waitFor(() => expect(screen.getByLabelText('Correo electrónico')).toBeTruthy())
    expect(fake.client.auth.signOut).toHaveBeenCalled()
    expect(screen.queryByText('Nuria')).toBeNull()
  })

  it('al entrar con otra cuenta no se queda el rol de la anterior', async () => {
    fake.state.session = fake.sessionFor('nuria@velia-demo.test')
    setup('/')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))
    await logIn('lucia@velia-demo.test', LUCIA.password)

    expect(await screen.findByRole('heading', { name: 'Hola, Lucía' })).toBeTruthy()
    expect(screen.getByText('Agente')).toBeTruthy()
    expect(screen.queryByText('Editor')).toBeNull()
  })
})
