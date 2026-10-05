// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'

// ---- Base de datos simulada en memoria, con el comportamiento de RLS que importa aquí -----------------
const fake = vi.hoisted(() => {
  type Row = Record<string, unknown>
  const state = {
    role: 'editor' as 'editor' | 'agent',
    articles: [] as Row[],
    unanswered: [] as Row[],
    feedback: [] as Row[],
    profiles: [] as Row[],
    saveError: null as null | { code: string },
    saveCalls: [] as unknown[],
    nextId: 100,
  }
  const me = () => ({ id: 'u-me', role: state.role, display_name: state.role === 'editor' ? 'Nuria' : 'Lucía' })
  const session = { user: { id: 'u-me', email: 'x@velia-demo.test' } }

  // Constructor de consultas mínimo: select / update / delete + eq / in / order / limit / maybeSingle.
  function from(table: string) {
    let op: 'select' | 'update' | 'delete' = 'select'
    let patch: Row = {}
    const filters: ((r: Row) => boolean)[] = []
    let single = false

    const rows = (): Row[] =>
      table === 'articles'
        ? state.articles
        : table === 'unanswered_questions'
          ? state.unanswered
          : table === 'answer_feedback'
            ? state.feedback
            : state.profiles

    const run = () => {
      const result = rows().filter((r) => filters.every((f) => f(r)))
      if (table === 'profiles' && single) return { data: me(), error: null } // el perfil propio
      if (op === 'select') return { data: single ? (result[0] ?? null) : result, error: null }
      // RLS: solo el editor modifica o borra; si no, NO hay error: simplemente 0 filas.
      if (state.role !== 'editor') return { data: [], error: null }
      if (op === 'update') {
        result.forEach((r) => Object.assign(r, patch))
        return { data: result.map((r) => ({ id: r.id })), error: null }
      }
      const ids = new Set(result.map((r) => r.id))
      const remaining = rows().filter((r) => !ids.has(r.id))
      rows().splice(0, rows().length, ...remaining)
      return { data: result.map((r) => ({ id: r.id })), error: null }
    }

    const api = {
      select: () => api,
      update: (p: Row) => ((op = 'update'), (patch = p), api),
      delete: () => ((op = 'delete'), api),
      eq: (col: string, v: unknown) => (filters.push((r) => r[col] === v), api),
      in: (col: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[col])), api),
      order: () => api,
      limit: () => api,
      maybeSingle: async () => ((single = true), run()),
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
    }
    return api
  }

  const rpc = vi.fn(async (name: string, params: Record<string, unknown>) => {
    if (name !== 'save_article') throw new Error(`rpc inesperada: ${name}`)
    state.saveCalls.push(params)
    if (state.saveError) return { data: null, error: state.saveError }
    const sections = (params.p_sections as { heading: string; body: string; steps: string[] }[]).map((s, i) => ({
      id: `sec-${state.nextId}-${i}`, position: i, ...s,
    }))
    let id = params.p_id as string | null
    if (id) {
      const art = state.articles.find((a) => a.id === id)!
      Object.assign(art, { title: params.p_title, category: params.p_category, last_reviewed_at: params.p_last_reviewed_at, article_sections: sections })
    } else {
      id = `10000000-0000-4000-8000-0000000000${state.nextId++}`
      state.articles.push({ id, title: params.p_title, category: params.p_category, last_reviewed_at: params.p_last_reviewed_at, article_sections: sections })
    }
    return { data: id, error: null }
  })

  const client = {
    auth: {
      onAuthStateChange: vi.fn((cb: (e: string, s: unknown) => void) => {
        queueMicrotask(() => cb('INITIAL_SESSION', session))
        return { data: { subscription: { unsubscribe: () => {} } } }
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(from),
    rpc,
  }
  return { state, client }
})

vi.mock('../lib/supabase', () => ({ supabase: fake.client }))
// La lectura real de un PDF se prueba en src/pdf; aquí se simula para probar la pantalla y el guardado.
vi.mock('../pdf/importPdf', async (original) => ({ ...(await original<typeof import('../pdf/importPdf')>()), importPdf: vi.fn() }))

import { AppRoutes } from '../App'
import { AuthProvider } from '../auth/AuthProvider'
import { a11yViolations } from '../test/axe'
import { PdfImportError } from '../pdf/extract'
import { importPdf } from '../pdf/importPdf'

const ID_A = '10000000-0000-4000-8000-000000000001'
const article = (id: string, title: string, category: string) => ({
  id, title, category, last_reviewed_at: '2026-09-01',
  article_sections: [
    { id: `${id}-0`, position: 0, heading: 'Qué ocurre', body: 'Explicación', steps: [] },
    { id: `${id}-1`, position: 1, heading: 'Pasos', body: '', steps: ['Primer paso', 'Segundo paso'] },
  ],
})
const ID_BAT = '10000000-0000-4000-8000-000000000002'
const fb = (id: string, text: string, userId: string, helpful: boolean, updatedAt: string, articleId: string | null = ID_A, title = 'La ubicación no se actualiza') => ({
  id, question: text, user_id: userId, helpful, updated_at: updatedAt, article_id: articleId, article_title: title,
})
const question = (id: string, text: string, userId: string, resolved = false, createdAt = '2026-09-20T10:00:00Z') => ({
  id, question: text, user_id: userId, resolved, created_at: createdAt,
})

function open(path: string, state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  fake.state.role = 'editor'
  fake.state.saveError = null
  fake.state.saveCalls = []
  fake.state.nextId = 10
  fake.state.articles = [article(ID_A, 'La ubicación no se actualiza', 'GPS y ubicación'), article('10000000-0000-4000-8000-000000000002', 'La batería dura poco', 'Batería y carga')]
  fake.state.profiles = [
    { id: 'u-lucia', display_name: 'Lucía' },
    { id: 'u-pedro', display_name: 'Pedro' },
  ]
  fake.state.unanswered = [
    question('q1', '¿Es resistente al agua?', 'u-lucia'),
    question('q2', '¿es  RESISTENTE al agua?', 'u-pedro', false, '2026-09-22T09:00:00Z'),
    question('q3', '¿Cuánto dura la garantía?', 'u-lucia'),
    question('q4', '¿Cómo cambio la pulsera?', 'u-lucia', true),
  ]
  fake.state.feedback = [
    fb('f1', '¿La ubicación no se actualiza?', 'u-lucia', false, '2026-09-21T10:00:00Z'),
    fb('f2', '¿la  ubicación no se actualiza?', 'u-pedro', false, '2026-09-23T10:00:00Z'),
    fb('f3', 'la batería dura poco', 'u-lucia', true, '2026-09-22T10:00:00Z', ID_BAT, 'La batería dura poco'),
    fb('f4', 'cómo cancelo', 'u-pedro', false, '2026-09-24T10:00:00Z', null, 'Artículo que se borró'),
  ]
  vi.clearAllMocks()
})
afterEach(cleanup)

