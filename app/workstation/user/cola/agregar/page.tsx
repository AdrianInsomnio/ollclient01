'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getClients, type Client } from '@/lib/api/clients'
import { getPets, type Pet } from '@/lib/api/pets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, User, PawPrint, Plus } from 'lucide-react'

export default function AgregarColaPage() {
  const router = useRouter()
  const [searchClient, setSearchClient] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null)
  const [loading, setLoading] = useState(false)

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients(),
  })

  const { data: pets } = useQuery({
    queryKey: ['pets', selectedClient?.id],
    queryFn: () => selectedClient ? getPets() : Promise.resolve([]),
    enabled: !!selectedClient,
  })

  const filteredClients = clients?.filter(c => 
    c.name.toLowerCase().includes(searchClient.toLowerCase()) ||
    c.phone.includes(searchClient)
  ) || []

  const clientPets = pets?.filter(p => p.clientId === selectedClient?.id) || []

  const handleOpenConsultation = () => {
    if (selectedClient && selectedPet) {
      router.push('/workstation/user/cola')
    }
  }

  return (
    <div className='space-y-6'>
      <Link href='/workstation/user/cola' className='inline-flex'>
        <Button variant='ghost' size='sm'><ArrowLeft className='h-4 w-4 mr-2' />Volver a Cola</Button>
      </Link>

      <h1 className='text-2xl font-bold'>Agregar a Cola</h1>

      {!selectedClient ? (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'><User className='h-5 w-5' />Seleccionar Cliente</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='relative'>
              <Search className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
              <Input
                placeholder='Buscar cliente...'
                value={searchClient}
                onChange={(e) => setSearchClient(e.target.value)}
                className='pl-9'
              />
            </div>
            <div className='max-h-60 overflow-y-auto space-y-2'>
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className='w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors'
                >
                  <p className='font-medium'>{client.name}</p>
                  <p className='text-sm text-gray-500'>{client.phone}</p>
                </button>
              ))}
            </div>
            <Link href='/workstation/user/clientes/nuevo' className='block'>
              <Button variant='outline' className='w-full mt-4'><Plus className='h-4 w-4 mr-2' />Crear Nuevo Cliente</Button>
            </Link>
          </CardContent>
        </Card>
      ) : !selectedPet ? (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'><PawPrint className='h-5 w-5' />Seleccionar Mascota</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-sm text-gray-500'>Cliente: {selectedClient.name}</p>
            {clientPets.length === 0 ? (
              <div className='text-center py-8'>
                <p className='text-gray-500 mb-4'>No hay mascotas registradas</p>
                <Link href={'/workstation/user/mascotas/nuevo?clientId=' + selectedClient.id}>
                  <Button><Plus className='h-4 w-4 mr-2' />Crear Mascota</Button>
                </Link>
              </div>
            ) : (
              <div className='space-y-2'>
                {clientPets.map((pet) => (
                  <button
                    key={pet.id}
                    onClick={() => setSelectedPet(pet)}
                    className='w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3'
                  >
                    <PawPrint className='h-5 w-5 text-blue-500' />
                    <div>
                      <p className='font-medium'>{pet.name}</p>
                      <p className='text-sm text-gray-500'>{pet.species}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <Button variant='ghost' onClick={() => setSelectedClient(null)}>Cambiar Cliente</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Confirmar Consulta</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='p-4 bg-gray-50 rounded-lg space-y-2'>
              <p><span className='font-medium'>Cliente:</span> {selectedClient.name}</p>
              <p><span className='font-medium'>Mascota:</span> {selectedPet.name} ({selectedPet.species})</p>
            </div>
            <div className='flex gap-4'>
              <Button variant='outline' onClick={() => setSelectedPet(null)} className='flex-1'>Atras</Button>
              <Button onClick={handleOpenConsultation} disabled={loading} className='flex-1'>{loading ? 'Abriendo...' : 'Abrir Consulta'}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

