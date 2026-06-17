import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AUTH_VIA_COOKIE } from './auth-config'

export type UserRole = 'USER' | 'VET' | 'ADMIN' | 'SUPER_ADMIN'

export interface User {
  id: number
  username: string
  email: string
  role: UserRole
  organizationId: number
}

interface AuthState {
  /**
   * Token persisted only in legacy mode (Authorization header). In
   * cookie mode (AUTH_VIA_COOKIE=true) this field is null because the
   * JWT lives in the HttpOnly cookie that client-side JS cannot read.
   */
  token: string | null
  user: User | null
  tenantId: string | null
  isAuthenticated: boolean
  checking: boolean
  login: (token: string | null, user: User) => void
  logout: () => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      tenantId: null,
      isAuthenticated: false,
      checking: true,
      login: (token, user) =>
        set({
          // In cookie mode we ignore the token: the client must not
          // store the JWT in localStorage. The HttpOnly cookie is the
          // only source of truth.
          token: AUTH_VIA_COOKIE ? null : token,
          user,
          tenantId: String(user.organizationId),
          isAuthenticated: true,
          checking: false,
        }),
      logout: () =>
        set({
          token: null,
          user: null,
          tenantId: null,
          isAuthenticated: false,
          checking: false,
        }),
      initialize: async () => {
        // If verification is already complete, do nothing
        const state = get()
        if (!state.checking) return

        try {
          // We make a request to a protected endpoint to verify authentication
          // We use the admin dashboard metrics endpoint as a test
          const response = await fetch('/api/admin/dashboard/metrics', {
            credentials: 'include', // Important for sending cookies
          })

          if (response.ok) {
            // The request was successful, so we are authenticated
            // We need to get the user data
            const authResponse = await response.json()
            // We assume the response has the AuthResponse format
            if (authResponse.user) {
              set({
                token: AUTH_VIA_COOKIE ? null : authResponse.token ?? null,
                user: authResponse.user,
                tenantId: String(authResponse.user.organizationId),
                isAuthenticated: true,
                checking: false,
              })
              return
            }
          }

          // If we reach here, we are not authenticated
          set({
            token: null,
            user: null,
            tenantId: null,
            isAuthenticated: false,
            checking: false,
          })
        } catch (error) {
          // In case of error, we assume we are not authenticated
          console.warn('Auth initialization failed:', error)
          set({
            token: null,
            user: null,
            tenantId: null,
            isAuthenticated: false,
            checking: false,
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      // In cookie mode we only persist user + 	enantId + auth flag
      // The token is not persisted (must not be in browser storage).
      // This prevents XSS from stealing the JWT and ensures that a
      // browser reload keeps the user identified while the cookie is valid.
      partialize: (state) => {
        if (AUTH_VIA_COOKIE) {
          return {
            user: state.user,
            tenantId: state.tenantId,
            isAuthenticated: state.isAuthenticated,
          };
        }
        return {
          token: state.token,
          user: state.user,
          tenantId: state.tenantId,
          isAuthenticated: state.isAuthenticated,
        };
      },
    }
  )
)
