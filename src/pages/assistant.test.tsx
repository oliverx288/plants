// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// ---- Supabase simulado: sesión de Lucía, perfiles, artículos y las dos funciones RPC ----------------
const fake = vi.hoisted(() => {
  const state = {
    search: null as null | ((params: { query_text: string; max_results: number }) => Promise<{ data: unknown; error: unknown }>),
    log: null as null | ((params: { question_text: string }) => Promise<{ data: unknown; error: unknown }>),
    article: null as Record<string, unknown> | null,
  }
  const session = { user: { id: 'u-lucia', email: 'lucia@velia-demo.test' } }
  const client = {
    auth: {
      onAuthStateChange: vi.fn((cb: (e: string, s: unknown) => void) => {
        queueMicrotask(() => cb('INITIAL_SESSION', session))
        return { data: { subscription: { unsubscribe: () => {} } } }
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn((table: string) => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () =>
          table === 'profiles'
            ? { data: { id: 'u-lucia', role: 'agent', display_name: 'Lucía' }, error: null }
            : { data: state.article, error: null },
      }
      return builder
    }),
    rpc: vi.fn((name: string, params: never) => {
      if (name === 'search_knowledge') return state.search!(params)
      if (name === 'log_unanswered_question') return state.log!(params)
      throw new Error(`rpc inesperada: ${name}`)
    }),
  }
  return { state, client }
})

vi.mock('../lib/supabase', () => ({ supabase: fake.client }))

import { AppRoutes } from '../App'
import { AuthProvider } from '../auth/AuthProvider'

const row = (over: Record<string, unknown> = {}) => ({
  article_id: '10000000-0000-4000-8000-000000000001',
  article_title: 'La ubicación no se actualiza',
  category: 'GPS y ubicación',
  section_id: 's1',
  section_position: 1,
  heading: 'Qué comprobar primero',
  body: '',
  steps: ['Comprueba que el reloj tiene el GPS activado.', 'Comprueba que la suscripción está activa.'],
  score: 0.8,
  matched_weight: 5,
  ...over,
})
const ok = (data: unknown) => Promise.resolve({ data, error: null })
const fail = () => Promise.resolve({ data: null, error: { message: 'boom' } })

function open() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function ask(text: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Duda del cliente'), text)
  await user.click(screen.getByRole('button', { name: 'Preguntar' }))
  return user
}

beforeEach(() => {
  fake.state.search = () => ok([row()])
  fake.state.log = () => ok(null)
  fake.state.article = null
  vi.clearAllMocks()
})
afterEach(cleanup)

describe('asistente: respuesta con fuente', () => {
  it('muestra los pasos literales y cita el artículo con un enlace a la sección', async () => {
    open()
    await ask('El reloj no envía la ubicación a la app del familiar')

    expect(await screen.findByRole('heading', { name: 'Respuesta' })).toBeTruthy()
    const items = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(items).toEqual(['Comprueba que el reloj tiene el GPS activado.', 'Comprueba que la suscripción está activa.'])

    const source = screen.getByRole('link', { name: 'La ubicación no se actualiza' })
    expect(source.getAttribute('href')).toBe('/articulos/10000000-0000-4000-8000-000000000001#seccion-1')
    expect(screen.getByText('Fuente:')).toBeTruthy()
    expect(document.querySelector('q')?.textContent).toBe('El reloj no envía la ubicación a la app del familiar')
  })

  it('envía la pregunta limpia a la búsqueda y NO guarda nada como "sin respuesta"', async () => {
    open()
    await ask('  la   batería\n dura poco ')
    await screen.findByRole('heading', { name: 'Respuesta' })

    expect(fake.client.rpc).toHaveBeenCalledWith('search_knowledge', { query_text: 'la batería dura poco', max_results: 3 })
    expect(fake.client.rpc).not.toHaveBeenCalledWith('log_unanswered_question', expect.anything())
  })

  it('si el fragmento es solo explicación, añade los pasos de la sección siguiente del artículo', async () => {
    fake.state.search = () => ok([row({ section_position: 0, heading: 'Qué ocurre', body: 'El mapa muestra una hora antigua.', steps: [] })])
    fake.state.article = {
      id: '10000000-0000-4000-8000-000000000001', title: 'La ubicación no se actualiza', category: 'GPS y ubicación',
      last_reviewed_at: '2026-09-05',
      article_sections: [
        { id: 's0', position: 0, heading: 'Qué ocurre', body: 'El mapa muestra una hora antigua.', steps: [] },
        { id: 's1', position: 1, heading: 'Qué comprobar primero', body: '', steps: ['Activa el GPS'] },
      ],
    }
    open()
    await ask('el mapa no se mueve')

    expect(await screen.findByRole('heading', { name: 'Qué comprobar primero' })).toBeTruthy()
    expect(screen.getByText('El mapa muestra una hora antigua.')).toBeTruthy()
    expect(screen.getByText('Activa el GPS')).toBeTruthy()
  })

  it('el contenido con HTML se muestra como texto y no se interpreta', async () => {
    fake.state.search = () => ok([row({ body: '<img src=x onerror="window.__pwned=true">', steps: ['<script>window.__pwned=true</script>'] })])
    open()
    await ask('pregunta cualquiera')

    await screen.findByRole('heading', { name: 'Respuesta' })
    expect(screen.getByText('<script>window.__pwned=true</script>')).toBeTruthy()
    expect(document.querySelector('article img, article script')).toBeNull()
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined()
  })
})

describe('asistente: "No tengo información sobre esto"', () => {
  it('sin resultados: avisa, guarda la pregunta y lo dice', async () => {
    fake.state.search = () => ok([])
    open()
    await ask('¿Es resistente al agua?')

    expect(await screen.findByText('No tengo información sobre esto')).toBeTruthy()
    expect(screen.getByText(/He guardado la pregunta/)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Respuesta' })).toBeNull()
    expect(fake.client.rpc).toHaveBeenCalledWith('log_unanswered_question', { question_text: '¿Es resistente al agua?' })
  })

  it('un resultado por debajo del umbral NO se muestra como respuesta', async () => {
    fake.state.search = () => ok([row({ score: 0.1 })])
    open()
    await ask('¿Cuánto cuesta el reloj?')

    expect(await screen.findByText('No tengo información sobre esto')).toBeTruthy()
    expect(screen.queryByText('Fuente:')).toBeNull()
  })

  it('una consulta de una palabra genérica (puntuación perfecta pero sin evidencia) tampoco responde', async () => {
    fake.state.search = () => ok([row({ score: 1, matched_weight: 0.8 })])
    open()
    await ask('reloj')
    expect(await screen.findByText('No tengo información sobre esto')).toBeTruthy()
  })

  it('si no se pudo guardar la pregunta, lo dice con honestidad', async () => {
    fake.state.search = () => ok([])
    fake.state.log = () => fail()
    open()
    await ask('¿Cuánto dura la garantía?')

    expect(await screen.findByText('No tengo información sobre esto')).toBeTruthy()
    expect(screen.getByText(/No se pudo guardar la pregunta/)).toBeTruthy()
  })
})

describe('asistente: validación y errores', () => {
  it('rechaza preguntas demasiado cortas sin llamar al servidor', async () => {
    open()
    await ask('ab')
    expect(await screen.findByText('Escribe al menos 3 caracteres.')).toBeTruthy()
    expect(fake.client.rpc).not.toHaveBeenCalled()
  })

  it('el campo limita la longitud y muestra el contador', async () => {
    open()
    const box = (await screen.findByLabelText('Duda del cliente')) as HTMLTextAreaElement
    expect(box.maxLength).toBe(300)
    await userEvent.setup().type(box, 'hola')
    expect(screen.getByText('4/300')).toBeTruthy()
  })

  it('si falla la búsqueda muestra un error y permite reintentar (sin guardar la pregunta)', async () => {
    fake.state.search = () => fail()
    open()
    const user = await ask('la batería dura poco')
    expect(await screen.findByText('No se pudo consultar la base de conocimiento')).toBeTruthy()
    expect(fake.client.rpc).not.toHaveBeenCalledWith('log_unanswered_question', expect.anything())

    fake.state.search = () => ok([row()])
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'Respuesta' })).toBeTruthy()
  })

  it('si se pregunta dos veces seguidas, solo cuenta la respuesta de la última', async () => {
    let releaseFirst!: () => void
    const calls: string[] = []
    fake.state.search = ({ query_text }) => {
      calls.push(query_text)
      if (calls.length === 1) {
        return new Promise((resolve) => {
          releaseFirst = () => resolve({ data: [row({ article_title: 'Respuesta ANTIGUA' })], error: null })
        })
      }
      return ok([row({ article_title: 'Respuesta NUEVA' })])
    }
    open()
    const user = await ask('primera pregunta')
    const box = screen.getByLabelText('Duda del cliente')
    await user.clear(box)
    await user.type(box, 'segunda pregunta')
    await user.click(screen.getByRole('button', { name: /Preguntar|Buscando/ }))

    expect(await screen.findByRole('link', { name: 'Respuesta NUEVA' })).toBeTruthy()
    releaseFirst() // llega tarde la primera
    await waitFor(() => expect(within(screen.getByRole('article')).getByRole('link').textContent).toBe('Respuesta NUEVA'))
    expect(screen.queryByText('Respuesta ANTIGUA')).toBeNull()
  })
})
