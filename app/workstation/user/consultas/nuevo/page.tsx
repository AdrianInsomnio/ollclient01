'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CalendarDays, FileText, PawPrint, Users } from 'lucide-react'
import { openConsultation } from '@/lib/api/consultations'

export default function NewConsultationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clientId, setClientId] = useState('')
  const [petId, setPetId] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const consultation = await openConsultation({
        clientId: Number(clientId),
        petId: Number(petId),
        notes,
      })
      router.push(`/workstation/user/consultas/${consultation.id}`)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Error al crear consulta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Nueva Consulta</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Volver
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Cliente</label>
          <Input
            type="number"
            placeholder="ID del cliente"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Mascota</label>
          <Input
            type="number"
            placeholder="ID de la mascota"
            value={petId}
            onChange={(e) => setPetId(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Notas iniciales</label>
          <Textarea
            placeholder="Síntomas, motivo de consulta..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </div>
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creando...' : 'Crear Consulta'}
        </Button>
      </form>
    </div>
  )
}
