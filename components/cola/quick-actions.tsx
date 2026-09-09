"use client"

import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Check, HeartPulse, Loader2, Search, UserPlus, X } from "lucide-react"
import { toast } from "sonner"
import { createClient, searchClients, type Client } from "@/lib/api/clients"
import { createPet, type Pet } from "@/lib/api/pets"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type ClientFormState = {
  firstName: string
  lastName: string
  documentId: string
  phone: string
  email: string
  address: string
}

type PetFormState = {
  name: string
  species: string
  breed: string
  sex: string
  birthDate: string
  color: string
  weight: string
  notes: string
}

const emptyClient: ClientFormState = { firstName: "", lastName: "", documentId: "", phone: "", email: "", address: "" }
const emptyPet: PetFormState = { name: "", species: "", breed: "", sex: "", birthDate: "", color: "", weight: "", notes: "" }

function clientLabel(client: Client) {
  return client.name || `Cliente #${client.id}`
}

function ClientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (client: Client) => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyClient)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(emptyClient)
      setError("")
    }
  }, [open])

  const update = (field: keyof ClientFormState, value: string) => setForm((current) => ({ ...current, [field]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Nombre y apellido son obligatorios.")
      return
    }
    if (form.phone && !/^[\d\s+\-()]{7,}$/.test(form.phone)) {
      setError("Ingresa un teléfono válido.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const client = await createClient({
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || undefined,
        documentId: form.documentId.trim() || undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ["clients"] })
      onCreated(client)
      onOpenChange(false)
      toast.success("Cliente creado correctamente")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el cliente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,1200px)] max-w-6xl rounded-xl">
        <DialogHeader>
          <DialogTitle>Nuevo Cliente</DialogTitle>
          <DialogDescription>Registra los datos básicos del responsable de la mascota.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="client-first-name" label="Nombre *" value={form.firstName} onChange={(value) => update("firstName", value)} required />
            <Field id="client-last-name" label="Apellido *" value={form.lastName} onChange={(value) => update("lastName", value)} required />
            <Field id="client-document" label="Documento / CI" value={form.documentId} onChange={(value) => update("documentId", value)} />
            <Field id="client-phone" label="Teléfono" value={form.phone} onChange={(value) => update("phone", value)} />
            <Field id="client-email" label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} />
            <Field id="client-address" label="Dirección" value={form.address} onChange={(value) => update("address", value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Creando..." : "Crear Cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ id, label, value, onChange, type = "text", required = false }: { id: string; label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} required={required} aria-invalid={required && !value.trim() ? undefined : false} onChange={(event) => onChange(event.target.value)} /></div>
}

function SelectedClient({ client, onRemove }: { client: Client; onRemove: () => void }) {
  return <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3">
    <div className="min-w-0 flex-1"><p className="font-medium">{clientLabel(client)}</p><p className="text-sm text-muted-foreground">{client.documentId ? `CI: ${client.documentId}` : "Sin CI"}{client.phone ? ` · Tel: ${client.phone}` : ""}</p></div>
    <Button type="button" variant="ghost" size="icon" aria-label="Quitar responsable" onClick={onRemove}><X className="h-4 w-4" /></Button>
  </div>
}

