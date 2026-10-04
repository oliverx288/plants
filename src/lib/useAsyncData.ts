import { useCallback, useEffect, useState } from 'react'

export type AsyncState<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T }

interface Result<T> {
  load: () => Promise<T>
  attempt: number
  outcome: { ok: true; data: T } | { ok: false }
}

/**
 * Carga datos asíncronos. `load` debe ser estable (función de módulo o useCallback):
 * cuando cambia, se vuelve a cargar y mientras tanto el estado es "loading" (nunca datos de la carga anterior).
 */
export function useAsyncData<T>(load: () => Promise<T>) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result<T> | null>(null)

  useEffect(() => {
    let active = true
    load().then(
      (data) => active && setResult({ load, attempt, outcome: { ok: true, data } }),
      () => active && setResult({ load, attempt, outcome: { ok: false } }),
    )
    return () => {
      active = false
    }
  }, [load, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])

  let state: AsyncState<T> = { status: 'loading' }
  if (result && result.load === load && result.attempt === attempt) {
    state = result.outcome.ok ? { status: 'ready', data: result.outcome.data } : { status: 'error' }
  }
  return { state, reload }
}
