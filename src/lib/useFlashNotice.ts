import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Aviso de una sola vez entre pantallas ("Artículo guardado."), pasado por el estado de la navegación.
 * Se lee al entrar y se borra del historial, para que no reaparezca al recargar la página.
 */
export function useFlashNotice(): string | null {
  const location = useLocation()
  const navigate = useNavigate()
  const [notice] = useState<string | null>(() => {
    const value = (location.state as { notice?: unknown } | null)?.notice
    return typeof value === 'string' ? value : null
  })

  useEffect(() => {
    if (notice) navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null })
    // Solo al montar: el aviso ya está guardado en el estado local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return notice
}
