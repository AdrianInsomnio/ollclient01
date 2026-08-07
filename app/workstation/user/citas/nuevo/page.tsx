"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createAppointment } from "@/lib/api/appointments";
import { getClients, type Client } from "@/lib/api/clients";
import { getPets, type Pet } from "@/lib/api/pets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calendar, User, PawPrint, Plus } from "lucide-react";

export default function NuevaCitaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [petId, setPetId] = useState("");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients(),
  });

  const { data: pets } = useQuery({
    queryKey: ["pets", clientId],
    queryFn: () => (clientId ? getPets() : Promise.resolve([])),
    enabled: !!clientId,
  });

  const clientPets: Pet[] = (pets ?? []).filter((p) => p.clientId === Number(clientId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const appointment = await createAppointment({
        clientId: Number(clientId),
        petId: Number(petId),
        date,
        duration: Number(duration),
        serviceType,
        notes,
      });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      router.push(`/workstation/user/citas/${appointment.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? "Error al crear la cita");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !error) {
    return <p className="text-center text-gray-500 py-8">Creando cita...</p>;
  }

  return (
    <div className="space-y-6">
      <Link href="/workstation/user/citas" className="inline-flex">
        <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Volver a Citas</Button>
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Nueva Cita</h1>

      {!clientId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Seleccionar Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-60 overflow-y-auto space-y-2">
              {clients?.map((client: Client) => (
                <button
                  key={client.id}
                  onClick={() => setClientId(client.id.toString())}
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium">{client.name}</p>
                  <p className="text-sm text-gray-500">{client.phone ?? ""}</p>
                </button>
              )) ?? []}
            </div>
            <Link href="/workstation/user/clientes/nuevo" className="block">
              <Button variant="outline" className="w-full mt-4"><Plus className="h-4 w-4 mr-2" />Crear Nuevo Cliente</Button>
            </Link>
          </CardContent>
        </Card>
      ) : !petId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PawPrint className="h-5 w-5" />Seleccionar Mascota</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">Cliente: {clients?.find((c) => String(c.id) === clientId)?.name ?? ""}</p>
            {clientPets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No hay mascotas registradas para este cliente</p>
                <Link href={`/workstation/user/mascotas/nuevo?clientId=${clientId}`}>
                  <Button><Plus className="h-4 w-4 mr-2" />Crear Mascota</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {clientPets.map((pet) => (
                  <button
                    key={pet.id}
                    onClick={() => setPetId(pet.id.toString())}
                    className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3"
                  >
                    <PawPrint className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">{pet.name}</p>
                      <p className="text-sm text-gray-500">{pet.species} {pet.breed ? `- ${pet.breed}` : ""}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <Button variant="ghost" onClick={() => setClientId("")}>Cambiar Cliente</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Detalles de la Cita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="date" className="text-sm font-medium">Fecha *</label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="duration" className="text-sm font-medium">Duración (min) *</label>
                  <Input id="duration" type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(e.target.value)} required placeholder="30" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="serviceType" className="text-sm font-medium">Tipo de servicio</label>
                <Input id="serviceType" value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="Consulta general, vacunación, desparasitación..." />
              </div>
              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">Notas</label>
                <textarea id="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Observaciones adicionales..." />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
                <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Crear Cita"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
