'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { getAppointmentsByDate } from '@/lib/api/appointments'
import { getVeterinarianAvailability, setVeterinarianAvailability } from '@/lib/api/consultations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowDown, ArrowUp, CheckCircle2, CircleOff } from 'lucide-react'

export default function VetHomePage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const now = new Date()
  const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0'))
    .join('-')

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', today],
    queryFn: () => getAppointmentsByDate(today),
  })
  const { data: availability = [] } = useQuery({
    queryKey: ['veterinarian-availability'],
    queryFn: getVeterinarianAvailability,
    refetchInterval: 30000,
  })
  const currentVet = availability.find((vet) => vet.id === user?.id)
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [availabilityError, setAvailabilityError] = useState('')

  const availabilityMutation = useMutation({
    mutationFn: (available: boolean) => setVeterinarianAvailability({ available, durationMinutes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['veterinarian-availability'] }),
  })

  const handleAvailabilityToggle = () => {
    const nextAvailable = !currentVet?.available
    if (nextAvailable && (!Number.isInteger(durationMinutes) || durationMinutes < 30 || durationMinutes > 240)) {
      setAvailabilityError('El tiempo debe estar entre 30 y 240 minutos.')
      return
    }
    setAvailabilityError('')
    availabilityMutation.mutate(nextAvailable)
  }

  const todayAppointments = appointments?.filter(
    (a) => a.status === 'pending' || a.status === 'confirmed'
  ) || []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Disponibilidad</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Indica si puedes recibir una nueva atención.</p>
          </div>
          <Badge variant={currentVet?.available ? 'default' : 'secondary'} className={currentVet?.available ? 'bg-emerald-100 text-emerald-700' : ''}>
            {currentVet?.available ? 'Disponible' : 'No disponible'}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Duración de consulta (minutos)</span>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-20 items-center justify-center rounded-md border bg-background font-medium">
                  {durationMinutes}
                </div>
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label="Aumentar duración 15 minutos"
                    onClick={() => setDurationMinutes((value) => Math.min(240, value + 15))}
                    disabled={currentVet?.available || availabilityMutation.isPending || durationMinutes >= 240}
                    className="flex h-5 w-8 items-center justify-center rounded-t border border-b-0 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowUp className="size-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Disminuir duración 15 minutos"
                    onClick={() => setDurationMinutes((value) => Math.max(30, value - 15))}
                    disabled={currentVet?.available || availabilityMutation.isPending || durationMinutes <= 30}
                    className="flex h-5 w-8 items-center justify-center rounded-b border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowDown className="size-3" />
                  </button>
                </div>
              </div>
            </label>
            <Button
            variant={currentVet?.available ? 'outline' : 'default'}
            disabled={availabilityMutation.isPending}
            onClick={handleAvailabilityToggle}
          >
            {currentVet?.available ? <CircleOff className="mr-2 size-4" /> : <CheckCircle2 className="mr-2 size-4" />}
            {currentVet?.available ? 'Marcar como no disponible' : 'Marcarme como disponible'}
          </Button>
          </div>
          {availabilityError && <p className="text-sm text-destructive">{availabilityError}</p>}
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments?.filter((a) => a.status === 'completed').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pacientes del Día</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : todayAppointments.length === 0 ? (
            <p className="text-sm text-gray-500">No hay pacientes programados para hoy</p>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {new Date(apt.date).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })} - {apt.serviceType || 'consulta'}
                    </p>
                    <p className="text-sm text-gray-500">{apt.pet?.name || `Paciente ID: ${apt.petId}`}</p>
                  </div>
                  <Button>Iniciar Consulta</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
