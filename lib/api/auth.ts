import { get, post } from '../api-client'
import type { User } from '../auth-store'

export interface LoginPayload {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
  role?: User['role']
  clinicIds: number[]
}

export interface AuthResponse {
  /**
   * En modo cookie (AUTH_VIA_COOKIE=true) el backend no envia token en
   * el body. El cliente debe asumir que esta autenticado si recibe user
   * + 200 OK, y la cookie es manejada por el navegador.
   * En modo header el token viene en este campo y se persiste.
   */
  token?: string
  user: User
}

/**
 * Login contra el backend. En modo cookie el token vendra undefined y no
 * debe persistirse.
 */
export async function login(data: LoginPayload): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/login', data)
}

export async function register(data: RegisterPayload): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/register', data)
}

export async function getProfile(): Promise<{ user: User }> {
  return get<{ user: User }>('/users/profile')
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export async function changePassword(data: ChangePasswordPayload): Promise<{ message: string }> {
  return post<{ message: string }>('/auth/change-password', data)
}

/**
 * Logout: en modo cookie limpia la cookie HttpOnly via el endpoint del
 * backend. En modo legacy es un no-op.
 */
export async function logoutRemote(): Promise<boolean> {
  const authViaCookie = process.env.NEXT_PUBLIC_AUTH_VIA_COOKIE === 'true'
  if (!authViaCookie) return true
  try {
    await post<{ message: string }>('/auth/logout', {})
    return true
  } catch {
    return false
  }
}