describe('el editor crea un artículo', () => {
  it('rellena el formulario y se guarda en una sola llamada con los pasos separados por líneas', async () => {
    open('/articulos/nuevo')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Título'), '  ¿Es resistente al agua?  ')
    await user.type(screen.getByLabelText('Categoría'), 'Uso diario')
    await user.type(screen.getByLabelText('Encabezado de la sección 1'), 'Qué debes saber')
    await user.type(screen.getByLabelText('Pasos de la sección 1 (opcional)'), 'Seca el reloj{Enter}{Enter}No lo sumerjas')
    await user.click(screen.getByRole('button', { name: 'Crear artículo' }))

    // Una sola llamada atómica a la base de datos.
    await waitFor(() => expect(fake.state.saveCalls).toHaveLength(1))
    expect(fake.state.saveCalls[0]).toMatchObject({
      p_id: null,
      p_title: '¿Es resistente al agua?',
      p_category: 'Uso diario',
      p_sections: [{ heading: 'Qué debes saber', body: '', steps: ['Seca el reloj', 'No lo sumerjas'] }],
    })
    // Navega al artículo creado y avisa.
    expect(await screen.findByRole('heading', { level: 1, name: '¿Es resistente al agua?' })).toBeTruthy()
    expect(screen.getByText('Artículo creado.')).toBeTruthy()
  })

  it('valida en el cliente: no llama al servidor y señala los campos', async () => {
    open('/articulos/nuevo')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Crear artículo' }))

    expect(await screen.findByText('Revisa los campos marcados')).toBeTruthy()
    expect(screen.getByText(/El título debe tener entre 5 y 120/)).toBeTruthy()
    expect(screen.getByText(/La categoría debe tener entre 2 y 60/)).toBeTruthy()
    expect(screen.getByText(/El encabezado debe tener/)).toBeTruthy()
    expect(screen.getByText('Escribe un texto o al menos un paso.')).toBeTruthy()
    expect(fake.state.saveCalls).toHaveLength(0)
  })

  it('el HTML escrito en el formulario se guarda y se muestra como texto', async () => {
    open('/articulos/nuevo')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Título'), 'Título con <b>HTML</b>')
    await user.type(screen.getByLabelText('Categoría'), 'Pruebas')
    await user.type(screen.getByLabelText('Encabezado de la sección 1'), 'Sección')
    await user.type(screen.getByLabelText('Texto de la sección 1 (opcional)'), '<img src=x onerror="window.__pwned=true">')
    await user.click(screen.getByRole('button', { name: 'Crear artículo' }))

    expect(await screen.findByText('<img src=x onerror="window.__pwned=true">')).toBeTruthy()
    expect(document.querySelector('article img')).toBeNull()
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined()
  })

  it('si el servidor rechaza el guardado, muestra un mensaje claro (no el error crudo) y conserva lo escrito', async () => {
    fake.state.saveError = { code: '42501' }
    open('/articulos/nuevo')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Título'), 'Título de prueba')
    await user.type(screen.getByLabelText('Categoría'), 'Pruebas')
    await user.type(screen.getByLabelText('Encabezado de la sección 1'), 'Sección')
    await user.type(screen.getByLabelText('Texto de la sección 1 (opcional)'), 'Texto')
    await user.click(screen.getByRole('button', { name: 'Crear artículo' }))

    expect(await screen.findByText('No tienes permiso para guardar artículos.')).toBeTruthy()
    expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe('Título de prueba')
  })

  it('desde una pregunta sin respuesta llega con el título ya sugerido', async () => {
    open('/articulos/nuevo', { title: '¿Cuánto dura la garantía?' })
    expect(((await screen.findByLabelText('Título')) as HTMLInputElement).value).toBe('¿Cuánto dura la garantía?')
  })

  it('sugiere las categorías que ya existen', async () => {
    open('/articulos/nuevo')
    await screen.findByLabelText('Título')
    await waitFor(() => {
      const options = [...document.querySelectorAll('#categorias-existentes option')].map((o) => (o as HTMLOptionElement).value)
      expect(options).toEqual(['Batería y carga', 'GPS y ubicación'])
    })
  })
})

