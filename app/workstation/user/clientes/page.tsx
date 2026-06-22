'use client'

import { useQuery } from '@tanstack/react-query'
import { getClients, type Client } from '@/lib/api/clients'
import { ClientList } from '@/components/clients/client-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search } from 'lucide-react'
import Link from 'next/link'

export default function ClientesPage() {
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients(),
  })

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold text-gray-900'>Clientes</h1>
        </div>
        <p className='text-center text-gray-500 py-8'>Cargando...</p>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-gray-900'>Clientes</h1>
        <div className='flex gap-2'>
          <Link href='/workstation/user/clientes/buscar'>
            <Button variant='outline'><Search className='h-4 w-4 mr-2' />Buscar</Button>
          </Link>
          <Link href='/workstation/user/clientes/nuevo'>
            <Button><Plus className='h-4 w-4 mr-2' />Nuevo Cliente</Button>
          </Link>
        </div>
      </div>

      <ClientList clients={clients || []} showActions={false} />
    </div>
  )
}
