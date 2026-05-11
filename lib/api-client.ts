import { useAuthStore } from './auth-store'

const API_URL = process.env.NEXT_PUBLIC_API_URL

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
}

async function request<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    retries = 1,
    retryDelay = 1000,
    timeout = 30000,
    ...fetchConfig
  } = config

  const authStore = useAuthStore.getState()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(authStore.token && { Authorization: `Bearer ${authStore.token}` }),
    ...(authStore.tenantId && { 'x-tenant-id': authStore.tenantId }),
    ...fetchConfig.headers,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...fetchConfig,
        headers,
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
        throw new ApiError('TIMEOUT', 'La solicitud tardó demasiado', 408)
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
