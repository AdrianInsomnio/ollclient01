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
  token: string
  user: User
}

export async function login(data: LoginPayload): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/login', data)
}

export async function register(data: RegisterPayload): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/register', data)
}