describe('avisos de una sola vez', () => {
  let lastState: unknown = 'sin-leer'
  function Probe() {
    lastState = useLocation().state
    return null
  }

  it('el aviso se muestra y se borra del historial, para que no reaparezca al recargar', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/articulos', state: { notice: 'Cambios guardados.' } }]}>
        <AuthProvider>
          <AppRoutes />
          <Probe />
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText('Cambios guardados.')).toBeTruthy()
    await waitFor(() => expect(lastState).toBeNull())
    // Sigue visible en esta pantalla aunque el estado de la navegación ya esté vacío.
    expect(screen.getByText('Cambios guardados.')).toBeTruthy()
  })
})

describe('el editor edita un artículo', () => {
  it('carga el artículo, permite reordenar, añadir y quitar secciones, y guarda todo junto', async () => {
    open(`/articulos/${ID_A}/editar`)
    const user = userEvent.setup()
    const title = (await screen.findByLabelText('Título')) as HTMLInputElement
    expect(title.value).toBe('La ubicación no se actualiza')
    expect((screen.getByLabelText('Pasos de la sección 2 (opcional)') as HTMLTextAreaElement).value).toBe('Primer paso\nSegundo paso')

    await user.click(screen.getByRole('button', { name: 'Subir la sección 2' }))
    await user.click(screen.getByRole('button', { name: 'Añadir sección' }))
    await user.type(screen.getByLabelText('Encabezado de la sección 3'), 'Si sigue fallando')
    await user.type(screen.getByLabelText('Texto de la sección 3 (opcional)'), 'Abre una incidencia')
    await user.clear(title)
    await user.type(title, 'La ubicación no se actualiza (revisado)')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(fake.state.saveCalls).toHaveLength(1))
    expect(fake.state.saveCalls[0]).toMatchObject({ p_id: ID_A, p_title: 'La ubicación no se actualiza (revisado)' })
    const sections = (fake.state.saveCalls[0] as { p_sections: { heading: string }[] }).p_sections
    expect(sections.map((s) => s.heading)).toEqual(['Pasos', 'Qué ocurre', 'Si sigue fallando'])
    expect(await screen.findByText('Cambios guardados.')).toBeTruthy()
  })

  it('no deja quitar la última sección que queda', async () => {
    open('/articulos/nuevo')
    expect(((await screen.findByRole('button', { name: 'Quitar la sección 1' })) as HTMLButtonElement).disabled).toBe(true)
  })

  it('un id inexistente o mal formado muestra "no encontrado"', async () => {
    open('/articulos/99999999-0000-4000-8000-000000000009/editar')
    expect(await screen.findByRole('heading', { name: 'Artículo no encontrado' })).toBeTruthy()
    cleanup()
    open('/articulos/no-es-un-uuid/editar')
    expect(await screen.findByRole('heading', { name: 'Artículo no encontrado' })).toBeTruthy()
  })
})

