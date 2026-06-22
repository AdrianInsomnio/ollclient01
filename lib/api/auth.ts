import { post } from '../api-client'
import { User } from '../auth-store'

export interface LoginPayload {
  email: string
  password: string
  organizationId: number
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  role?: string
}

export interface AuthResponse {
  /**
   * En modo cookie (AUTH_VIA_COOKIE=true) el backend NO envia token en
   * el body. El cliente debe asumir que esta autenticado si recibe \user\
   * + 200 OK, y la cookie es manejada por el navegador.
   * En modo header el token viene en este campo y se persiste.
   */
  token?: string
  user: User
}

/**
 * Login contra el backend. En modo cookie el \	oken\ vendra undefined y
 * no debe persistirse (la cookie HttpOnly hace el trabajo).
 */
export async function login(data: LoginPayload): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/login', data)
}

export async function register(data: RegisterPayload): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/register', data)
}

/**
 * Logout: en modo cookie limpia la cookie HttpOnly via el endpoint del
 * backend. En modo legacy es un no-op (el cliente descarta localStorage
 * en su \logout\ del store).
 *
 * Devuelve true si el backend respondio OK, false en caso contrario.
 * El store no debe bloquear el logout local por un fallo de red.
 */
export async function logoutRemote(): Promise<boolean> {
  const AUTH_VIA_COOKIE = process.env.NEXT_PUBLIC_AUTH_VIA_COOKIE === 'true'
  if (!AUTH_VIA_COOKIE) return true
  try {
    await post<{ message: string }>('/auth/logout', {})
    return true
  } catch (_) {
    return false
  }
}
