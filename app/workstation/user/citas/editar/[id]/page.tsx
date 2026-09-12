"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getClients } from "@/lib/api/clients";
import { getPets } from "@/lib/api/pets";
import { getAppointment, updateAppointment } from "@/lib/api/appointments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, User, PawPrint, Check, X } from "lucide-react";

const pad = (value: number) => String(value).padStart(2, "0");

function getLocalDateTimeParts(value: string) {
  const date = new Date(value);
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function toIsoFromLocalDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function EditarCitaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const appointmentId = params.id as string;
  const [clientId, setClientId] = useState("");
  const [petId, setPetId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: appointment, isLoading: loadingAppointment } = useQuery({
    queryKey: ["appointment", appointmentId],
    queryFn: () => getAppointment(appointmentId),
    enabled: !!appointmentId,
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients(),
  });

  const { data: pets } = useQuery({
    queryKey: ["pets", clientId],
    queryFn: () => clientId ? getPets() : Promise.resolve([]),
    enabled: !!clientId,
  });

  // Initialize form with appointment data
  useEffect(() => {
    if (appointment) {
      setClientId(appointment.clientId.toString());
      setPetId(appointment.petId.toString());
      const localDateTime = getLocalDateTimeParts(appointment.date);
      setDate(localDateTime.date);
      setTime(localDateTime.time);
      setDuration(appointment.duration?.toString() ?? "");
      setServiceType(appointment.serviceType ?? "");
      setNotes(appointment.notes ?? "");
    }
  }, [appointment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const updateData: any = {
        clientId: Number(clientId),
        petId: Number(petId),
        date: toIsoFromLocalDateTime(date, time),
        duration: Number(duration),
        serviceType: serviceType,
        notes: notes,
      };
      await updateAppointment(appointmentId, updateData);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointment", appointmentId] });
      router.push(`/workstation/user/citas/${appointmentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar la cita");
    } finally {
      setLoading(false);
    }
  };

  if (loadingAppointment) return <p className="text-center text-gray-500 py-8">Cargando cita...</p>;
  if (!appointment) return <p className="text-center text-gray-500 py-8">Cita no encontrada</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Editar Cita</h1>
        <a href={`/workstation/user/citas/${appointmentId}`} className="text-sm text-gray-600 hover:underline">
          ← Ver cita
        </a>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="clientSelect" className="text-sm font-medium">Seleccionar cliente *</label>
                <select
                  id="clientSelect"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  required
                >
                  <option value="">Seleccione un cliente...</option>
                  {clients?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {clientId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PawPrint className="h-5 w-5" />Mascota</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="petSelect" className="text-sm font-medium">Seleccionar mascota *</label>
                  <select
                    id="petSelect"
                    value={petId}
                    onChange={(e) => setPetId(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    required
                    disabled={!pets || pets.length === 0}
                  >
                    <option value="">Seleccione una mascota...</option>
                    {pets?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.species ? `(${p.species})` : ""} {p.breed ? `- ${p.breed}` : ""}
                      </option>
                    ))}
                  </select>
                  {!pets || pets.length === 0 ? (
                    <p className="text-sm text-gray-500 mt-2">
                      Este cliente no tiene mascotas registradas.{" "}
                      <a href={`/workstation/user/mascotas/nuevo?clientId=${clientId}`} className="text-blue-600 hover:underline">
                        Crear una nueva mascota
                      </a>
                    </p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Fecha y Hora</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="dateInput" className="text-sm font-medium">Fecha *</label>
              <input
                id="dateInput"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                required
                min={getLocalDateTimeParts(new Date().toISOString()).date}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="timeInput" className="text-sm font-medium">Hora *</label>
              <input
                id="timeInput"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Detalles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="durationInput" className="text-sm font-medium">Duración (min) *</label>
              <input
                id="durationInput"
                type="number"
                min="15"
                step="15"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                required
                placeholder="30"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="serviceInput" className="text-sm font-medium">Tipo de servicio</label>
              <input
                id="serviceInput"
                type="text"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Consulta general, vacunación, desparasitación..."
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="notesInput" className="text-sm font-medium">Notas</label>
              <textarea
                id="notesInput"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Observaciones adicionales..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Actualizar Cita"}
          </Button>
        </div>
      </form>
    </div>
  );
}
