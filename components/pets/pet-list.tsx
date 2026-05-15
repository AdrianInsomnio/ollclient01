'use client'

import Link from 'next/link'
import { type Pet } from '@/lib/api/pets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, PawPrint } from 'lucide-react'


interface PetListProps {
  pets: Pet[]
  title?: string
  showActions?: boolean
}

export function PetList({ pets, title = 'Mascotas', showActions = true }: PetListProps) {
  if (pets.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
          <p className='text-sm text-gray-500 text-center py-8'>No hay mascotas</p>
          {showActions && (
            <div className='flex justify-center'>
              <Link href='/workstation/user/mascotas/nuevo'>
                <Button><Plus className='h-4 w-4 mr-2' />Crear Mascota</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle>{title}</CardTitle>
        {showActions && (
          <div className='flex gap-2'>
            <Link href='/workstation/user/mascotas/buscar'>
              <Button variant='outline' size='sm'><Search className='h-4 w-4 mr-2' />Buscar</Button>
            </Link>
            <Link href='/workstation/user/mascotas/nuevo'>
              <Button size='sm'><Plus className='h-4 w-4 mr-2' />Nueva</Button>
            </Link>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className='divide-y'>
          {pets.map((pet) => (
            <Link
              key={pet.id}
              href={'/workstation/user/mascotas/' + pet.id}
              className='flex items-center justify-between py-4 hover:bg-gray-50 transition-colors'
            >
              <div className='flex items-center gap-3'>
                <div className='h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center'>
                  <PawPrint className='h-5 w-5 text-blue-600' />
                </div>
                <div>
                  <p className='font-medium text-gray-900'>{pet.name}</p>
                  <p className='text-sm text-gray-500'>{pet.species} {pet.breed ? '- ' + pet.breed : ''}</p>
                </div>
              </div>
              <div className='text-sm text-gray-400'>→</div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
