'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getClients, type Client } from '@/lib/api/clients'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Plus, Phone, Mail, User } from 'lucide-react'

export default function ClientSearchPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const { data: allClients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients(),
  })

  const filteredClients = allClients?.filter(client => {
    const term = searchTerm.toLowerCase()
    return (
      client.name.toLowerCase().includes(term) ||
      client.phone.includes(term) ||
      client.email.toLowerCase().includes(term) ||
      (client.documentNumber && client.documentNumber.includes(term))
    )
  }) || []

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Buscar Cliente</h1>
        <Link href='/workstation/user/clientes/nuevo'>
          <Button><Plus className='h-4 w-4 mr-2' />Nuevo Cliente</Button>
        </Link>
      </div>

      <Card>
        <CardContent className='pt-6'>
          <div className='relative'>
            <Search className='absolute left-3 top-3 h-5 w-5 text-gray-400' />
            <Input
              placeholder='Buscar por nombre, telefono, email o documento...'
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
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className='text-center py-12'>
            <p className='text-gray-500 mb-4'>No se encontraron clientes</p>
            <Link href='/workstation/user/clientes/nuevo'>
              <Button variant='outline' className='mt-4'><Plus className='h-4 w-4 mr-2' />Crear Cliente</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-2'>
          <p className='text-sm text-gray-500'>{filteredClients.length} resultado{filteredClients.length !== 1 ? 's' : ''}</p>
          <Card>
            <CardContent className='p-0'>
              <div className='divide-y'>
                {filteredClients.map((client) => (
                  <Link
                    key={client.id}
                    href={'/workstation/user/clientes/' + client.id}
                    className='flex items-center justify-between p-4 hover:bg-gray-50 transition-colors'
                  >
                    <div className='flex items-center gap-4'>
                      <div className='h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center'>
                        <User className='h-5 w-5 text-gray-500' />
                      </div>
                      <div>
                        <p className='font-medium text-gray-900'>{client.name}</p>
                        <div className='flex gap-3 text-sm text-gray-500'>
                          {client.phone && <span className='flex items-center gap-1'><Phone className='h-3 w-3' />{client.phone}</span>}
                          {client.email && <span className='flex items-center gap-1'><Mail className='h-3 w-3' />{client.email}</span>}
                        </div>
                      </div>
                    </div>
                    <span className='text-gray-400'>→</span>
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
