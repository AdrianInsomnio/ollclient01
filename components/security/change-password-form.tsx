'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LockKeyhole, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-client'
import { changePassword } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ChangePasswordForm() {
  const router = useRouter()
  const logout = useAuthStore((state) => state.logout)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      await changePassword({
        currentPassword,
        newPassword,
      })

      toast.success('Contraseña actualizada. Vuelve a iniciar sesión.')
      await logout()
      router.push('/login')
    } catch (error: unknown) {
      let message = 'No se pudo actualizar la contraseña'

      if (error instanceof ApiError) {
        switch (error.status) {
          case 401:
            message = 'La contraseña actual no es correcta'
            break
          case 400:
            message = 'La nueva contraseña no cumple con los requisitos'
            break
          case 403:
            message = 'No tienes permiso para cambiar la contraseña'
            break
          default:
            message = error.message || message
        }
      } else if (error instanceof Error) {
        message = error.message
      }

      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl border border-border/60 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <LockKeyhole className="h-5 w-5 text-muted-foreground" />
          Cambiar contraseña
        </CardTitle>
        <CardDescription>
          Usa tu contraseña actual y define una nueva para esta cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Contraseña actual</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              La sesión actual se cerrará al confirmar el cambio.
            </p>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <RotateCcw className="h-4 w-4 animate-spin" />
                  Actualizando
                </>
              ) : (
                'Actualizar contraseña'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
