'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getOpenConsultations } from '@/lib/api/consultations'
import { getAppointments } from '@/lib/api/appointments'
import { getAdminUsers } from '@/lib/api/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Clock,
  Stethoscope,
  Users,
  UserCheck,
  UserX,
  Building2,
  Search,
  UserPlus,
  HeartPulse,
  Calendar,
  Activity,
  ChevronRight,
  Loader2,
  AlertTriangle,
  CalendarClock,
  CircleHelp,
  GripVertical,
} from 'lucide-react'
import { AgregarAColaModal } from '@/components/cola/agregar-modal'
import { queryClient } from '@/lib/query-client'

interface Consultation {
  id: string
  clientId: string | number
  petId: string | number
  client?: { id: string | number; name: string; phone?: string }
  pet?: { id: string | number; name: string; species: string; breed?: string }
  vetId?: string
  status: 'OPEN' | 'CLOSED'
  notes?: string
  createdAt: string
  updatedAt: string
}

interface Appointment {
  id: number
  clientId: number
  petId: number
  client?: { id: number; name: string }
  pet?: { id: number; name: string; species: string }
  vetId?: string
  date: string
  duration: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  serviceType?: string
  notes?: string
}

interface User {
  id: number
  username: string
  email: string
  role: 'USER' | 'VET' | 'ADMIN' | 'SUPER_ADMIN'
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  clinicCount: number
}

type Priority = 'NORMAL' | 'PROGRAMADA' | 'URGENTE'
type QueueStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
type QueueFilter = 'all' | 'waiting' | 'in_progress'

interface QueuePatient {
  id: number
  ownerName: string
  petName: string
  species: string
  reason: string
  status: QueueStatus
  priority: Priority
  createdAt: Date
}

interface FilterCounts {
  all: number
  waiting: number
  in_progress: number
}

function getPriorityOrder(priority: Priority): number {
  switch (priority) {
    case 'URGENTE': return 0
    case 'PROGRAMADA': return 1
    case 'NORMAL': return 2
  }
}

function sortPatientsByPriority(patients: QueuePatient[]): QueuePatient[] {
  return [...patients].sort((a, b) => {
    const priorityDiff = getPriorityOrder(a.priority) - getPriorityOrder(b.priority)
    if (priorityDiff !== 0) return priorityDiff
    return a.createdAt.getTime() - b.createdAt.getTime()
  })
}

function filterPatients(patients: QueuePatient[], filter: QueueFilter): QueuePatient[] {
  switch (filter) {
    case 'waiting': return patients.filter((p) => p.status === 'WAITING')
    case 'in_progress': return patients.filter((p) => p.status === 'IN_PROGRESS')
    case 'all':
    default: return patients
  }
}

function calculateFilterCounts(patients: QueuePatient[]): FilterCounts {
  return {
    all: patients.length,
    waiting: patients.filter((p) => p.status === 'WAITING').length,
    in_progress: patients.filter((p) => p.status === 'IN_PROGRESS').length,
  }
}

function changePatientPriority(patients: QueuePatient[], patientId: number, newPriority: Priority): QueuePatient[] {
  return patients.map((p) => p.id === patientId ? { ...p, priority: newPriority } : p)
}

