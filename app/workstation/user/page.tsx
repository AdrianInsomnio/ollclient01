'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getClients, type Client } from '@/lib/api/clients'
import { getAppointmentsByDate } from '@/lib/api/appointments'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function UserHomePage() {
  const [search, setSearch] = useState('')
  const today = new Date().toISOString().split('T')[0]

  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => getClients(),
    enabled: search.length >= 2,
  })

  const { data: appointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ['appointments', today],
    queryFn: () => getAppointmentsByDate(today),
  })

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments?.filter((a) => a.status === 'scheduled').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search.length >= 2 && (
            <div className="border rounded-md">
              {loadingClients ? (
                <p className="p-4 text-sm text-gray-500">Buscando...</p>
              ) : clients?.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">No se encontraron clientes</p>
              ) : (
                <ul className="divide-y">
                  {clients?.map((client: Client) => (
                    <li key={client.id} className="p-3 hover:bg-gray-50 cursor-pointer">
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-gray-500">{client.phone} • {client.email}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agenda del Día</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAppointments ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : appointments?.length === 0 ? (
            <p className="text-sm text-gray-500">No hay citas programadas para hoy</p>
          ) : (
            <ul className="divide-y">
              {appointments?.map((apt) => (
                <li key={apt.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{apt.time}</p>
                    <p className="text-sm text-gray-500">{apt.type}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    apt.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                    apt.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                    apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {apt.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}