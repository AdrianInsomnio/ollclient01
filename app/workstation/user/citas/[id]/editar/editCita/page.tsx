'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getAppointment, type Appointment } from '@/lib/api/appointments'
import { updateAppointment } from '@/lib/api/appointments'
import { getClients, type Client } from '@/lib/api/clients'
import { getPets, type Pet } from '@/lib/api/pets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, PawPrint, Users, Check, XCircle } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function EditCitaPage() {
  const params = useParams()
  const router = useRouter()
  const citaId = params.id as string

  const {
    data: cita,
    isLoading: citaLoading,
    error: citaError
  } = useQuery({
    queryKey: ['cita', citaId],
    queryFn: () => getAppointment(citaId),
    enabled: !!citaId,
  })

  const {
    data: clients = [],
    isLoading: clientsLoading
  } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients(),
  })

  const {
    data: pets = [],
    isLoading: petsLoading
  } = useQuery({
    queryKey: ['pets'],
    queryFn: () => getPets(),
  })

  // Filter pets by selected client
  const clientPets = (pets as Pet[]).filter(p => p.clientId === Number(clientIdState)) || []

  const [clientIdState, setClientIdState] = useState<string>('')
  const [petIdState, setPetIdState] = useState<string>('')
  const [dateState, setDateState] = useState<string>('')
  const [durationState, setDurationState] = useState<string>('')
  const [serviceTypeState, setServiceTypeState] = useState<string>('')
  const [notesState, setNotesState] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Initialize form with cita data
  useEffect(() => {
    if (cita) {
      setClientIdState(cita.clientId.toString())
      setPetIdState(cita.petId.toString())
      setDateState(cita.date.split('T')[0]) // YYYY-MM-DD for date input
      setDurationState(cita.duration.toString())
      setServiceTypeState(cita.serviceType ?? '')
      setNotesState(cita.notes ?? '')
    }
  }, [cita])

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setClientIdState(e.target.value)
    // Reset pet when client changes
    setPetIdState('')
  }

  const mutation = useMutation({
    mutationFn: (data: any) => updateAppointment(citaId, data),
    onSuccess: () => {
      setSuccess('Cita actualizada exitosamente')
      setTimeout(() => {
        router.push(`/workstation/user/citas/${citaId}`)
      }, 1500)
    },
    onError: (error: any) => {
      setError(error.response?.data?.message ?? error.message ?? 'Error al actualizar cita')
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      mutation.mutate({
        clientId: Number(clientIdState),
        petId: Number(petIdState),
        date: dateState,
        duration: Number(durationState),
        serviceType: serviceTypeState,
        notes: notesState,
      })
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Error al actualizar cita')
      setLoading(false)
    }
  }

  if (citaLoading || clientsLoading || petsLoading) {
    return (
      <div className='flex h-50 items-center justify-center'>
        <p className='text-gray-500'>Cargando datos...</p>
      </div>
    )
  }

  if (citaError) {
    return (
      <div className='p-4 bg-red-50 text-red-600 rounded'>
        Error al cargar cita: {citaError instanceof Error ? citaError.message : 'Error desconocido'}
      </div>
    )
  }

  if (!cita) {
    return (
      <div className='p-4 bg-red-50 text-red-600 rounded'>
        Cita no encontrada
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-gray-900'>Editar Cita</h1>
        <Link href={`/workstation/user/citas/${citaId}`}>
          <Button variant='outline'>? Volver a Citas</Button>
        </Link>
      </div>

      {error && (
        <div className='p-4 bg-red-50 text-red-600 rounded'>
          {error}
        </div>
      )}
      {success && (
        <div className='p-4 bg-green-50 text-green-600 rounded'>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-6'>
        <div className='grid gap-4 md:grid-cols-2'>
          {/* Client selection */}
          <div className='space-y-2'>
            <label htmlFor='clientId' className='text-sm font-medium'>Cliente *</label>
            <select
              id='clientId'
              value={clientIdState}
              onChange={handleClientChange}
              className='select select-bordered w-full'
              required
            >
              <option value=''>Seleccionar cliente</option>
              {clients.map((client: Client) => (
                <option key={client.id} value={client.id.toString()}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pet selection */}
          <div className='space-y-2'>
            <label htmlFor='petId' className='text-sm font-medium'>Mascota *</label>
            <select
              id='petId'
              value={petIdState}
              onChange={(e) => setPetIdState(e.target.value)}
              className='select select-bordered w-full'
              required
            >
              <option value=''>Seleccionar mascota</option>
              {clientPets.map((pet: Pet) => (
                <option key={pet.id} value={pet.id.toString()}>
                  {pet.name} ({pet.species} {pet.breed ?? ''})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2'>
          {/* Date */}
          <div className='space-y-2'>
            <label htmlFor='date' className='text-sm font-medium'>Fecha *</label>
            <input
              id='date'
              type='date'
              value={dateState}
              onChange={(e) => setDateState(e.target.value)}
              className='input input-bordered w-full'
              required
            />
          </div>

          {/* Duration */}
          <div className='space-y-2'>
            <label htmlFor='duration' className='text-sm font-medium'>Duraci�n (min) *</label>
            <input
              id='duration'
              type='number'
              min='15'
              step='15'
              value={durationState}
              onChange={(e) => setDurationState(e.target.value)}
              className='input input-bordered w-full'
              required
            />
          </div>
        </div>

        <div className='space-y-2'>
          <label htmlFor='serviceType' className='text-sm font-medium'>Tipo de servicio</label>
          <input
            id='serviceType'
            type='text'
            value={serviceTypeState}
            onChange={(e) => setServiceTypeState(e.target.value)}
            className='input input-bordered w-full'
            placeholder='Consulta general, vacunaci�n, desparasitaci�n...'
          />
        </div>

        <div className='space-y-2'>
          <label htmlFor='notes' className='text-sm font-medium'>Notas</label>
          <textarea
            id='notes'
            rows={4}
            value={notesState}
            onChange={(e) => setNotesState(e.target.value)}
            className='textarea textarea-bordered w-full'
            placeholder='Observaciones adicionales...'
          />
        </div>

        <div className='flex justify-end pt-4'>
          <Button
            type='button'
            variant='outline'
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button
            type='submit'
            disabled={loading || mutation.isPending}
            className='btn-primary w-full'
          >
            {loading || mutation.isPending ? 'Actualizando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </div>
  )
}
