"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, FileText, PawPrint, Users } from "lucide-react";
import { openConsultation } from "@/lib/api/consultations";
import { getMyOpenCashShift } from "@/lib/api/cash";

export default function NewConsultationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [petId, setPetId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data: cashShift, isLoading: cashShiftLoading } = useQuery({
    queryKey: ["my-open-cash-shift"],
    queryFn: getMyOpenCashShift,
    staleTime: 30_000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
      setError(null);
      try {
        if (!cashShift) throw new Error("Abre un turno de caja antes de iniciar la atención.");
        const consultation = await openConsultation({
        clientId: Number(clientId),
        petId: Number(petId),
          notes,
          cashShiftId: cashShift.id,
      });
      router.push(`/workstation/user/consultas/${consultation.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear consulta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => router.back()}>
          Volver
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Cliente</label>
          <Input
            type="number"
            placeholder="ID del cliente"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Mascota</label>
          <Input
            type="number"
            placeholder="ID de la mascota"
            value={petId}
            onChange={(e) => setPetId(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Notas iniciales
          </label>
          <Textarea
            placeholder="Síntomas, motivo de consulta..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </div>
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}
        {!cashShiftLoading && !cashShift && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Abre un turno de caja para crear la cuenta en espera de esta atención.</p>}
        <Button type="submit" disabled={loading || cashShiftLoading || !cashShift} className="w-full">
          {loading ? "Creando..." : "Crear Consulta"}
        </Button>
      </form>
    </div>
  );
}
