'use client'

import { useQuery } from '@tanstack/react-query'
import { getPets } from '@/lib/api/pets'
import { PetList } from '@/components/pets/pet-list'
import { Button } from '@/components/ui/button'
import { Plus, Search } from 'lucide-react'
import Link from 'next/link'

export default function MascotasPage() {
  const { data: pets, isLoading } = useQuery({
    queryKey: ['pets'],
    queryFn: () => getPets(),
  })

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold'>Mascotas</h1>
        </div>
        <p className='text-center text-gray-500 py-8'>Cargando...</p>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Mascotas</h1>
        <div className='flex gap-2'>
          <Link href='/workstation/user/mascotas/buscar'>
            <Button variant='outline'><Search className='h-4 w-4 mr-2' />Buscar</Button>
          </Link>
          <Link href='/workstation/user/mascotas/nuevo'>
            <Button><Plus className='h-4 w-4 mr-2' />Nueva Mascota</Button>
          </Link>
        </div>
      </div>

      <PetList pets={pets || []} showActions={false} />
    </div>
  )
}