describe('el editor borra un artículo (con confirmación)', () => {
  it('pide confirmación, enfoca "Cancelar" y permite arrepentirse', async () => {
    open(`/articulos/${ID_A}/editar`)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Borrar este artículo' }))

    expect(screen.getByText('¿Borrar «La ubicación no se actualiza»?')).toBeTruthy()
    expect(screen.getByText(/Se borrarán también sus 2 secciones/)).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }))

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('button', { name: 'Borrar este artículo' })).toBeTruthy()
    expect(fake.state.articles).toHaveLength(2)
  })

  it('al confirmar, borra, vuelve a la lista y avisa', async () => {
    open(`/articulos/${ID_A}/editar`)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Borrar este artículo' }))
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }))

    expect(await screen.findByText('Artículo borrado.')).toBeTruthy()
    expect(fake.state.articles.map((a) => a.id)).not.toContain(ID_A)
    expect(screen.queryByRole('link', { name: 'La ubicación no se actualiza' })).toBeNull()
  })

  it('si la base de datos no borra nada (0 filas, como haría RLS), NO dice que se borró', async () => {
    open(`/articulos/${ID_A}/editar`)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Borrar este artículo' }))
    fake.state.role = 'agent' // el servidor ya no deja borrar: 0 filas, sin error
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }))

    expect(await screen.findByText(/No se pudo borrar el artículo: ya no existe o no tienes permiso/)).toBeTruthy()
    expect(screen.queryByText('Artículo borrado.')).toBeNull()
    expect(fake.state.articles).toHaveLength(2)
  })
})