export function QuickActions({ onPetCreated }: { onPetCreated?: (pet: Pet) => void }) {
  const queryClient = useQueryClient()
  const [clientDialogOpen, setClientDialogOpen] = useState(false)
  const [petDialogOpen, setPetDialogOpen] = useState(false)
  const [clientContext, setClientContext] = useState<"standalone" | "pet">("standalone")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<Client[]>([])
  const [searching, setSearching] = useState(false)
  const [petForm, setPetForm] = useState(emptyPet)
  const [petError, setPetError] = useState("")
  const [petLoading, setPetLoading] = useState(false)

  useEffect(() => {
    if (!petDialogOpen || search.trim().length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try { setResults(await searchClients(search.trim())) } catch { setResults([]) } finally { setSearching(false) }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [petDialogOpen, search])

  const openClient = (context: "standalone" | "pet") => { setClientContext(context); setClientDialogOpen(true) }
  const handleClientCreated = (client: Client) => {
    if (clientContext === "pet") setSelectedClient(client)
  }
  const resetPet = () => { setPetForm(emptyPet); setSelectedClient(null); setSearch(""); setResults([]); setPetError("") }
  const closePet = (open: boolean) => { setPetDialogOpen(open); if (!open && !petLoading) resetPet() }
  const updatePet = (field: keyof PetFormState, value: string) => setPetForm((current) => ({ ...current, [field]: value }))
  const canCreatePet = Boolean(selectedClient && petForm.name.trim() && petForm.species.trim())

  const submitPet = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedClient || !petForm.name.trim() || !petForm.species.trim()) { setPetError("Selecciona un responsable y completa nombre y especie."); return }
    setPetLoading(true); setPetError("")
    try {
      const pet = await createPet({
        name: petForm.name.trim(), sex: petForm.sex || undefined, species: petForm.species.trim(), breed: petForm.breed.trim() || undefined,
        birthDate: petForm.birthDate ? new Date(`${petForm.birthDate}T00:00:00`).toISOString() : undefined,
        weight: petForm.weight ? Number(petForm.weight) : undefined, clientId: selectedClient.id,
        color: petForm.color.trim() || undefined, notes: petForm.notes.trim() || undefined,
      })
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["pets"] }), queryClient.invalidateQueries({ queryKey: ["client", String(selectedClient.id)] })])
      closePet(false)
      toast.success("Mascota creada correctamente")
      onPetCreated?.(pet)
    } catch (err) { setPetError(err instanceof Error ? err.message : "No se pudo crear la mascota.") } finally { setPetLoading(false) }
  }

  return <>
    <Button type="button" variant="outline" className="w-full justify-start gap-3" onClick={() => openClient("standalone")}><UserPlus className="h-4 w-4" /><span>Nuevo Cliente</span></Button>
    <Button type="button" variant="outline" className="w-full justify-start gap-3" onClick={() => { resetPet(); setPetDialogOpen(true) }}><HeartPulse className="h-4 w-4" /><span>Nueva Mascota</span></Button>

    <ClientDialog open={clientDialogOpen} onOpenChange={setClientDialogOpen} onCreated={handleClientCreated} />
    <Dialog open={petDialogOpen} onOpenChange={closePet}>
      <DialogContent className="max-h-[90vh] w-[min(92vw,1200px)] max-w-6xl overflow-y-auto rounded-xl">
        <DialogHeader><DialogTitle>Nueva Mascota</DialogTitle><DialogDescription>Busca y selecciona el cliente o dueño de la mascota.</DialogDescription></DialogHeader>
        <form onSubmit={submitPet} className="space-y-5">
          {petError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{petError}</p>}
          <section className="space-y-3"><Label htmlFor="owner-search">Responsable</Label>
            {selectedClient ? <SelectedClient client={selectedClient} onRemove={() => setSelectedClient(null)} /> : <>
              <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="owner-search" autoFocus placeholder="Buscar por nombre, apellido, CI, teléfono..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" /></div>
              {searching && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Buscando...</div>}
              {!searching && search.trim().length >= 2 && results.length === 0 && <div className="space-y-2 rounded-lg border border-dashed p-4 text-sm"><p>No encontramos un cliente con esos datos.</p><Button type="button" variant="outline" size="sm" onClick={() => openClient("pet")}><UserPlus className="mr-2 h-4 w-4" />Crear Cliente</Button></div>}
              {results.length > 0 && <div className="max-h-44 space-y-2 overflow-y-auto">{results.map((client) => <button type="button" key={client.id} className="flex w-full items-center justify-between rounded-xl border p-3 text-left hover:bg-accent" onClick={() => setSelectedClient(client)}><span><span className="block font-medium">{clientLabel(client)}</span><span className="text-sm text-muted-foreground">{client.documentId ? `CI: ${client.documentId}` : "Sin CI"}{client.phone ? ` · Tel: ${client.phone}` : ""}</span></span><Check className="h-4 w-4 text-blue-600" /></button>)}</div>}
            </>}
          </section>
          <section className="space-y-3 border-t pt-4"><h3 className="font-medium">Datos de la mascota</h3><div className="grid gap-4 sm:grid-cols-2">
            <Field id="pet-name" label="Nombre *" value={petForm.name} onChange={(value) => updatePet("name", value)} required />
            <Field id="pet-species" label="Especie *" value={petForm.species} onChange={(value) => updatePet("species", value)} required />
            <Field id="pet-breed" label="Raza" value={petForm.breed} onChange={(value) => updatePet("breed", value)} />
            <div className="space-y-2"><Label htmlFor="pet-sex">Sexo</Label><select id="pet-sex" value={petForm.sex} onChange={(event) => updatePet("sex", event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Seleccionar</option><option value="Macho">Macho</option><option value="Hembra">Hembra</option></select></div>
            <Field id="pet-birth-date" label="Fecha de nacimiento" type="date" value={petForm.birthDate} onChange={(value) => updatePet("birthDate", value)} />
            <Field id="pet-color" label="Color" value={petForm.color} onChange={(value) => updatePet("color", value)} />
            <Field id="pet-weight" label="Peso (kg)" type="number" value={petForm.weight} onChange={(value) => updatePet("weight", value)} />
          </div><div className="space-y-2"><Label htmlFor="pet-notes">Observaciones</Label><Textarea id="pet-notes" value={petForm.notes} onChange={(event) => updatePet("notes", event.target.value)} /></div></section>
          <DialogFooter><Button type="button" variant="outline" onClick={() => closePet(false)} disabled={petLoading}>Cancelar</Button><Button type="submit" disabled={!canCreatePet || petLoading}>{petLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{petLoading ? "Creando..." : "Crear Mascota"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>
}
