// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Alert } from './Alert'

afterEach(cleanup)

describe('Alert (accesibilidad)', () => {
  it.each([
    ['danger', 'alert'],
    ['warning', 'alert'],
    ['info', 'status'],
    ['success', 'status'],
  ] as const)('el tono %s se anuncia con role="%s" (los errores interrumpen; lo informativo, no)', (tone, role) => {
    render(<Alert tone={tone}>Mensaje</Alert>)
    expect(screen.getByRole(role).textContent).toContain('Mensaje')
  })

  it('el icono es decorativo (no se lee) y el título forma parte del mensaje', () => {
    const { container } = render(
      <Alert tone="danger" title="Algo falló">
        Detalle
      </Alert>,
    )
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('Algo falló')
    // El icono ✕ no debe formar parte del texto accesible: lo oculta aria-hidden.
    expect(screen.getByRole('alert').querySelector('[aria-hidden="true"]')?.textContent).toBe('✕')
  })
})