describe('preguntas sin respuesta', () => {
  it('agrupa las repetidas (ignorando mayúsculas y espacios) y separa pendientes de resueltas', async () => {
    open('/preguntas')
    expect(await screen.findByRole('button', { name: 'Pendientes (2)' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Resueltas (1)' })).toBeTruthy()

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    // La más repetida va primero, con quién la hizo.
    expect(within(items[0]).getByText('Preguntada 2 veces')).toBeTruthy()
    expect(within(items[0]).getByText(/Lucía, Pedro/)).toBeTruthy()
    expect(within(items[1]).getByText('¿Cuánto dura la garantía?')).toBeTruthy()
  })

  it('marca como resuelto TODO el grupo y lo mueve a "Resueltas"', async () => {
    open('/preguntas')
    const user = userEvent.setup()
    const first = (await screen.findAllByRole('listitem'))[0]
    await user.click(within(first).getByRole('button', { name: 'Marcar como resuelta' }))

    expect(await screen.findByRole('button', { name: 'Pendientes (1)' })).toBeTruthy()
    expect(fake.state.unanswered.filter((q) => q.resolved).map((q) => q.id).sort()).toEqual(['q1', 'q2', 'q4'])
    await user.click(screen.getByRole('button', { name: 'Resueltas (2)' }))
    expect(screen.getByText('Preguntada 2 veces')).toBeTruthy()
  })

  it('si la actualización no toca ninguna fila, avisa en vez de dar el cambio por hecho', async () => {
    open('/preguntas')
    const user = userEvent.setup()
    const first = (await screen.findAllByRole('listitem'))[0]
    fake.state.role = 'agent' // RLS: 0 filas, sin error
    await user.click(within(first).getByRole('button', { name: 'Marcar como resuelta' }))

    expect(await screen.findByText(/No se pudo actualizar la pregunta: ya no existe o no tienes permiso/)).toBeTruthy()
    expect(fake.state.unanswered.find((q) => q.id === 'q1')?.resolved).toBe(false)
  })

  it('permite crear un artículo a partir de una pregunta (título sugerido)', async () => {
    open('/preguntas')
    const user = userEvent.setup()
    const item = (await screen.findAllByRole('listitem'))[1]
    await user.click(within(item).getByRole('link', { name: 'Crear un artículo con esta duda' }))
    expect(((await screen.findByLabelText('Título')) as HTMLInputElement).value).toBe('¿Cuánto dura la garantía?')
  })

  it('el texto de la pregunta se muestra como texto aunque contenga HTML', async () => {
    fake.state.unanswered = [question('q9', '<img src=x onerror="window.__pwned=true">', 'u-lucia')]
    open('/preguntas')
    expect(await screen.findByText('<img src=x onerror="window.__pwned=true">')).toBeTruthy()
    expect(document.querySelector('main img')).toBeNull()
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined()
  })

  it('muestra un mensaje cuando no hay pendientes', async () => {
    fake.state.unanswered = []
    open('/preguntas')
    expect(await screen.findByText('No hay preguntas pendientes. ¡Buen trabajo!')).toBeTruthy()
  })
})

describe('el agente NO ve ni puede abrir las pantallas del editor (la seguridad real es RLS)', () => {
  beforeEach(() => {
    fake.state.role = 'agent'
  })

  it('no ve los botones "Nuevo artículo", "Editar artículo" ni el enlace a preguntas', async () => {
    open('/articulos')
    expect(await screen.findByRole('link', { name: 'La batería dura poco' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Nuevo artículo' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Preguntas sin respuesta' })).toBeNull()
    cleanup()

    open(`/articulos/${ID_A}`)
    expect(await screen.findByRole('heading', { level: 1, name: 'La ubicación no se actualiza' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Editar artículo' })).toBeNull()
  })

  it.each(['/articulos/nuevo', `/articulos/${ID_A}/editar`, '/preguntas'])(
    'al entrar a mano en %s ve "No tienes permiso" y no se carga nada',
    async (path) => {
      open(path)
      expect(await screen.findByText('No tienes permiso para ver esta página')).toBeTruthy()
      expect(screen.queryByLabelText('Título')).toBeNull()
      expect(screen.queryByRole('button', { name: /Pendientes/ })).toBeNull()
      expect(fake.client.rpc).not.toHaveBeenCalled()
    },
  )

  it('el editor sí ve todos esos controles', async () => {
    fake.state.role = 'editor'
    open('/articulos')
    expect(await screen.findByRole('link', { name: 'Nuevo artículo' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Preguntas sin respuesta' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Valoraciones' })).toBeTruthy()
  })
})

describe('accesibilidad (axe-core)', () => {
  it('formulario de nuevo artículo, también con errores de validación', async () => {
    open('/articulos/nuevo')
    const user = userEvent.setup()
    await screen.findByLabelText('Título')
    expect(await a11yViolations()).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Crear artículo' }))
    await screen.findByText('Revisa los campos marcados')
    expect(await a11yViolations()).toEqual([])
  })

  it('edición con la confirmación de borrado abierta', async () => {
    open(`/articulos/${ID_A}/editar`)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Borrar este artículo' }))
    expect(await a11yViolations()).toEqual([])
  })

  it('preguntas sin respuesta', async () => {
    open('/preguntas')
    await screen.findByRole('button', { name: /Pendientes/ })
    expect(await a11yViolations()).toEqual([])
  })
})

describe('valoraciones de las respuestas (editor)', () => {
  it('muestra el resumen y las "no me sirvió" agrupadas, con acceso directo al artículo', async () => {
    open('/valoraciones')
    expect(await screen.findByText('25 % de respuestas útiles')).toBeTruthy()
    expect(screen.getByText(/4 valoraciones: 1 positivas y 3 negativas/)).toBeTruthy()
    expect(screen.getByText('Con pocas valoraciones el porcentaje es orientativo.')).toBeTruthy()

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2) // las dos de la ubicación se agrupan; la del artículo borrado va aparte
    expect(within(items[0]).getByText('2 valoraciones')).toBeTruthy()
    expect(within(items[0]).getByText(/Lucía, Pedro/)).toBeTruthy()
    expect(within(items[0]).getByRole('link', { name: 'La ubicación no se actualiza' }).getAttribute('href')).toBe(`/articulos/${ID_A}`)
    expect(within(items[0]).getByRole('link', { name: 'Revisar este artículo' }).getAttribute('href')).toBe(`/articulos/${ID_A}/editar`)
  })

  it('un artículo que se borró se indica y no ofrece enlaces rotos', async () => {
    open('/valoraciones')
    const item = (await screen.findAllByRole('listitem'))[1]
    expect(within(item).getByText(/Artículo que se borró \(artículo borrado\)/)).toBeTruthy()
    expect(within(item).queryByRole('link')).toBeNull()
  })

  it('permite ver las positivas', async () => {
    open('/valoraciones')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Me sirvió (1)' }))
    expect(screen.getByText('la batería dura poco')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Revisar este artículo' })).toBeNull()
  })

  it('mensajes cuando no hay valoraciones o ninguna negativa', async () => {
    fake.state.feedback = []
    open('/valoraciones')
    expect(await screen.findByText(/Todavía no hay valoraciones/)).toBeTruthy()
    cleanup()
    fake.state.feedback = [fb('f9', 'una pregunta', 'u-lucia', true, '2026-09-20T10:00:00Z')]
    open('/valoraciones')
    expect(await screen.findByText('No hay valoraciones negativas. ¡Buen trabajo!')).toBeTruthy()
  })

  it('el texto de la pregunta se muestra como texto aunque contenga HTML', async () => {
    fake.state.feedback = [fb('f9', '<img src=x onerror="window.__pwned=true">', 'u-lucia', false, '2026-09-20T10:00:00Z')]
    open('/valoraciones')
    expect(await screen.findByText('<img src=x onerror="window.__pwned=true">')).toBeTruthy()
    expect(document.querySelector('main img')).toBeNull()
  })

  it('el agente no ve el enlace ni puede abrir la pantalla', async () => {
    fake.state.role = 'agent'
    open('/valoraciones')
    expect(await screen.findByText('No tienes permiso para ver esta página')).toBeTruthy()
    expect(screen.queryByText(/respuestas útiles/)).toBeNull()
    expect(screen.queryByRole('link', { name: 'Valoraciones' })).toBeNull()
  })

  it('accesibilidad (axe-core)', async () => {
    open('/valoraciones')
    await screen.findByText('25 % de respuestas útiles')
    expect(await a11yViolations()).toEqual([])
  })
})

describe('el editor importa un PDF', () => {
  const imported = {
    title: 'El reloj no carga',
    sections: [
      { heading: 'Qué ocurre', body: 'No aparece el icono de carga.', steps: [] },
      { heading: 'Qué comprobar', body: '', steps: ['Usa el cable original.', 'Limpia los contactos.'] },
    ],
    warnings: ['No se han detectado encabezados: todo el texto está en una sola sección. Divídela como prefieras.'],
  }
  const pdf = (name = 'manual.pdf') => new File(['%PDF-1.4'], name, { type: 'application/pdf' })

  it('el botón «Importar PDF» está en la lista de artículos solo para el editor', async () => {
    open('/articulos')
    expect(await screen.findByRole('link', { name: 'Importar PDF' })).toBeTruthy()
    cleanup()
    fake.state.role = 'agent'
    open('/articulos')
    await screen.findByRole('heading', { name: 'Artículos' })
    expect(screen.queryByRole('link', { name: 'Importar PDF' })).toBeNull()
  })

  it('una agente que llega a la ruta a mano no ve la pantalla de importar (y la base de datos la rechazaría igual)', async () => {
    fake.state.role = 'agent'
    open('/articulos/importar')
    expect(await screen.findByText('No tienes permiso para ver esta página')).toBeTruthy()
    expect(screen.queryByLabelText('Archivo PDF')).toBeNull()
  })

  it('sube el PDF → aparece un BORRADOR con título, secciones y pasos, y NO se guarda nada todavía', async () => {
    vi.mocked(importPdf).mockResolvedValue(imported)
    open('/articulos/importar')
    const user = userEvent.setup()
    await user.upload(await screen.findByLabelText('Archivo PDF'), pdf())

    expect(await screen.findByRole('heading', { name: 'Borrador de «manual.pdf»' })).toBeTruthy()
    expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe('El reloj no carga')
    expect((screen.getByLabelText('Encabezado de la sección 2') as HTMLInputElement).value).toBe('Qué comprobar')
    expect((screen.getByLabelText('Pasos de la sección 2 (opcional)') as HTMLTextAreaElement).value).toBe('Usa el cable original.\nLimpia los contactos.')
    // Los avisos de la extracción se muestran a la editora.
    expect(screen.getByText(/No se han detectado encabezados/)).toBeTruthy()
    expect(fake.state.saveCalls).toHaveLength(0)
  })

  it('la categoría es obligatoria: sin elegirla no se puede crear', async () => {
    vi.mocked(importPdf).mockResolvedValue(imported)
    open('/articulos/importar')
    const user = userEvent.setup()
    await user.upload(await screen.findByLabelText('Archivo PDF'), pdf())
    await user.click(await screen.findByRole('button', { name: 'Crear artículo' }))

    expect(await screen.findByText(/La categoría debe tener entre/)).toBeTruthy()
    expect(fake.state.saveCalls).toHaveLength(0)
  })

  it('la editora corrige el borrador y lo crea: una sola llamada a save_article con lo que ve en pantalla', async () => {
    vi.mocked(importPdf).mockResolvedValue(imported)
    open('/articulos/importar')
    const user = userEvent.setup()
    await user.upload(await screen.findByLabelText('Archivo PDF'), pdf())
    const title = await screen.findByLabelText('Título')
    await user.clear(title)
    await user.type(title, 'El reloj no carga bien')
    await user.type(screen.getByLabelText('Categoría'), 'Batería y carga')
    await user.click(screen.getByRole('button', { name: 'Crear artículo' }))

    await waitFor(() => expect(fake.state.saveCalls).toHaveLength(1))
    expect(fake.state.saveCalls[0]).toMatchObject({
      p_id: null,
      p_title: 'El reloj no carga bien',
      p_category: 'Batería y carga',
      p_sections: [
        { heading: 'Qué ocurre', body: 'No aparece el icono de carga.', steps: [] },
        { heading: 'Qué comprobar', body: '', steps: ['Usa el cable original.', 'Limpia los contactos.'] },
      ],
    })
    // Va al artículo nuevo con el aviso de creación.
    expect(await screen.findByText('Artículo creado a partir del PDF.')).toBeTruthy()
  })

  it('un PDF que no se puede leer muestra el motivo y no deja un borrador a medias', async () => {
    vi.mocked(importPdf).mockRejectedValue(new PdfImportError('El PDF no contiene texto seleccionable (parece un documento escaneado).'))
    open('/articulos/importar')
    const user = userEvent.setup()
    await user.upload(await screen.findByLabelText('Archivo PDF'), pdf('escaneado.pdf'))

    expect(await screen.findByText('No se pudo importar el PDF')).toBeTruthy()
    expect(screen.getByText(/parece un documento escaneado/)).toBeTruthy()
    expect(screen.queryByLabelText('Título')).toBeNull()
  })

  it('un error inesperado nunca enseña detalles internos', async () => {
    vi.mocked(importPdf).mockRejectedValue(new Error('TypeError: x is not a function at pdf.worker.mjs:123'))
    open('/articulos/importar')
    const user = userEvent.setup()
    await user.upload(await screen.findByLabelText('Archivo PDF'), pdf())

    expect(await screen.findByText('No se pudo leer el PDF. Inténtalo de nuevo.')).toBeTruthy()
    expect(screen.queryByText(/pdf\.worker|TypeError/)).toBeNull()
  })

  it('«Descartar borrador» vuelve al principio sin guardar nada; un segundo PDF sustituye al primero', async () => {
    vi.mocked(importPdf).mockResolvedValueOnce(imported).mockResolvedValueOnce({ ...imported, title: 'Otro artículo distinto' })
    open('/articulos/importar')
    const user = userEvent.setup()
    await user.upload(await screen.findByLabelText('Archivo PDF'), pdf('uno.pdf'))
    await screen.findByRole('heading', { name: 'Borrador de «uno.pdf»' })
    await user.upload(screen.getByLabelText('Archivo PDF'), pdf('dos.pdf'))
    await screen.findByRole('heading', { name: 'Borrador de «dos.pdf»' })
    expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe('Otro artículo distinto')

    await user.click(screen.getByRole('button', { name: 'Descartar borrador' }))
    expect(screen.queryByLabelText('Título')).toBeNull()
    expect(fake.state.saveCalls).toHaveLength(0)
  })

  it('accesibilidad: sin violaciones en la pantalla vacía y con un borrador', async () => {
    vi.mocked(importPdf).mockResolvedValue(imported)
    const { container } = open('/articulos/importar')
    const user = userEvent.setup()
    await screen.findByLabelText('Archivo PDF')
    expect(await a11yViolations(container)).toEqual([])
    await user.upload(screen.getByLabelText('Archivo PDF'), pdf())
    await screen.findByRole('heading', { name: 'Borrador de «manual.pdf»' })
    expect(await a11yViolations(container)).toEqual([])
  })
})
