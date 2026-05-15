'use client'

import Link from 'next/link'
import { type Client } from '@/lib/api/clients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Phone, Mail, MapPin } from 'lucide-react'

interface ClientListProps {
  clients: Client[]
  title?: string
  showActions?: boolean
}

export function ClientList({ clients, title = 'Clientes', showActions = true }: ClientListProps) {
  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
          <p className='text-sm text-gray-500 text-center py-8'>No hay clientes</p>
          {showActions && (
            <div className='flex justify-center'>
              <Link href='/workstation/user/clientes/nuevo'>
                <Button><Plus className='h-4 w-4 mr-2' />Crear Cliente</Button>
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
            <Link href='/workstation/user/clientes/buscar'>
              <Button variant='outline' size='sm'><Search className='h-4 w-4 mr-2' />Buscar</Button>
            </Link>
            <Link href='/workstation/user/clientes/nuevo'>
              <Button size='sm'><Plus className='h-4 w-4 mr-2' />Nuevo</Button>
            </Link>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className='divide-y'>
          {clients.map((client) => (
            <Link
              key={client.id}
              href={'/workstation/user/clientes/' + client.id}
              className='flex items-center justify-between py-4 hover:bg-gray-50 transition-colors'
            >
              <div className='flex-1'>
                <p className='font-medium text-gray-900'>{client.name}</p>
                <div className='flex gap-4 mt-1 text-sm text-gray-500'>
                  {client.phone && (
                    <span className='flex items-center gap-1'><Phone className='h-3 w-3' />{client.phone}</span>
                  )}
                  {client.email && (
                    <span className='flex items-center gap-1'><Mail className='h-3 w-3' />{client.email}</span>
                  )}
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
