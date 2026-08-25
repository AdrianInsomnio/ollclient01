"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { getOpenConsultations } from "@/lib/api/consultations"
import { getAppointments } from "@/lib/api/appointments"
import { getAdminUsers } from "@/lib/api/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AgregarAColaModal } from "@/components/cola/agregar-modal"
import { queryClient } from "@/lib/query-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
} from "lucide-react"
import { useState } from "react"

interface Consultation {
  id: string
  clientId: string | number
  petId: string | number
  client?: { id: string | number; name: string; phone?: string }
  pet?: { id: string | number; name: string; species: string; breed?: string }
  vetId?: string
  status: "OPEN" | "CLOSED"
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
  status: "pending" | "confirmed" | "completed" | "cancelled"
  serviceType?: string
  notes?: string
}

interface User {
  id: number
  username: string
  email: string
  role: "USER" | "VET" | "ADMIN" | "SUPER_ADMIN"
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  clinicCount: number
}

function formatWaitTime(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return hours + "h " + (minutes % 60) + "min"
  }
  return minutes + " min"
}

function getStatusBadge(status: string) {
  switch (status) {
    case "OPEN":
    case "pending":
    case "confirmed":
      return "Activa"
    case "IN_PROGRESS":
    case "en_curso":
      return "En Curso"
    case "completed":
      return "Completada"
    case "CLOSED":
    case "cancelled":
      return "Cancelada"
    default:
      return status
  }
}

