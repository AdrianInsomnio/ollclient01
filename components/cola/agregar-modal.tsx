"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import {
  Search,
  Plus,
  Loader2,
  X,
  HeartPulse,
  Calendar,
  UserPlus,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { getClients, createClient, searchClients } from "@/lib/api/clients"
import { getAppointments, type Appointment } from "@/lib/api/appointments"
import { getPets, createPet, searchPets } from "@/lib/api/pets"
import { openConsultation } from "@/lib/api/consultations"
import { toast } from "sonner"

interface Pet {
  id: number
  name: string
  species: string
  breed?: string
  birthDate?: string
  weight?: number
  clientId: number
  client?: {
    id: number
    name: string
  }
  tenantId?: string
  createdAt: string
  updatedAt: string
}

interface SearchResult {
  type: "client" | "pet"
  id: string | number        // Pet ID
  clientId: string | number  // Client ID (owner)
  name: string               // Pet name
  secondaryName?: string     // Client name
  species?: string
  breed?: string
  ownerName?: string
  ownerPhone?: string
}

interface AgregarAColaModalProps {
  onSuccess?: () => void
}

const appointmentDateKey = (value: string) => {
  const datePart = String(value).match(/^(\d{4}-\d{2}-\d{2})/i)?.[1]
  if (datePart) return datePart

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Montevideo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(parsed)
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value
  return `${year}-${month}-${day}`
}

const appointmentTime = (value: string) => new Intl.DateTimeFormat("es-UY", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))

function ScheduledAppointmentsList({ appointments, loading, submitting, onSelect }: { appointments: Appointment[]; loading: boolean; submitting: boolean; onSelect: (appointment: Appointment) => void }) { const [currentTime] = useState(() => Date.now())
  if (loading) return <div className="flex min-h-0 flex-1 items-center justify-center gap-2 overflow-y-auto p-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Cargando agenda del día...</div>
  if (appointments.length === 0) return <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-y-auto p-10 text-center text-muted-foreground"><Calendar className="size-10 opacity-30" /><p className="font-medium">No hay citas pendientes para hoy</p><p className="text-sm">Las citas agregadas a la cola dejarán de aparecer aquí.</p></div>
  return <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"><div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-sm text-blue-800">Estas citas todavía no llegaron. Al agregarlas, quedarán en la cola con prioridad <strong>Programada</strong>.</div>{appointments.map((appointment) => { const late = new Date(appointment.date).getTime() < currentTime; return <div key={appointment.id} className="flex flex-col gap-3 rounded-xl border bg-background p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-lg font-semibold">{appointmentTime(appointment.date)}</span><Badge variant={late ? "warning" : "info"}>{late ? "Atrasada" : "Pendiente"}</Badge></div><p className="mt-1 font-medium">{appointment.pet?.name || `Mascota #${appointment.petId}`}</p><p className="text-sm text-muted-foreground">{appointment.client?.name || `Cliente #${appointment.clientId}`}{appointment.pet?.species ? ` · ${appointment.pet.species}` : ""}</p>{appointment.serviceType && <p className="mt-1 text-sm text-primary">{appointment.serviceType}</p>}</div><Button type="button" onClick={() => onSelect(appointment)} disabled={submitting} className="shrink-0"><Plus className="mr-2 size-4" />Agregar a la cola</Button></div>})}</div>
}

