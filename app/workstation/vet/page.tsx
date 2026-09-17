'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/auth-store'
import { getAppointmentsByDate } from '@/lib/api/appointments'
import { getVeterinarianAvailability, setVeterinarianAvailability } from '@/lib/api/consultations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, CircleOff } from 'lucide-react'

export default function VetHomePage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const today = new Date().toISOString().split('T')[0]

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', today],
    queryFn: () => getAppointmentsByDate(today),
  })
  const { data: availability = [] } = useQuery({
    queryKey: ['veterinarian-availability'],
    queryFn: getVeterinarianAvailability,
  })
  const currentVet = availability.find((vet) => vet.id === user?.id)
  const availabilityMutation = useMutation({
    mutationFn: setVeterinarianAvailability,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['veterinarian-availability'] }),
  })

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
          <Button
            variant={currentVet?.available ? 'outline' : 'default'}
            disabled={availabilityMutation.isPending}
            onClick={() => availabilityMutation.mutate(!currentVet?.available)}
          >
            {currentVet?.available ? <CircleOff className="mr-2 size-4" /> : <CheckCircle2 className="mr-2 size-4" />}
            {currentVet?.available ? 'Marcar como no disponible' : 'Marcarme como disponible'}
          </Button>
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