function formatWaitTime(createdAt: Date): string {
  const diff = Date.now() - createdAt.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return hours + 'h ' + (minutes % 60) + 'min'
  return minutes + ' min'
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function mapConsultationToQueuePatient(consultation: Consultation, index: number): QueuePatient {
  const hasAppointment = false
  const isUrgent = consultation.notes?.toUpperCase().includes('URGENTE') ?? false
  let priority: Priority = 'NORMAL'
  if (isUrgent) priority = 'URGENTE'
  else if (hasAppointment) priority = 'PROGRAMADA'
  let status: QueueStatus = 'WAITING'
  if (consultation.status === 'OPEN') status = 'WAITING'
  return {
    id: index + 1,
    ownerName: consultation.client?.name || 'Cliente #' + consultation.clientId,
    petName: consultation.pet?.name || 'Mascota #' + consultation.petId,
    species: consultation.pet?.species || 'Desconocida',
    reason: consultation.notes || 'Consulta general',
    status,
    priority,
    createdAt: new Date(consultation.createdAt),
  }
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const config = {
    URGENTE: { label: 'Urgente', icon: AlertTriangle, className: 'bg-red-100 text-red-700 border-red-200', iconClassName: 'text-red-600' },
    PROGRAMADA: { label: 'Programada', icon: CalendarClock, className: 'bg-amber-100 text-amber-700 border-amber-200', iconClassName: 'text-amber-600' },
    NORMAL: { label: 'Normal', icon: CircleHelp, className: 'bg-blue-100 text-blue-700 border-blue-200', iconClassName: 'text-blue-600' },
  }
  const cfg = config[priority]
  const Icon = cfg.icon
  return <Badge variant='outline' className={cfg.className + ' gap-1.5 font-medium'}><Icon className={cfg.iconClassName + ' h-3 w-3'} aria-hidden='true' />{cfg.label}</Badge>
}

function StatusBadge({ status }: { status: QueueStatus }) {
  const config = {
    WAITING: { label: 'En Cola', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock, iconClassName: 'text-blue-600' },
    IN_PROGRESS: { label: 'En Atencion', className: 'bg-green-100 text-green-700 border-green-200', icon: Stethoscope, iconClassName: 'text-green-600' },
    COMPLETED: { label: 'Completada', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: UserCheck, iconClassName: 'text-emerald-600' },
    CANCELLED: { label: 'Cancelada', className: 'bg-gray-100 text-gray-600 border-gray-200', icon: UserX, iconClassName: 'text-gray-500' },
  }
  const cfg = config[status]
  const Icon = cfg.icon
  return <Badge variant='outline' className={cfg.className + ' gap-1.5'}><Icon className={cfg.iconClassName + ' h-3 w-3'} aria-hidden='true' />{cfg.label}</Badge>
}

function PatientCard({ patient, position, onPriorityChange }: { patient: QueuePatient; position: number; onPriorityChange: (id: number, priority: Priority) => void }) {
  const isUrgent = patient.priority === 'URGENTE'
  const isScheduled = patient.priority === 'PROGRAMADA'
  return (
    <Link href={'/workstation/user/consultas/' + patient.id} className={'group flex items-center gap-4 p-4 border rounded-xl transition-all duration-200 border-border ' + (isUrgent ? 'border-l-4 border-l-red-500 bg-red-50/30' : '') + (isScheduled ? 'border-l-4 border-l-amber-500 bg-amber-50/30' : '') + ' hover:bg-accent/50'}>
      <div className='shrink-0 w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center'><span className='font-bold text-lg text-foreground'>{position}</span></div>
      <button type='button' className='shrink-0 p-1 text-muted-foreground/50 hover:text-foreground transition-colors' aria-label='Reordenar' onClick={(e) => e.preventDefault()}><GripVertical className='h-5 w-5' /></button>
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2 flex-wrap'><p className='font-medium truncate'>{patient.ownerName}</p><StatusBadge status={patient.status} /><PriorityBadge priority={patient.priority} /></div>
        <p className='text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap'><span className='font-medium'>{patient.petName}</span><span className='text-muted-foreground'>.</span><span>{patient.species}</span></p>
        <p className='text-sm text-muted-foreground mt-1 line-clamp-1'>{patient.reason}</p>
      </div>
      <div className='flex flex-col items-end gap-2 text-right min-w-45'>
        <div className='flex items-center gap-1.5 text-sm text-muted-foreground'><Clock className='h-3.5 w-3.5' /><span className='font-mono font-medium'>{formatWaitTime(patient.createdAt)}</span></div>
        <Select value={patient.priority} onValueChange={(value) => onPriorityChange(patient.id, value as Priority)}>
          <SelectTrigger className='w-full max-w-xs text-xs h-8 py-0'><SelectValue placeholder='Prioridad' /></SelectTrigger>
          <SelectContent side='bottom' align='end'>
            <SelectItem value='URGENTE'><div className='flex items-center gap-2'><AlertTriangle className='h-3.5 w-3.5 text-red-600' /><span>Urgente</span></div></SelectItem>
            <SelectItem value='PROGRAMADA'><div className='flex items-center gap-2'><CalendarClock className='h-3.5 w-3.5 text-amber-600' /><span>Programada</span></div></SelectItem>
            <SelectItem value='NORMAL'><div className='flex items-center gap-2'><CircleHelp className='h-3.5 w-3.5 text-blue-600' /><span>Normal</span></div></SelectItem>
          </SelectContent>
        </Select>
        <ChevronRight className='h-5 w-5 text-muted-foreground/50 group-hover:text-foreground transition-colors' />
      </div>
    </Link>
  )
}

function EmptyState({ filter, onAddPatient }: { filter: QueueFilter; onAddPatient: () => void }) {
  const messages = {
    all: { title: 'La sala de espera esta vacia', description: 'No hay pacientes en cola en este momento' },
    waiting: { title: 'No hay pacientes en cola', description: 'Todos los pacientes estan siendo atendidos o la cola esta vacia' },
    in_progress: { title: 'No hay pacientes en atencion', description: 'Ningun paciente esta siendo atendido actualmente' },
  }
  const msg = messages[filter]
  return (
    <div className='flex flex-col items-center justify-center py-12 text-center'>
      <Users className='h-12 w-12 text-muted-foreground/50 mb-4' />
      <h3 className='text-lg font-medium text-muted-foreground'>{msg.title}</h3>
      <p className='text-sm text-muted-foreground mt-1'>{msg.description}</p>
      <Button variant='outline' size='sm' className='mt-4' onClick={onAddPatient}><UserPlus className='h-4 w-4 mr-2' />Agregar Paciente</Button>
    </div>
  )
}

function invalidateQueries() {
  queryClient.invalidateQueries({ queryKey: ['consultations-open'] })
  queryClient.invalidateQueries({ queryKey: ['appointments-today'] })
}

export default function ColaPage() {
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [queuePatients, setQueuePatients] = useState<QueuePatient[]>([])
  const { data: consultations, isLoading: loadingConsultations } = useQuery({ queryKey: ['consultations-open'], queryFn: () => getOpenConsultations() })
  const { data: appointments, isLoading: loadingAppointments } = useQuery({ queryKey: ['appointments-today'], queryFn: () => getAppointments() })
  const { data: adminUsers, isLoading: loadingVets } = useQuery({ queryKey: ['admin-users'], queryFn: () => getAdminUsers() })
  const isLoading = loadingConsultations || loadingAppointments || loadingVets
  const initializedPatients = useMemo(() => { if (!consultations?.length) return []; return consultations.map(mapConsultationToQueuePatient) }, [consultations])
  useEffect(() => { if (initializedPatients.length !== queuePatients.length) setQueuePatients(initializedPatients) }, [initializedPatients, queuePatients.length])
  const filteredPatients = useMemo(() => filterPatients(queuePatients, filter), [queuePatients, filter])
  const sortedPatients = useMemo(() => sortPatientsByPriority(filteredPatients), [filteredPatients])
  const filterCounts = useMemo(() => calculateFilterCounts(queuePatients), [queuePatients])
  const vets = adminUsers?.users?.filter((u) => u.role === 'VET' && u.isActive) || []
  const completedToday = appointments?.filter((a) => a.status === 'completed').length || 0
  const inProgressCount = queuePatients.filter((p) => p.status === 'IN_PROGRESS').length
  const cancelledToday = appointments?.filter((a) => a.status === 'cancelled').length || 0
  const availableRooms = Math.max(0, 4 - inProgressCount)
  const handlePriorityChange = (patientId: number, newPriority: Priority) => { setQueuePatients((prev) => { const updated = changePatientPriority(prev, patientId, newPriority); return sortPatientsByPriority(updated) }) }
  if (isLoading) {
    return <div className='space-y-6'><div className='flex items-center justify-between'><div><h1 className='text-2xl font-bold'>Cola de Atencion</h1><p className='text-muted-foreground'>Gestiona el flujo de pacientes y consultas en tiempo real.</p></div><Button disabled><Loader2 className='h-4 w-4 mr-2 animate-spin' />Cargando...</Button></div><div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>{[1,2,3,4].map((i) => <Card key={i} className='animate-pulse'><CardContent className='py-6'><div className='h-4 bg-muted rounded w-3/4' /><div className='mt-2 h-8 bg-muted rounded w-1/2' /></CardContent></Card>)}</div><Card className='animate-pulse'><CardContent className='py-12'><div className='h-6 bg-muted rounded w-1/4 mb-4' /><div className='space-y-3'>{[1,2,3].map((i) => <div key={i} className='h-16 bg-muted rounded' />)}</div></CardContent></Card></div>
  }
  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'><div><h1 className='text-2xl font-bold tracking-tight'>Cola de Atencion</h1><p className='text-muted-foreground mt-1'>Gestiona el flujo de pacientes y consultas en tiempo real.</p></div><AgregarAColaModal onSuccess={invalidateQueries} /></div>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card><CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Consultas Completadas</CardTitle><UserCheck className='h-4 w-4 text-muted-foreground' /></CardHeader><CardContent><div className='text-2xl font-bold'>{completedToday}</div><p className='text-xs text-muted-foreground'>Hoy</p></CardContent></Card>
        <Card><CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Pacientes en Atencion</CardTitle><Activity className='h-4 w-4 text-green-500' /></CardHeader><CardContent><div className='text-2xl font-bold text-green-600'>{inProgressCount}</div><p className='text-xs text-muted-foreground'>En consultorio</p></CardContent></Card>
        <Card><CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Consultas Canceladas</CardTitle><UserX className='h-4 w-4 text-muted-foreground' /></CardHeader><CardContent><div className='text-2xl font-bold text-red-600'>{cancelledToday}</div><p className='text-xs text-muted-foreground'>Hoy</p></CardContent></Card>
        <Card><CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Consultorios Disponibles</CardTitle><Building2 className='h-4 w-4 text-muted-foreground' /></CardHeader><CardContent><div className='text-2xl font-bold text-blue-600'>{availableRooms}</div><p className='text-xs text-muted-foreground'>De 4 total</p></CardContent></Card>
      </div>
      <div className='grid gap-6 lg:grid-cols-4'>
        <div className='lg:col-span-3 space-y-6'>
          <Card><CardHeader className='pb-3'><div className='flex items-center justify-between'><div className='flex items-center gap-2'><div className='p-2 bg-blue-100 rounded-lg'><Users className='h-5 w-5 text-blue-600' /></div><div><CardTitle className='text-lg font-semibold'>Sala de Espera</CardTitle><p className='text-sm text-muted-foreground'>{filterCounts.all} paciente{filterCounts.all !== 1 ? 's' : ''} en total</p></div></div><Tabs value={filter} onValueChange={(value) => setFilter(value as QueueFilter)} className='hidden sm:flex'><TabsList className='bg-transparent p-1'><TabsTrigger value='all' className='text-xs px-3 flex items-center gap-1.5'><Search className='h-3 w-3' /><span>Todas</span><Badge variant='secondary' className='ml-1 h-5 px-1.5 text-xs'>{filterCounts.all}</Badge></TabsTrigger><TabsTrigger value='waiting' className='text-xs px-3 flex items-center gap-1.5'><Clock className='h-3 w-3' /><span>En Cola</span><Badge variant='secondary' className='ml-1 h-5 px-1.5 text-xs'>{filterCounts.waiting}</Badge></TabsTrigger><TabsTrigger value='in_progress' className='text-xs px-3 flex items-center gap-1.5'><Stethoscope className='h-3 w-3' /><span>En Atencion</span><Badge variant='secondary' className='ml-1 h-5 px-1.5 text-xs'>{filterCounts.in_progress}</Badge></TabsTrigger></TabsList></Tabs></div><div className='sm:hidden mt-3'><Select value={filter} onValueChange={(value) => setFilter(value as QueueFilter)}><SelectTrigger className='w-full'><SelectValue placeholder='Filtrar pacientes' /></SelectTrigger><SelectContent><SelectItem value='all'>Todas ({filterCounts.all})</SelectItem><SelectItem value='waiting'>En Cola ({filterCounts.waiting})</SelectItem><SelectItem value='in_progress'>En Atencion ({filterCounts.in_progress})</SelectItem></SelectContent></Select></div></CardHeader><CardContent className='pt-0'>{sortedPatients.length === 0 ? <EmptyState filter={filter} onAddPatient={() => {}} /> : <div className='space-y-2'>{sortedPatients.map((patient, index) => <PatientCard key={patient.id} patient={patient} position={index + 1} onPriorityChange={handlePriorityChange} />)}</div>}</CardContent></Card></div>
        <div className='lg:col-span-1 space-y-6'>
          <Card><CardHeader className='pb-3'><CardTitle className='flex items-center gap-2 text-lg'><HeartPulse className='h-5 w-5 text-emerald-600' />Acciones Rapidas</CardTitle></CardHeader><CardContent className='pt-0 space-y-2'><Link href='/workstation/user/clientes/buscar'><Button variant='outline' className='w-full justify-start gap-3'><UserPlus className='h-4 w-4' /><span>Nuevo Cliente</span></Button></Link><Link href='/workstation/user/mascotas/nuevo'><Button variant='outline' className='w-full justify-start gap-3'><HeartPulse className='h-4 w-4' /><span>Nueva Mascota</span></Button></Link><Link href='/workstation/user/consultas'><Button variant='outline' className='w-full justify-start gap-3'><Calendar className='h-4 w-4' /><span>Consultas Anteriores</span></Button></Link><AgregarAColaModal onSuccess={invalidateQueries} /></CardContent></Card>
          <Card><CardHeader className='pb-3'><CardTitle className='flex items-center gap-2 text-lg'><Stethoscope className='h-5 w-5 text-blue-600' />Veterinarios Disponibles</CardTitle></CardHeader><CardContent className='pt-0'>{vets.length === 0 ? <div className='text-center py-8'><Stethoscope className='h-10 w-10 text-muted-foreground/30 mx-auto mb-3' /><p className='text-sm text-muted-foreground'>No hay veterinarios registrados</p></div> : <div className='space-y-3'>{vets.map((vet) => <div key={vet.id} className='flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors'><Avatar className='h-10 w-10'><AvatarImage src={'https://api.dicebear.com/7.x/avataaars/svg?seed=' + vet.username} alt={vet.username} /><AvatarFallback>{getInitials(vet.username)}</AvatarFallback></Avatar><div className='flex-1 min-w-0'><p className='font-medium truncate'>{vet.username}</p><p className='text-xs text-muted-foreground'>Veterinario</p></div><Badge variant={vet.isActive ? 'default' : 'secondary'} className={vet.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>{vet.isActive ? 'Libre' : 'Ocupado'}</Badge></div>)}</div>}</CardContent></Card>
          <Card><CardHeader className='pb-3'><CardTitle className='flex items-center gap-2 text-lg'><CircleHelp className='h-5 w-5 text-muted-foreground' />Prioridad de Atencion</CardTitle></CardHeader><CardContent className='pt-0 space-y-3'><div className='flex items-center gap-2 text-sm'><AlertTriangle className='h-4 w-4 text-red-600 shrink-0' /><div><p className='font-medium text-red-700'>Urgente</p><p className='text-xs text-muted-foreground'>Prioridad maxima - Atencion inmediata</p></div></div><Separator /><div className='flex items-center gap-2 text-sm'><CalendarClock className='h-4 w-4 text-amber-600 shrink-0' /><div><p className='font-medium text-amber-700'>Programada</p><p className='text-xs text-muted-foreground'>Cita agendada previamente</p></div></div><Separator /><div className='flex items-center gap-2 text-sm'><CircleHelp className='h-4 w-4 text-blue-600 shrink-0' /><div><p className='font-medium text-blue-700'>Normal</p><p className='text-xs text-muted-foreground'>Orden de llegada (FIFO)</p></div></div><Separator /><p className='text-xs text-muted-foreground text-center'>Dentro de cada nivel se respeta el orden de llegada</p></CardContent></Card>
        </div>
      </div>
    </div>
  )
}