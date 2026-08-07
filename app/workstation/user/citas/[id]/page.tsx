"use client";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAppointment } from "@/lib/api/appointments";
import { openConsultation } from "@/lib/api/consultations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, User, PawPrint, Clock, DollarSign, Check, X } from "lucide-react";

export default function CitaDetallePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const citaId = params.id as string;

  const { data: cita, isLoading } = useQuery({
    queryKey: ["cita", citaId],
    queryFn: () => getAppointment(citaId),
    enabled: !!citaId,
  });

  const openMutation = useMutation({
    mutationFn: () => openConsultation({
      clientId: Number(cita?.clientId),
      petId: Number(cita?.petId),
    }),
    onSuccess: (data) => {
      // Invalidate queries to refetch consultations list if needed
      queryClient.invalidateQueries({ queryKey: ["consultations-open"] });
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
      // Navigate to the newly created consultation detail page
      router.push(`/workstation/user/consultas/${data.id}`);
    },
    onError: (err) => {
      alert("Error al crear la consulta: " + (err instanceof Error ? err.message : String(err)));
    },
  });

  if (isLoading) return <p className="text-center text-gray-500 py-8">Cargando...</p>;
  if (!cita) return <p className="text-center text-gray-500 py-8">Cita no encontrada</p>;

  const fecha = new Date(cita.date);
  const fechaFormateada = fecha.toLocaleDateString("es-UY");
  const horaFormateada = fecha.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/workstation/user/citas" className="inline-flex">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Volver a Citas</Button>
        </Link>
        <Button
          onClick={() => openMutation.mutate()}
          disabled={openMutation.isPending}
        >
          {openMutation.isPending ? "Creando consulta..." : "Abrir Consulta"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cita #{cita.id}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Fecha</p>
              <p className="text-xl font-bold">{fechaFormateada} {horaFormateada}</p>
            </div>
          </div>

          <div className="divide-y">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium">{cita.client?.name ?? `Cliente #${cita.clientId}`}</p>
                  <p className="text-sm text-gray-500">{(cita.client as { phone?: string } | undefined)?.phone ?? ""}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                Cliente
              </span>
            </div>

            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <PawPrint className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">{cita.pet?.name ?? `Mascota #${cita.petId}`}</p>
                  <p className="text-sm text-gray-500">
                    {cita.pet?.species ?? ""} {((cita.pet as { breed?: string } | undefined)?.breed) ? `- ${(cita.pet as { breed?: string }).breed}` : ""}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                Mascota
              </span>
            </div>

            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm text-gray-500">Duración</p>
                <p className="font-bold">{cita.duration} min</p>
              </div>
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                Duración
              </span>
            </div>

            {cita.serviceType && (
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm text-gray-500">Tipo de servicio</p>
                  <p className="font-medium">{cita.serviceType}</p>
                </div>
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                  Servicio
                </span>
              </div>
            )}

            {cita.notes && (
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm text-gray-500">Notas</p>
                  <p className="font-medium">{cita.notes}</p>
                </div>
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                  Notas
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
