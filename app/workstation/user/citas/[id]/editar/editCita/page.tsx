"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getAppointment,
  updateAppointment,
  type Appointment,
  type UpdateAppointmentPayload,
} from "@/lib/api/appointments";
import { getClients, type Client } from "@/lib/api/clients";
import { getPets, type Pet } from "@/lib/api/pets";
import { Button } from "@/components/ui/button";

export default function EditCitaPage() {
  const params = useParams();
  const router = useRouter();
  const citaId = params.id as string;
  const {
    data: cita,
    isLoading: citaLoading,
    error: citaError,
  } = useQuery({
    queryKey: ["cita", citaId],
    queryFn: () => getAppointment(citaId),
    enabled: Boolean(citaId),
  });
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: getClients,
  });
  const { data: pets = [], isLoading: petsLoading } = useQuery({
    queryKey: ["pets"],
    queryFn: getPets,
  });

  if (citaLoading || clientsLoading || petsLoading)
    return (
      <div className="flex h-50 items-center justify-center">
        <p className="text-gray-500">Cargando datos...</p>
      </div>
    );
  if (citaError)
    return (
      <div className="rounded bg-red-50 p-4 text-red-600">
        Error al cargar cita:{" "}
        {citaError instanceof Error ? citaError.message : "Error desconocido"}
      </div>
    );
  if (!cita)
    return (
      <div className="rounded bg-red-50 p-4 text-red-600">
        Cita no encontrada
      </div>
    );

  return (
    <EditCitaForm
      key={cita.id}
      cita={cita}
      clients={clients}
      pets={pets}
      citaId={citaId}
      router={router}
    />
  );
}

function EditCitaForm({
  cita,
  clients,
  pets,
  citaId,
  router,
}: {
  cita: Appointment;
  clients: Client[];
  pets: Pet[];
  citaId: string;
  router: ReturnType<typeof useRouter>;
}) {
  const [clientId, setClientId] = useState(String(cita.clientId));
  const [petId, setPetId] = useState(String(cita.petId));
  const [date, setDate] = useState(cita.date.split("T")[0]);
  const [duration, setDuration] = useState(String(cita.duration));
  const [serviceType, setServiceType] = useState(cita.serviceType ?? "");
  const [notes, setNotes] = useState(cita.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (data: UpdateAppointmentPayload) =>
      updateAppointment(citaId, data),
    onSuccess: () => {
      setSuccess("Cita actualizada exitosamente");
      window.setTimeout(
        () => router.push(`/workstation/user/citas/${citaId}`),
        1500,
      );
    },
    onError: (mutationError: unknown) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Error al actualizar cita",
      ),
  });
  const clientPets = pets.filter((pet) => pet.clientId === Number(clientId));
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    mutation.mutate({
      clientId: Number(clientId),
      petId: Number(petId),
      date,
      duration: Number(duration),
      serviceType,
      notes,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link href={`/workstation/user/citas/${citaId}`}>
          <Button variant="outline">Volver a Citas</Button>
        </Link>
      </div>
      {error && (
        <div className="rounded bg-red-50 p-4 text-red-600">{error}</div>
      )}
      {success && (
        <div className="rounded bg-green-50 p-4 text-green-600">{success}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="clientId" className="text-sm font-medium">
              Cliente *
            </label>
            <select
              id="clientId"
              value={clientId}
              onChange={(event) => {
                setClientId(event.target.value);
                setPetId("");
              }}
              className="select select-bordered w-full"
              required
            >
              <option value="">Seleccionar cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="petId" className="text-sm font-medium">
              Mascota *
            </label>
            <select
              id="petId"
              value={petId}
              onChange={(event) => setPetId(event.target.value)}
              className="select select-bordered w-full"
              required
            >
              <option value="">Seleccionar mascota</option>
              {clientPets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} ({pet.species} {pet.breed ?? ""})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="date" className="text-sm font-medium">
              Fecha *
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="input input-bordered w-full"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="duration" className="text-sm font-medium">
              Duración (min) *
            </label>
            <input
              id="duration"
              type="number"
              min="15"
              step="15"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              className="input input-bordered w-full"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="serviceType" className="text-sm font-medium">
            Tipo de servicio
          </label>
          <input
            id="serviceType"
            type="text"
            value={serviceType}
            onChange={(event) => setServiceType(event.target.value)}
            className="input input-bordered w-full"
            placeholder="Consulta general, vacunación, desparasitación..."
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-medium">
            Notas
          </label>
          <textarea
            id="notes"
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="textarea textarea-bordered w-full"
            placeholder="Observaciones adicionales..."
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Actualizando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
