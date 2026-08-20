import { create, type StateCreator } from "zustand"
import { persist } from "zustand/middleware"
import { getProfile, logoutRemote } from "./api/auth"

export type UserRole = "USER" | "VET" | "ADMIN" | "SUPER_ADMIN"

export interface User {
  id: number
  username: string
  email: string
  role: UserRole
  organizationId: number
  clinics?: Array<{ id: number; name: string }>
}

interface AuthState {
  token: string | null
  user: User | null
  tenantId: string | null
  isAuthenticated: boolean
  checking: boolean
  hydrated: boolean
  login: (token: string | null, user: User) => void
  logout: () => void
  initialize: () => Promise<void>
  markHydrated: () => void
}

const AUTH_VIA_COOKIE = process.env.NEXT_PUBLIC_AUTH_VIA_COOKIE === "true"

const normalizeToken = (token: string | null | undefined) => {
  const value = token?.trim().replace(/^Bearer\s+/i, "")
  return value || null
}

const baseStore: StateCreator<AuthState> = (set, get) => ({
  token: null,
  user: null,
  tenantId: null,
  isAuthenticated: false,
  checking: true,
  hydrated: AUTH_VIA_COOKIE,
  login: (token: string | null, user: User) => {
    const tenantId = user.clinics?.[0]?.id ?? user.organizationId
    set({ token: normalizeToken(token), user, tenantId: String(tenantId), isAuthenticated: true, checking: false, hydrated: true })
  },
  logout: async () => {
    if (AUTH_VIA_COOKIE) {
      try {
        await logoutRemote()
      } catch {
        // ignore error, still clear local state
      }
    }
    set({
      token: null,
      user: null,
      tenantId: null,
      isAuthenticated: false,
      checking: false,
    })
  },
  initialize: async () => {
    const state = get()
    // En modo header, esperar a que Zustand Persist hidrate el token
    // Llamar a /users/profile sin token puede causar race condition
    // y limpiar una sesion valida que se esta restaurando o que acaba de loguearse.
    if (!AUTH_VIA_COOKIE && !state.hydrated) {
      // Hidratación no completada: no hacer nada, markHydrated llamará a initialize de nuevo
      return
    }
    if (!AUTH_VIA_COOKIE && !state.token) {
      set({ checking: false })
      return
    }
    set({ checking: true })

    try {
      const authResponse = await getProfile()
      const tenantId = authResponse.user.clinics?.[0]?.id ?? authResponse.user.organizationId
      set({
        token: state.token,
        user: authResponse.user,
        tenantId: String(tenantId),
        isAuthenticated: true,
        checking: false,
      })
    } catch (error) {
      console.warn("Auth initialization failed:", error)
      const current = get()
      // Solo limpiar sesion si el error es 401 (no autorizado)
      // No limpiar en errores de red u otros errores
      const isUnauthorized = error instanceof Error && "status" in error && error.status === 401
      if (!AUTH_VIA_COOKIE && current.token !== state.token) {
        return
      }
      if (isUnauthorized) {
        set({
          token: null,
          user: null,
          tenantId: null,
          isAuthenticated: false,
          checking: false,
        })
      } else {
        // Error de red u otro: mantener el token y usuario, solo marcar checking como false
        set({ checking: false })
      }
    }
  },
  markHydrated: () => {
    set({ hydrated: true })
    const state = get()
    if (AUTH_VIA_COOKIE || state.token) {
      void get().initialize()
    } else {
      set({ checking: false })
    }
  },
})

export const useAuthStore = AUTH_VIA_COOKIE
  ? create<AuthState>()(baseStore)
  : create<AuthState>()(
      persist(baseStore, {
        name: "auth-storage",
        partialize: (state) => ({
          token: state.token,
          user: state.user,
          tenantId: state.tenantId,
          isAuthenticated: state.isAuthenticated,
        }),
        onRehydrateStorage: () => (state) => {
          state?.markHydrated()
        },
      })
    )
