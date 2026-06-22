'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getPets } from '@/lib/api/pets'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Plus, PawPrint } from 'lucide-react'

export default function PetSearchPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const { data: allPets, isLoading } = useQuery({
    queryKey: ['pets'],
    queryFn: () => getPets(),
  })

  const filteredPets = allPets?.filter(pet => {
    const term = searchTerm.toLowerCase()
    return (
      pet.name.toLowerCase().includes(term) ||
      pet.species.toLowerCase().includes(term) ||
      (pet.breed && pet.breed.toLowerCase().includes(term))
    )
  }) || []

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Buscar Mascota</h1>
        <Link href='/workstation/user/mascotas/nuevo'>
          <Button><Plus className='h-4 w-4 mr-2' />Nueva Mascota</Button>
        </Link>
      </div>

      <Card>
        <CardContent className='pt-6'>
          <div className='relative'>
            <Search className='absolute left-3 top-3 h-5 w-5 text-gray-400' />
            <Input
              placeholder='Buscar por nombre, especie o raza...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-10 h-12 text-lg'
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className='text-center text-gray-500 py-8'>Buscando...</p>
      ) : searchTerm.length === 0 ? (
        <p className='text-center text-gray-500 py-8'>Ingrese un termino de busqueda</p>
      ) : filteredPets.length === 0 ? (
        <Card>
          <CardContent className='text-center py-12'>
            <p className='text-gray-500 mb-4'>No se encontraron mascotas</p>
            <Link href='/workstation/user/mascotas/nuevo'>
              <Button variant='outline' className='mt-4'><Plus className='h-4 w-4 mr-2' />Crear Mascota</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-2'>
          <p className='text-sm text-gray-500'>{filteredPets.length} resultado{filteredPets.length !== 1 ? 's' : ''}</p>
          <Card>
            <CardContent className='p-0'>
              <div className='divide-y'>
                {filteredPets.map((pet) => (
                  <Link
                    key={pet.id}
                    href={'/workstation/user/mascotas/' + pet.id}
                    className='flex items-center justify-between p-4 hover:bg-gray-50 transition-colors'
                  >
                    <div className='flex items-center gap-4'>
                      <div className='h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center'>
                        <PawPrint className='h-5 w-5 text-blue-600' />
                      </div>
                      <div>
                        <p className='font-medium text-gray-900'>{pet.name}</p>
                        <p className='text-sm text-gray-500'>{pet.species} {pet.breed ? '- ' + pet.breed : ''}</p>
                      </div>
                    </div>
                    <span className='text-gray-400'>?</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
