'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarDays, FileText, Search, Users, PlusCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { getConsultations } from '@/lib/api/consultations'

export default function ConsultationsPage() {
  const { data: consultations = [], isLoading } = useQuery({
    queryKey: ['consultations'],
    queryFn: () => getConsultations(),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Consultas</h1>
        <Link href="/workstation/user/consultas/nuevo">
          <Button variant="outline" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>Nueva Consulta</span>
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input placeholder="Buscar por paciente, mascota o fecha..." className="pl-9" />
      </div>

      {isLoading ? (
        <p className="text-center">Cargando consultas...</p>
      ) : consultations.length === 0 ? (
        <p className="text-center py-8 text-gray-500">No hay consultas registradas</p>
      ) : (
        <div className="space-y-4">
          {consultations.map((consultation: any) => (
            <Card key={consultation.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex-1">
                  <CardTitle className="text-sm font-medium">Consulta #{consultation.id}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {new Date(consultation.createdAt).toLocaleDateString('es-UY', { year: 'numeric', month: 'short', day: 'numeric' })} - {consultation.pet?.name ?? 'Mascota'} - {consultation.client?.name ?? 'Cliente'}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
                  {consultation.status}
                </span>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Motivo:</span>
                    <span>{consultation.symptoms ?? 'No especificado'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Estado:</span>
                    <span>{consultation.status === 'OPEN' ? 'Abierta' : 'Cerrada'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