export function AgregarAColaModal({ onSuccess }: AgregarAColaModalProps) {
  const [open, setOpen] = useState(false)
  const [scheduledTab, setScheduledTab] = useState(true)
  const [scheduledAppointments, setScheduledAppointments] = useState<Appointment[]>([])
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [recentPatients, setRecentPatients] = useState<SearchResult[]>([])
  const [selectedPatient, setSelectedPatient] = useState<SearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingRecent, setIsLoadingRecent] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showNewPatientForm, setShowNewPatientForm] = useState(false)
  const [newPatientData, setNewPatientData] = useState({
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    petName: "",
    petSpecies: "",
    petBreed: "",
    petSex: "",
    motivo: "",
  })

  const loadScheduledAppointments = async () => {
    setIsLoadingScheduled(true)
    try {
      const today = appointmentDateKey(new Date().toISOString())
      const appointments = await getAppointments()
      setScheduledAppointments(appointments.filter((appointment) => {
        const normalizedStatus = String(appointment.status).trim().toLowerCase()
        const isScheduled = ["pending", "confirmed", "pendiente", "confirmada", "programada", "scheduled"].includes(normalizedStatus)
        const hasConsultation = Boolean(appointment.consultation)
        return appointmentDateKey(appointment.date) === today && isScheduled && !hasConsultation
      }))
    } catch (error) {
      console.error("Error loading scheduled appointments:", error)
      toast.error("No se pudieron cargar las citas agendadas")
    } finally {
      setIsLoadingScheduled(false)
    }
  }

  // Cargar pacientes recientes al abrir
  useEffect(() => {
    if (open) {
      loadRecentPatients()
      loadScheduledAppointments()
    }
  }, [open])

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (value) setScheduledTab(true)
  }

  const handleScheduledAppointment = async (appointment: Appointment) => {
    setIsSubmitting(true)
    try {
      await openConsultation({
        clientId: appointment.clientId,
        petId: appointment.petId,
        appointmentId: appointment.id,
        priority: "SCHEDULED",
        notes: appointment.notes || undefined,
      })
      toast.success("Cita agregada a la cola como programada")
      setScheduledAppointments((current) => current.filter((item) => item.id !== appointment.id))
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      console.error("Error adding scheduled appointment:", error)
      toast.error(error instanceof Error ? error.message : "No se pudo agregar la cita a la cola")
    } finally {
      setIsSubmitting(false)
    }
  }

  const loadRecentPatients = async () => {
    setIsLoadingRecent(true)
    try {
      const [clients, pets] = await Promise.all([
        getClients(),
        getPets(),
      ])

      // Tomar los ultimos 5 clientes con sus mascotas
      const recentClients = clients.slice(-5).reverse()
      const results: SearchResult[] = []

      for (const client of recentClients) {
        const clientPets = pets.filter(p => p.clientId === Number(client.id))
        for (const pet of clientPets.slice(0, 2)) {
          results.push({
            type: "pet",
            id: pet.id,
            clientId: client.id,  // FIX: Add clientId
            name: pet.name,
            secondaryName: client.name,
            species: pet.species,
            breed: pet.breed,
            ownerName: client.name,
            ownerPhone: client.phone,
          })
        }
      }

      setRecentPatients(results.slice(0, 10))
    } catch (error) {
      console.error("Error loading recent patients:", error)
    } finally {
      setIsLoadingRecent(false)
    }
  }

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      // Busqueda en servidor usando las APIs de busqueda
      const [foundClients, foundPets] = await Promise.all([
        searchClients(query),
        searchPets(query),
      ])

      const results: SearchResult[] = []

      // Procesar clientes encontrados - el backend ya incluye pets
      for (const client of foundClients) {
        // Verificar si el cliente tiene mascotas en la respuesta
        const clientPets = (client as typeof client & { pets?: Pet[] }).pets ?? []
        for (const pet of clientPets) {
          results.push({
            type: "pet",
            id: pet.id,
            clientId: client.id,  // FIX: Add clientId
            name: pet.name,
            secondaryName: client.name,
            species: pet.species,
            breed: pet.breed,
            ownerName: client.name,
            ownerPhone: client.phone,
          })
        }
      }

      // Procesar mascotas encontradas directamente
      for (const pet of foundPets) {
        // Evitar duplicados
        const exists = results.some(r => r.id === pet.id)
        if (!exists && pet.client) {
          results.push({
            type: "pet",
            id: pet.id,
            clientId: pet.client.id,  // FIX: Add clientId from pet.client
            name: pet.name,
            secondaryName: pet.client.name,
            species: pet.species,
            breed: pet.breed,
            ownerName: pet.client.name,
            ownerPhone: "",
          })
        }
      }

      // Deduplicar por ID de mascota
      const uniqueResults = Array.from(
        new Map(results.map(r => [r.id, r])).values()
      ).slice(0, 15)

      setSearchResults(uniqueResults)
    } catch (error) {
      console.error("Error searching:", error)
      toast.error("Error al buscar pacientes")
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, handleSearch])

  const handleSelectPatient = (patient: SearchResult) => {
    setSelectedPatient(patient)
    setShowNewPatientForm(false)
  }

  const handleSubmit = async () => {
    if (!selectedPatient) {
      toast.error("Selecciona un paciente")
      return
    }

    setIsSubmitting(true)
    try {
      // FIX: Use clientId from selectedPatient, not pet ID
      await openConsultation({
        clientId: Number(selectedPatient.clientId),
        petId: selectedPatient.id,
        notes: newPatientData.motivo || undefined,
      })

      toast.success("Paciente agregado a la cola")
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      console.error("Error adding to queue:", error)
      toast.error("Error al agregar a la cola")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateNewPatient = async () => {
    if (!newPatientData.clientName || !newPatientData.clientPhone || !newPatientData.petName || !newPatientData.petSpecies) {
      toast.error("Completa los campos obligatorios")
      return
    }

    setIsSubmitting(true)
    try {
      // Crear cliente
      const existingClients = await getClients()
      const client = existingClients.find(c => c.phone === newPatientData.clientPhone)

      let clientId: string | number

      if (client) {
        clientId = client.id
      } else {
        const tempEmail = newPatientData.clientEmail || newPatientData.clientPhone + "@temp.com"
        const newClient = await createClient({
          name: newPatientData.clientName,
          email: tempEmail,
          phone: newPatientData.clientPhone,
        })
        clientId = newClient.id
      }

      // Crear mascota
      const newPet = await createPet({
        name: newPatientData.petName,
        sex: newPatientData.petSex || undefined,
        species: newPatientData.petSpecies,
        breed: newPatientData.petBreed,
        clientId: Number(clientId),
      })

      // Abrir consulta
      await openConsultation({
        clientId: Number(clientId),
        petId: newPet.id,
        notes: newPatientData.motivo || undefined,
      })

      toast.success("Nuevo paciente creado y agregado a la cola")
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      console.error("Error creating new patient:", error)
      toast.error("Error al crear el paciente")
    } finally {
      setIsSubmitting(false)
    }
  }

  const tabClassName = (active: boolean) =>
    "px-4 py-3 text-sm font-medium transition-colors " +
    (active
      ? "text-foreground border-b-2 border-emerald-600 -mb-px"
      : "text-muted-foreground")

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Agregar a Cola
        </Button>
      </DialogTrigger>

      <DialogContent className="flex h-[80vh] min-h-[620px] max-h-[90vh] w-225! max-w-[calc(100%-2rem)]! flex-col overflow-hidden p-0 sm:min-h-[680px]">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-emerald-600" />
            Agregar a la Cola
          </DialogTitle>
          <DialogDescription>
            Busca un paciente existente o registra uno nuevo para añadirlo a la sala de espera
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6">
          {/* Pestañas: Buscar / Nuevo Paciente */}
          <div className="flex overflow-x-auto border-b bg-muted/50">
            <button
              type="button"
              className={tabClassName(scheduledTab)}
              onClick={() => { setScheduledTab(true); setShowNewPatientForm(false); setSelectedPatient(null); loadScheduledAppointments() }}
            >
              <Calendar className="h-4 w-4 mr-2 inline" />
              Agenda del día
            </button>
            <button
              type="button"
              className={tabClassName(!scheduledTab && !showNewPatientForm)}
              onClick={() => { setScheduledTab(false); setShowNewPatientForm(false); setSelectedPatient(null); }}
            >
              <Search className="h-4 w-4 mr-2 inline" />
              Buscar Paciente
            </button>
            <button
              type="button"
              className={tabClassName(!scheduledTab && showNewPatientForm)}
              onClick={() => { setScheduledTab(false); setShowNewPatientForm(true); setSelectedPatient(null); }}
            >
              <UserPlus className="h-4 w-4 mr-2 inline" />
              Nuevo Paciente
            </button>
          </div>

          {scheduledTab ? (
            <ScheduledAppointmentsList appointments={scheduledAppointments} loading={isLoadingScheduled} submitting={isSubmitting} onSelect={handleScheduledAppointment} />
          ) : !showNewPatientForm ? (
            // VISTA: BUSQUEDA
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, dueño, teléfono, documento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {isSearching && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                  <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
                </div>
              )}

              {/* Resultados de busqueda */}
              {searchQuery.trim().length >= 2 && searchResults.length > 0 && !isSearching && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Resultados ({searchResults.length})
                  </h4>
                  <ScrollArea className="max-h-[40vh]">
                    {searchResults.map((patient) => (
                      <button
                        key={patient.type + "-" + patient.id}
                        type="button"
                        onClick={() => handleSelectPatient(patient)}
                        className={
                          "w-full p-3 rounded-xl border transition-all text-left " +
                          (selectedPatient?.id === patient.id
                            ? "border-emerald-500 bg-emerald-50 shadow-sm"
                            : "border-border hover:bg-accent/50")
                        }
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <HeartPulse className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{patient.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              {patient.ownerName} - {patient.species}
                              {patient.breed && <span>- {patient.breed}</span>}
                            </p>
                          </div>
                          {selectedPatient?.id === patient.id && (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          )}
                        </div>
                      </button>
                    ))}
                  </ScrollArea>
                </div>
              )}

              {/* Pacientes recientes */}
              {searchQuery.trim().length < 2 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Pacientes Recientes
                    </h4>
                    {isLoadingRecent && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                  {isLoadingRecent ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse h-16 border rounded-xl bg-muted/50" />
                      ))}
                    </div>
                  ) : recentPatients.length > 0 ? (
                    <ScrollArea className="max-h-[40vh]">
                      {recentPatients.map((patient) => (
                        <button
                          key={patient.type + "-" + patient.id}
                          type="button"
                          onClick={() => handleSelectPatient(patient)}
                          className={
                            "w-full p-3 rounded-xl border transition-all text-left " +
                            (selectedPatient?.id === patient.id
                              ? "border-emerald-500 bg-emerald-50 shadow-sm"
                              : "border-border hover:bg-accent/50")
                          }
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <Clock className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{patient.name}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                {patient.ownerName} - {patient.species}
                                {patient.breed && <span>- {patient.breed}</span>}
                              </p>
                            </div>
                            {selectedPatient?.id === patient.id && (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <HeartPulse className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hay pacientes recientes</p>
                    </div>
                  )}
                </div>
              )}

              {/* Sin resultados */}
              {searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No se encontraron pacientes</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setShowNewPatientForm(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Crear nuevo paciente
                  </Button>
                </div>
              )}

              {/* Paciente seleccionado - Resumen */}
              {selectedPatient && (
                <Card className="border-emerald-500 bg-emerald-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{selectedPatient.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Dueño: {selectedPatient.ownerName} - {selectedPatient.species}
                          {selectedPatient.breed && " - " + selectedPatient.breed}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPatient(null)}
                      >
                        Cambiar
                      </Button>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <Label className="text-sm">Motivo de consulta (opcional)</Label>
                      <Input
                        placeholder="Ej: Consulta general, vacunación, control..."
                        value={newPatientData.motivo}
                        onChange={(e) => setNewPatientData({...newPatientData, motivo: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            // VISTA: NUEVO PACIENTE
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Datos del Dueño
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="clientName">Nombre *</Label>
                    <Input
                      id="clientName"
                      placeholder="Nombre completo"
                      value={newPatientData.clientName}
                      onChange={(e) => setNewPatientData({...newPatientData, clientName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="clientPhone">Teléfono *</Label>
                    <Input
                      id="clientPhone"
                      placeholder="Teléfono"
                      value={newPatientData.clientPhone}
                      onChange={(e) => setNewPatientData({...newPatientData, clientPhone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="clientEmail">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      placeholder="email@ejemplo.com"
                      value={newPatientData.clientEmail}
                      onChange={(e) => setNewPatientData({...newPatientData, clientEmail: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Datos de la Mascota
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="petName">Nombre *</Label>
                    <Input
                      id="petName"
                      placeholder="Nombre de la mascota"
                      value={newPatientData.petName}
                      onChange={(e) => setNewPatientData({...newPatientData, petName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="petSpecies">Especie *</Label>
                    <Input
                      id="petSpecies"
                      placeholder="Perro, Gato, etc."
                      value={newPatientData.petSpecies}
                      onChange={(e) => setNewPatientData({...newPatientData, petSpecies: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="petBreed">Raza</Label>
                    <Input
                      id="petBreed"
                      placeholder="Raza (opcional)"
                      value={newPatientData.petBreed}
                      onChange={(e) => setNewPatientData({...newPatientData, petBreed: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="petSex">Sexo</Label>
                    <select
                      id="petSex"
                      value={newPatientData.petSex}
                      onChange={(e) => setNewPatientData({...newPatientData, petSex: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Seleccionar</option>
                      <option value="Macho">Macho</option>
                      <option value="Hembra">Hembra</option>
                    </select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Motivo de Consulta
                </h4>
                <div className="space-y-1">
                  <Label htmlFor="motivo">Motivo</Label>
                  <Input
                    id="motivo"
                    placeholder="Ej: Consulta general, vacunación, control..."
                    value={newPatientData.motivo}
                    onChange={(e) => setNewPatientData({...newPatientData, motivo: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-3 px-6 pt-4 pb-8">
            <Button
              variant="outline"
              className="px-5 py-2"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            {!showNewPatientForm && selectedPatient ? (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="ml-auto px-5 py-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Agregando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar a Cola
                  </>
                )}
              </Button>
            ) : showNewPatientForm ? (
              <Button
                onClick={handleCreateNewPatient}
                disabled={isSubmitting}
                className="ml-auto px-5 py-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Crear y Agregar
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowNewPatientForm(true)}
                className="ml-auto px-5 py-2"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Crear Nuevo Paciente
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
