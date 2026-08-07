import { useAuthStore } from './auth-store'
import { AUTH_VIA_COOKIE } from './auth-config'

const API_URL = process.env.NEXT_PUBLIC_API_URL

type PersistedAuth = {
  state?: {
    token?: string | null
    tenantId?: string | null
  }
}

function getAuthSnapshot() {
  const memory = useAuthStore.getState()
  if (memory.token || typeof window === 'undefined') return memory

  try {
    const raw = window.localStorage.getItem('auth-storage')
    const persisted = raw ? (JSON.parse(raw) as PersistedAuth) : null
    const token = persisted?.state?.token?.replace(/^Bearer\s+/i, '').trim() || null
    const tenantId = persisted?.state?.tenantId ?? null
    if (token || tenantId) return { ...memory, token, tenantId }
  } catch {
    // Ignore malformed or unavailable storage; the request will fail normally.
  }

  return memory
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestConfig extends RequestInit {
  retries?: number
  retryDelay?: number
  timeout?: number
  idempotencyKey?: string
}

async function request<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    retries = 1,
    retryDelay = 1000,
    timeout = 30000,
    idempotencyKey,
    ...fetchConfig
  } = config

  const authStore = useAuthStore.getState()

  // En modo cookie NO enviamos Authorization: el token viaja en la cookie
  // HttpOnly que el navegador incluye automaticamente. credentials: 'include'
  // es obligatorio en fetch cross-origin para que el cookie viaje.
  // En modo header seguimos mandando Bearer como antes.
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(authStore.token && { Authorization: `Bearer ${authStore.token}` }),
    ...(authStore.tenantId && { 'x-tenant-id': authStore.tenantId }),
    ...(idempotencyKey && { 'Idempotency-Key': idempotencyKey }),
    ...fetchConfig.headers,
  }

  const fetchInit: RequestInit = {
    ...fetchConfig,
    headers,
    // credentials: 'include' en same-origin es un no-op, en cross-origin
    // es necesario para que el navegador envie/reciba cookies. Lo seteamos
    // siempre que el flag este activo para no depender del entorno.
    ...(AUTH_VIA_COOKIE ? { credentials: 'include' as RequestCredentials } : {}),
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
        console.log('API request URL:', API_URL + endpoint);
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...fetchInit,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.code || 'UNKNOWN_ERROR',
          errorData.message || response.statusText,
          response.status
        )
      }

      if (response.status === 204) {
        return undefined as T
      }

      return await response.json()
    } catch (error) {
      lastError = error as Error

      if (error instanceof ApiError) {
        if (error.status === 401) {
          useAuthStore.getState().logout()
          throw error
        }
        if (error.status === 500 || error.status >= 503) {
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, retryDelay * Math.pow(2, attempt)))
            continue
          }
        }
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('TIMEOUT', 'La solicitud tard?? demasiado', 408)
      }

      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelay * Math.pow(2, attempt)))
      } else {
        clearTimeout(timeoutId)
        throw new ApiError('NETWORK_ERROR', lastError?.message || 'Error de red', 0)
      }
    }
  }

  clearTimeout(timeoutId)
  throw new ApiError('UNKNOWN_ERROR', lastError?.message || 'Error inesperado', 0)
}

export async function get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
  return request<T>(endpoint, { ...config, method: 'GET' })
}

export async function post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return request<T>(endpoint, {
    ...config,
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return request<T>(endpoint, {
    ...config,
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function del<T>(endpoint: string, config?: RequestConfig): Promise<T> {
  return request<T>(endpoint, { ...config, method: 'DELETE' })
}


