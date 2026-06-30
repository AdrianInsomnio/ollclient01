import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAppointments } from "@/lib/api/appointments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus, Trash2, CheckCircle, XCircle } from "lucide-react";

export default function CitasPage() {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => getAppointments(),
  });

  if (isLoading) return <p className="text-center text-gray-500 py-8">Cargando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Citas</h1>
        <Link href="/workstation/user/citas/nuevo">
          <Button><Plus className="h-4 w-4 mr-2" />Nueva Cita</Button>
        </Link>
      </div>

      {appointments?.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No hay citas programadas</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Próximas Citas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y">
              {appointments.map((appt) => (
                <Link
                  key={appt.id}
                  href={`/workstation/user/citas/${appt.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="font-bold text-blue-600">{new Date(appt.date).toLocaleDateString("es-UY")}</span>
                    </div>
                    <div>
                      <p className="font-medium">{appt.client?.name ?? `Cliente #${appt.clientId}`}</p>
                      <p className="text-sm text-gray-500">
                        {appt.pet?.name ?? `Mascota #${appt.petId}`} {appt.pet?.species ? `(${appt.pet.species})` : ""}
                      </p>
                      <p className="text-sm text-gray-500">
                        {appt.date.slice(11, 16)} - {appt.duration} min
                      </p>
                      {appt.serviceType && <span className="bg-gray-200 text-xs px-2 py-1 rounded">{appt.serviceType}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        appt.status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : appt.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : appt.status === "completed"
                          ? "bg-blue-100 text-blue-800"
                          : appt.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {appt.status}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { /* TODO: implement delete */ }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
