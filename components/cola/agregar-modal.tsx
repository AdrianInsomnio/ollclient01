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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Search,
  Plus,
  Loader2,
  X,
  HeartPulse,
  UserPlus,
  Clock,
  CheckCircle2,
  ChevronRight,
} from "lucide-react"
import { getClients, createClient, searchClients } from "@/lib/api/clients"
import { getPets, getPetsByClient, createPet, searchPets } from "@/lib/api/pets"
import { openConsultation } from "@/lib/api/consultations"
import { toast } from "sonner"

interface Client {
  id: string
  name: string
  email: string
  phone: string
  address?: string
  documentId?: string
  tenantId: string
  createdAt: string
  updatedAt: string
  pets?: Pet[]
}

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
  id: string | number
  name: string
  secondaryName?: string
  species?: string
  breed?: string
  ownerName?: string
  ownerPhone?: string
}

interface AgregarAColaModalProps {
  onSuccess?: () => void
}

export function AgregarAColaModal({ onSuccess }: AgregarAColaModalProps) {
  const [open, setOpen] = useState(false)
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
    motivo: "",
  })

  // Cargar pacientes recientes al abrir
  useEffect(() => {
    if (open) {
      loadRecentPatients()
    }
  }, [open])

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
      await openConsultation({
        clientId: Number(selectedPatient.id),
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Agregar a Cola
        </Button>
      </DialogTrigger>

      <DialogContent className="!w-[900px] !max-w-[calc(100%-2rem)] max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-emerald-600" />
            Agregar a la Cola
          </DialogTitle>
          <DialogDescription>
            Busca un paciente existente o registra uno nuevo para anadirlo a la sala de espera
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden px-6">
          {/* Pesta�as: Buscar / Nuevo Paciente */}
          <div className="border-b bg-muted/50">
            <button
              type="button"
              className={tabClassName(!showNewPatientForm)}
              onClick={() => { setShowNewPatientForm(false); setSelectedPatient(null); }}
            >
              <Search className="h-4 w-4 mr-2 inline" />
              Buscar Paciente
            </button>
            <button
              type="button"
              className={tabClassName(showNewPatientForm)}
              onClick={() => { setShowNewPatientForm(true); setSelectedPatient(null); }}
            >
              <UserPlus className="h-4 w-4 mr-2 inline" />
              Nuevo Paciente
            </button>
          </div>

          {!showNewPatientForm ? (
            // VISTA: BUSQUEDA
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, dueno, telefono, documento..."
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
                              {patient.ownerName} � {patient.species}
                              {patient.breed && <span>� {patient.breed}</span>}
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
                                {patient.ownerName} � {patient.species}
                                {patient.breed && <span>� {patient.breed}</span>}
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
                          Dueno: {selectedPatient.ownerName} � {selectedPatient.species}
                          {selectedPatient.breed && " � " + selectedPatient.breed}
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
                        placeholder="Ej: Consulta general, vacunacion, control..."
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
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Datos del Dueno
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
                    <Label htmlFor="clientPhone">Telefono *</Label>
                    <Input
                      id="clientPhone"
                      placeholder="Telefono"
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
                    placeholder="Ej: Consulta general, vacunacion, control..."
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
