'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import Link from 'next/link'
import { getClients, type Client } from '@/lib/api/clients'
import { getPets, type Pet } from '@/lib/api/pets'
import { getAppointmentsByDate } from '@/lib/api/appointments'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  CalendarDays, 
  Users, 
  PawPrint, 
  DollarSign, 
  Search,
  UserPlus,
  Stethoscope,
  PlusCircle,
  ArrowRight
} from 'lucide-react'

export default function UserHomePage() {
  const [search, setSearch] = useState('')
  const today = new Date().toISOString().split('T')[0]

  const { data: allClients, isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients(),
  })

  const { data: allPets, isLoading: loadingPets } = useQuery({
    queryKey: ['pets'],
    queryFn: () => getPets(),
  })

  const { data: appointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ['appointments', today],
    queryFn: () => getAppointmentsByDate(today),
  })

  const filteredClients = allClients?.filter(client => 
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.phone.includes(search) ||
    client.email.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5) || []

  const recentClients = allClients?.slice(0, 5) || []
  const recentPets = allPets?.slice(0, 5) || []

  const totalClients = allClients?.length || 0
  const totalPets = allPets?.length || 0
  const todayAppointments = appointments?.length || 0
  const scheduledAppointments = appointments?.filter(a => a.status === 'scheduled').length || 0
  const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0

  const getStatusClass = (status: string) => {
    switch(status) {
      case 'scheduled': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-gray-900'>Panel de Trabajo</h1>
        <p className='text-sm text-gray-500'>{new Date().toLocaleDateString('es-UY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Citas Hoy</CardTitle>
            <CalendarDays className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{todayAppointments}</div>
            <p className='text-xs text-muted-foreground'>{scheduledAppointments} pendientes, {completedAppointments} completadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Clientes</CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{totalClients}</div>
            <p className='text-xs text-muted-foreground'>registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Mascotas</CardTitle>
            <PawPrint className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{totalPets}</div>
            <p className='text-xs text-muted-foreground'>registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Ventas del Día</CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'></div>
            <p className='text-xs text-muted-foreground'>pendiente conexión API</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className='text-lg'>Acciones Rápidas</CardTitle></CardHeader>
        <CardContent>
          <div className='grid gap-4 md:grid-cols-4'>
            <Link href='/workstation/user/clientes/nuevo'>
              <Button variant='outline' className='w-full h-20 flex flex-col gap-2'>
                <UserPlus className='h-6 w-6' /><span className='text-sm'>Nuevo Cliente</span>
              </Button>
            </Link>
            <Link href='/workstation/user/mascotas/nueva'>
              <Button variant='outline' className='w-full h-20 flex flex-col gap-2'>
                <PlusCircle className='h-6 w-6' /><span className='text-sm'>Nueva Mascota</span>
              </Button>
            </Link>
            <Link href='/workstation/user/clientes/buscar'>
              <Button variant='outline' className='w-full h-20 flex flex-col gap-2'>
                <Search className='h-6 w-6' /><span className='text-sm'>Buscar Cliente</span>
              </Button>
            </Link>
            <Link href='/workstation/user/cola'>
              <Button variant='outline' className='w-full h-20 flex flex-col gap-2'>
                <Stethoscope className='h-6 w-6' /><span className='text-sm'>Abrir Consulta</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between'>
            <CardTitle className='text-lg'>Buscar Cliente</CardTitle>
            <Link href='/workstation/user/clientes/buscar' className='text-sm text-blue-600 hover:underline flex items-center gap-1'>Ver todos <ArrowRight className='h-4 w-4' /></Link>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='relative'>
              <Search className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
              <Input placeholder='Buscar por nombre, email o teléfono...' value={search} onChange={(e) => setSearch(e.target.value)} className='pl-9' />
            </div>
            {search.length >= 1 && (
              <div className='border rounded-md max-h-60 overflow-y-auto'>
                {loadingClients ? (<p className='p-4 text-sm text-gray-500'>Buscando...</p>) : filteredClients.length === 0 ? (<p className='p-4 text-sm text-gray-500'>No se encontraron clientes</p>) : (
                  <ul className='divide-y'>
                    {filteredClients.map((client: Client) => (
                      <li key={client.id} className='p-3 hover:bg-gray-50 cursor-pointer'><p className='font-medium'>{client.name}</p><p className='text-sm text-gray-500'>{client.phone} - {client.email}</p></li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between'>
            <CardTitle className='text-lg'>Agenda del Día</CardTitle>
            <Link href='/workstation/user/agenda/hoy' className='text-sm text-blue-600 hover:underline flex items-center gap-1'>Ver todos <ArrowRight className='h-4 w-4' /></Link>
          </CardHeader>
          <CardContent>
            {loadingAppointments ? (<p className='text-sm text-gray-500'>Cargando...</p>) : appointments?.length === 0 ? (<p className='text-sm text-gray-500'>No hay citas programadas para hoy</p>) : (
              <ul className='divide-y max-h-60 overflow-y-auto'>
                {appointments?.slice(0, 5).map((apt) => (
                  <li key={apt.id} className='py-3 flex justify-between items-center'>
                    <div><p className='font-medium'>{apt.time}</p><p className='text-sm text-gray-500'>{apt.type}</p></div>
                    <span className={'text-xs px-2 py-1 rounded-full ' + getStatusClass(apt.status)}>{apt.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between'>
            <CardTitle className='text-lg flex items-center gap-2'><Users className='h-5 w-5' />Clientes Recientes</CardTitle>
            <Link href='/workstation/user/clientes/recientes' className='text-sm text-blue-600 hover:underline flex items-center gap-1'>Ver todos <ArrowRight className='h-4 w-4' /></Link>
          </CardHeader>
          <CardContent>
            {loadingClients ? (<p className='text-sm text-gray-500'>Cargando...</p>) : recentClients.length === 0 ? (<p className='text-sm text-gray-500'>No hay clientes registrados</p>) : (
              <ul className='divide-y'>
                {recentClients.map((client: Client) => (
                  <li key={client.id} className='py-3 flex justify-between items-center'><div><p className='font-medium'>{client.name}</p><p className='text-sm text-gray-500'>{client.phone}</p></div><Link href={'/workstation/user/clientes/' + client.id} className='text-sm text-blue-600 hover:underline'>Ver</Link></li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between'>
            <CardTitle className='text-lg flex items-center gap-2'><PawPrint className='h-5 w-5' />Mascotas Recientes</CardTitle>
            <Link href='/workstation/user/mascotas/recientes' className='text-sm text-blue-600 hover:underline flex items-center gap-1'>Ver todos <ArrowRight className='h-4 w-4' /></Link>
          </CardHeader>
          <CardContent>
            {loadingPets ? (<p className='text-sm text-gray-500'>Cargando...</p>) : recentPets.length === 0 ? (<p className='text-sm text-gray-500'>No hay mascotas registradas</p>) : (
              <ul className='divide-y'>
                {recentPets.map((pet: Pet) => (
                  <li key={pet.id} className='py-3 flex justify-between items-center'><div><p className='font-medium'>{pet.name}</p><p className='text-sm text-gray-500'>{pet.species} - {pet.breed}</p></div><Link href={'/workstation/user/mascotas/' + pet.id} className='text-sm text-blue-600 hover:underline'>Ver</Link></li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
