'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/lib/api-client'

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string; code?: string }

/**
 * Hook generico para cargar datos remotos con manejo consistente de
 * loading / ready / error. Centraliza el mapeo de ApiError -> mensaje
 * amigable para no repetir el switch en cada pagina.
 *
 * Uso:
 *   const { state, reload } = useApiLoader(() => getAdminClinics())
 */
export function useApiLoader<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' })

  const reload = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const data = await loader()
      setState({ status: 'ready', data })
    } catch (error) {
      if (error instanceof ApiError) {
        setState({
          status: 'error',
          message:
            error.status === 403
              ? 'No tiene permisos para ver este recurso.'
              : error.status === 401
                ? 'Sesion expirada. Inicie sesion nuevamente.'
                : error.message || 'No se pudieron cargar los datos.',
          code: error.code,
        })
      } else {
        setState({
          status: 'error',
          message: 'Error inesperado al cargar los datos.',
        })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    reload()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload])

  return { state, reload }
}

export function friendlyError(status: number, fallback?: string): string {
  if (status === 401) return 'Sesion expirada. Inicie sesion nuevamente.'
  if (status === 403) return 'No tiene permisos para realizar esta accion.'
  if (status === 404) return 'Recurso no encontrado.'
  if (status >= 500) return 'Error del servidor. Intente nuevamente.'
  return fallback || 'Error desconocido.'
}