function getVetStatusBadge(isActive: boolean) {
  return isActive ? "Libre" : "Ocupado"
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function invalidateConsultations() {
  queryClient.invalidateQueries({ queryKey: ["consultations-open"] })
  queryClient.invalidateQueries({ queryKey: ["appointments-today"] })
}

export default function ColaPage() {
  const [filter, setFilter] = useState("all")

  const { data: consultations, isLoading: loadingConsultations } = useQuery({
    queryKey: ["consultations-open"],
    queryFn: () => getOpenConsultations(),
  })

  const { data: appointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ["appointments-today"],
    queryFn: () => getAppointments(),
  })

  const { data: adminUsers, isLoading: loadingVets } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getAdminUsers(),
  })

  const isLoading = loadingConsultations || loadingAppointments || loadingVets

  // Filtrar consultas segun el estado
  const filteredConsultations = consultations?.filter((c) => {
    if (filter === "all") return true
    if (filter === "active") return c.status === "OPEN"
    if (filter === "in_progress") return c.status === "OPEN"
    return true
  }) || []

  // Obtener veterinarios (usuarios con rol VET)
  const vets = adminUsers?.users?.filter((u) => u.role === "VET" && u.isActive) || []

  // Estadisticas
  const completedToday = appointments?.filter((a) => a.status === "completed").length || 0
  const inProgress = filteredConsultations.filter((c) => c.status === "OPEN").length
  const cancelledToday = appointments?.filter((a) => a.status === "cancelled").length || 0
  const availableRooms = Math.max(0, 4 - inProgress)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cola de Atención</h1>
            <p className="text-muted-foreground">Gestiona el flujo de pacientes y consultas en tiempo real.</p>
          </div>
          <Button disabled>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Cargando...
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-6">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="mt-2 h-8 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="py-12">
            <div className="h-6 bg-muted rounded w-1/4 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cola de Atención</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona el flujo de pacientes y consultas en tiempo real.
          </p>
        </div>
        <AgregarAColaModal onSuccess={invalidateConsultations} />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Consultas Completadas
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedToday}</div>
            <p className="text-xs text-muted-foreground">Hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pacientes en Atencion
            </CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{inProgress}</div>
            <p className="text-xs text-muted-foreground">En consultorio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Consultas Canceladas
            </CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{cancelledToday}</div>
            <p className="text-xs text-muted-foreground">Hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Consultorios Disponibles
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{availableRooms}</div>
            <p className="text-xs text-muted-foreground">De 4 total</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sala de Espera - Main Area */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Sala de Espera</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {filteredConsultations.length} paciente{filteredConsultations.length !== 1 ? "s" : ""} en cola
                    </p>
                  </div>
                </div>
                {/* Filtros por estado */}
                <Tabs value={filter} onValueChange={(value) => setFilter(value)} className="hidden sm:flex">
                  <TabsList className="bg-transparent p-1">
                    <TabsTrigger value="all" className="text-xs px-3">
                      <Search className="h-3 w-3 mr-1" />
                      Todas
                    </TabsTrigger>
                    <TabsTrigger value="active" className="text-xs px-3">
                      <Clock className="h-3 w-3 mr-1" />
                      Activas
                    </TabsTrigger>
                    <TabsTrigger value="in_progress" className="text-xs px-3">
                      <Stethoscope className="h-3 w-3 mr-1" />
                      En Curso
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {/* Mobile filter dropdown */}
              <div className="sm:hidden mt-3">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full text-sm border rounded-md px-3 py-2 bg-background">
                  <option value="all">Todas</option>
                  <option value="active">Activas</option>
                  <option value="in_progress">En Curso</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {filteredConsultations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">
                    No hay pacientes en espera
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filter === "all"
                      ? "La sala de espera esta vacia"
                      : "No hay pacientes con filtro: " + (filter === "active" ? "Activas" : "En Curso")}
                  </p>
                  <AgregarAColaModal onSuccess={invalidateConsultations} />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConsultations.map((consultation, index) => (
                    <Link
                      key={consultation.id}
                      href={"/workstation/user/consultas/" + consultation.id}
                      className="group flex items-center gap-4 p-4 border rounded-xl hover:bg-accent/50 transition-all duration-200 border-border">
                      {/* Numero de posicion */}
                      <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                        <span className="font-bold text-lg text-blue-600">{index + 1}</span>
                      </div>

                      {/* Info del paciente */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">
                            {consultation.client?.name || "Cliente #" + consultation.clientId}
                          </p>
                          {getStatusBadge(consultation.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{consultation.pet?.name || "Mascota #" + consultation.petId}</span>
                          {consultation.pet?.species && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span>{consultation.pet.species}</span>
                            </>
                          )}
                          {consultation.pet?.breed && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span>{consultation.pet.breed}</span>
                            </>
                          )}
                        </p>
                        {consultation.notes && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {consultation.notes}
                          </p>
                        )}
                      </div>

                      {/* Tiempo de espera y accion */}
                      <div className="flex flex-col items-end gap-2 text-right">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="font-mono font-medium">{formatWaitTime(consultation.createdAt)}</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panel Lateral Derecho */}
        <div className="lg:col-span-1 space-y-6">
          {/* Acciones Rapidas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <HeartPulse className="h-5 w-5 text-emerald-600" />
                Acciones Rapidas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Link href="/workstation/user/clientes/buscar">
                <Button variant="outline" className="w-full justify-start gap-3">
                  <UserPlus className="h-4 w-4" />
                  <span>Nuevo Cliente</span>
                </Button>
              </Link>
              <Link href="/workstation/user/mascotas/nuevo">
                <Button variant="outline" className="w-full justify-start gap-3">
                  <HeartPulse className="h-4 w-4" />
                  <span>Nueva Mascota</span>
                </Button>
              </Link>
              <Link href="/workstation/user/consultas">
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Calendar className="h-4 w-4" />
                  <span>Consultas Anteriores</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Veterinarios Disponibles */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Stethoscope className="h-5 w-5 text-blue-600" />
                Veterinarios Disponibles
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {vets.length === 0 ? (
                <div className="text-center py-8">
                  <Stethoscope className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No hay veterinarios registrados
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vets.map((vet) => (
                    <div
                      key={vet.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={"https://api.dicebear.com/7.x/avataaars/svg?seed=" + vet.username} alt={vet.username} />
                        <AvatarFallback>{getInitials(vet.username)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{vet.username}</p>
                        <p className="text-xs text-muted-foreground">Veterinario</p>
                      </div>
                      {getVetStatusBadge(vet.isActive)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
