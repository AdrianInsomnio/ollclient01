'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { getClient, type Client } from '@/lib/api/clients'
import { ClientForm } from '@/components/clients/client-form'
import { useEffect, useState } from 'react'

export default function EditClientPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const [client, setClient] = useState<Client | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => getClient(clientId),
    enabled: !!clientId,
  })

  useEffect(() => {
    if (data) {
      setClient(data)
    }
  }, [data])

  if (isLoading) {
    return <p className='text-center text-gray-500 py-8'>Cargando...</p>
  }

  if (!client) {
    return <p className='text-center text-gray-500 py-8'>Cliente no encontrado</p>
  }

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold text-gray-900'>Editar Cliente</h1>
      <ClientForm 
        client={client} 
        onSuccess={() => router.push('/workstation/user/clientes/' + clientId)}
      />
    </div>
  )
}
