'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-client'
import { useAuthStore } from '@/lib/auth-store'
import { login } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

const ROLE_ROUTES: Record<string, string> = {
  USER: '/workstation/user',
  VET: '/workstation/vet',
  ADMIN: '/workstation/admin',
  SUPER_ADMIN: '/workstation/superadmin',
}

export default function LoginPage() {
  const router = useRouter()
  const authLogin = useAuthStore((state) => state.login)
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const checking = useAuthStore((state) => state.checking)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('rememberMe')
    if (saved === 'true') setRememberMe(true)
  }, [])

  useEffect(() => {
    if (!checking && isAuthenticated && user) {
      router.replace(ROLE_ROUTES[user.role] || '/workstation/user')
    }
  }, [checking, isAuthenticated, router, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await login({ email, password, rememberMe })
      authLogin(response.token ?? null, response.user)
      toast.success('Inicio de sesión exitoso')
      router.replace(ROLE_ROUTES[response.user.role] || '/workstation/user')
    } catch (err: unknown) {
      console.error('Login error:', err)
      let message = 'Error inesperado'

      if (err instanceof ApiError) {
        switch (err.status) {
          case 400:
            message = 'Datos inválidos. Verifica tu correo y contraseña.'
            break
          case 401:
            message = 'Credenciales incorrectas.'
            break
          case 403:
            message = 'No tienes permiso para acceder.'
            break
          case 500:
            message = 'Error interno del servidor. Intenta más tarde.'
            break
          default:
            message = err.message || 'Error desconocido'
        }
      } else if (err instanceof Error) {
        message = err.message
      }

      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold text-center">Clínica Veterinaria</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="login-email">Correo electrónico</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="tu@clinica.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                aria-describedby="email-help"
              />
              <p id="email-help" className="text-xs text-muted-foreground">
                Ingrese el correo asociado a su cuenta de usuario
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Contraseña</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
                aria-describedby="password-help"
              />
              <p id="password-help" className="text-xs text-muted-foreground">
                Al menos 8 caracteres
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="login-remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => {
                  const nextChecked = checked === true
                  setRememberMe(nextChecked)
                  localStorage.setItem('rememberMe', String(nextChecked))
                }}
                aria-label="Recordar mi sesión en este dispositivo"
              />
              <Label htmlFor="login-remember-me" className="text-sm font-medium">
                Recordar inicio de sesión
              </Label>
            </div>

            <div className="flex justify-between items-center">
              <a
                href="/auth/forgot-password"
                className="text-sm text-muted-foreground hover:underline decoration-2"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <Button type="submit" className="w-full px-6 py-3" disabled={loading}>
              {loading ? (
                <>
                  Ingresando...
                  <span className="ml-2 h-4 w-4 animate-spin border-2 border-solid border-current border-r-transparent rounded-full" />
                </>
              ) : (
                'Ingresar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
