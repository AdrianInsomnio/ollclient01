import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'USER' | 'VET' | 'ADMIN' | 'SUPER_ADMIN'

export interface User {
  id: number
  username: string
  email: string
  role: UserRole
  organizationId: number
}

interface AuthState {
  token: string | null
  user: User | null
  tenantId: string | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      tenantId: null,
      isAuthenticated: false,
      login: (token, user) =>
        set({
          token,
          user,
          tenantId: String(user.organizationId),
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          token: null,
          user: null,
          tenantId: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        tenantId: state.tenantId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)