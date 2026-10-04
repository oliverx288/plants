// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// ---- Supabase simulado: sesión de Lucía + tabla 'articles' ------------------------------------------
const fake = vi.hoisted(() => {
  const state = {
    articles: [] as Record<string, unknown>[],
    failList: 0, // nº de fallos a simular antes de responder bien
    articleQueries: [] as string[],
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
      let wantedId: string | null = null
      const builder = {
        select: (columns: string) => {
          if (table === 'articles') state.articleQueries.push(columns)
          return builder
        },
        order: () => builder,
        eq: (_column: string, value: string) => {
          wantedId = value
          return builder
        },
        maybeSingle: async () => {
          if (table === 'profiles') {
            return { data: { id: 'u-lucia', role: 'agent', display_name: 'Lucía' }, error: null }
          }
          const found = state.articles.find((a) => a.id === wantedId) ?? null
          return { data: found, error: null }
        },
        then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
          const result =
            state.failList > 0
              ? (state.failList--, { data: null, error: { message: 'boom' } })
              : { data: state.articles, error: null }
          return Promise.resolve(result).then(resolve, reject)
        },
      }
      return builder
    }),
  }
  return { state, client }
})

vi.mock('../lib/supabase', () => ({ supabase: fake.client }))

import { AppRoutes } from '../App'
import { AuthProvider } from '../auth/AuthProvider'

const ID_GPS = '10000000-0000-4000-8000-000000000001'
const ID_SOS = '10000000-0000-4000-8000-000000000002'
const ID_HTML = '10000000-0000-4000-8000-000000000003'

const article = (id: string, title: string, category: string, extra: Record<string, unknown> = {}) => ({
  id, title, category, last_reviewed_at: '2026-09-05', article_sections: [], ...extra,
})

function open(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  fake.state.failList = 0
  fake.state.articleQueries = []
  fake.state.articles = [
    article(ID_SOS, 'El botón SOS no llama', 'Botón SOS'),
    article(ID_GPS, 'La ubicación no se actualiza', 'GPS y ubicación', {
      article_sections: [
        { id: 's-b', position: 1, heading: 'Qué comprobar primero', body: '', steps: ['Activa el GPS', 'Revisa la suscripción'] },
        { id: 's-a', position: 0, heading: 'Qué ocurre', body: 'El mapa muestra una hora antigua.', steps: [] },
      ],
    }),
    article(ID_HTML, 'Contenido hostil', 'Primera configuración', {
      article_sections: [
        {
          id: 's-h', position: 0, heading: '<b>Título</b>',
          body: '<img src=x onerror="window.__pwned=true"> texto',
          steps: ['<script>window.__pwned=true</script> paso'],
        },
      ],
    }),
  ]
  vi.clearAllMocks()
})
afterEach(cleanup)

describe('lista de artículos', () => {
  it('agrupa por categoría en orden de recorrido y enlaza cada artículo', async () => {
    open('/articulos')
    expect(await screen.findByRole('heading', { level: 1, name: 'Artículos' })).toBeTruthy()

    const headings = (await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent)
    expect(headings).toEqual(['Primera configuración', 'GPS y ubicación', 'Botón SOS'])

    const link = screen.getByRole('link', { name: 'La ubicación no se actualiza' })
    expect(link.getAttribute('href')).toBe(`/articulos/${ID_GPS}`)
    expect(screen.getAllByText('Revisado el 5 de septiembre de 2026').length).toBe(3)
  })

  it('muestra un error con botón para reintentar', async () => {
    fake.state.failList = 1
    open('/articulos')
    expect(await screen.findByText('No se pudieron cargar los artículos')).toBeTruthy()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('link', { name: 'El botón SOS no llama' })).toBeTruthy()
  })

  it('muestra un aviso si no hay artículos', async () => {
    fake.state.articles = []
    open('/articulos')
    expect(await screen.findByText('Todavía no hay artículos en la base de conocimiento.')).toBeTruthy()
  })
})

describe('detalle de artículo', () => {
  it('muestra título, categoría, fecha y secciones en orden, con los pasos numerados', async () => {
    open(`/articulos/${ID_GPS}`)
    expect(await screen.findByRole('heading', { level: 1, name: 'La ubicación no se actualiza' })).toBeTruthy()
    expect(screen.getByText('Última revisión: 5 de septiembre de 2026')).toBeTruthy()

    const sections = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(sections).toEqual(['Qué ocurre', 'Qué comprobar primero'])

    const steps = within(screen.getByRole('list')).getAllByRole('listitem').map((li) => li.textContent)
    expect(steps).toEqual(['Activa el GPS', 'Revisa la suscripción'])
    expect(document.querySelector('ol')).toBeTruthy()
    // Cada sección tiene ancla para enlazarla desde el asistente.
    expect(document.getElementById('seccion-0')).toBeTruthy()
    expect(document.getElementById('seccion-1')).toBeTruthy()
  })

  it('el contenido con HTML se muestra como TEXTO y nunca se interpreta', async () => {
    open(`/articulos/${ID_HTML}`)
    await screen.findByRole('heading', { level: 1, name: 'Contenido hostil' })

    expect(screen.getByText('<b>Título</b>')).toBeTruthy()
    expect(document.querySelector('article img')).toBeNull()
    expect(document.querySelector('article script')).toBeNull()
    expect(document.querySelector('article b')).toBeNull()
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined()
  })

  it('resalta la sección enlazada con #seccion-N (y solo esa)', async () => {
    open(`/articulos/${ID_GPS}#seccion-1`)
    await screen.findByRole('heading', { level: 1, name: 'La ubicación no se actualiza' })
    expect(document.getElementById('seccion-1')?.hasAttribute('data-targeted')).toBe(true)
    expect(document.getElementById('seccion-0')?.hasAttribute('data-targeted')).toBe(false)
  })

  it('sin ancla no se resalta ninguna sección', async () => {
    open(`/articulos/${ID_GPS}`)
    await screen.findByRole('heading', { level: 1, name: 'La ubicación no se actualiza' })
    expect(document.querySelector('[data-targeted]')).toBeNull()
  })

  it('un id mal formado muestra "no encontrado" sin consultar la base de datos', async () => {
    open("/articulos/1'%20or%201=1--")
    expect(await screen.findByRole('heading', { name: 'Artículo no encontrado' })).toBeTruthy()
    expect(fake.state.articleQueries).toHaveLength(0)
  })

  it('un artículo inexistente (o que RLS no deja ver) muestra "no encontrado"', async () => {
    open('/articulos/99999999-0000-4000-8000-000000000009')
    expect(await screen.findByRole('heading', { name: 'Artículo no encontrado' })).toBeTruthy()
  })

  it('pide el artículo con sus secciones en una sola consulta', async () => {
    open(`/articulos/${ID_GPS}`)
    await screen.findByRole('heading', { level: 1, name: 'La ubicación no se actualiza' })
    expect(fake.state.articleQueries.some((q) => q.includes('article_sections(id, position, heading, body, steps)'))).toBe(true)
  })
})

describe('navegación', () => {
  it('la cabecera enlaza al asistente y a los artículos, y marca la sección actual', async () => {
    open('/articulos')
    const nav = await screen.findByRole('navigation', { name: 'Principal' })
    const articulos = within(nav).getByRole('link', { name: 'Artículos' })
    expect(within(nav).getByRole('link', { name: 'Asistente' })).toBeTruthy()
    expect(articulos.getAttribute('aria-current')).toBe('page')
    expect(within(nav).getByRole('link', { name: 'Asistente' }).getAttribute('aria-current')).toBeNull()
  })
})
