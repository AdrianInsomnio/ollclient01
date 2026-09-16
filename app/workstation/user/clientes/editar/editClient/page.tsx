"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { getClient } from "@/lib/api/clients";
import { ClientForm } from "@/components/clients/client-form";

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const { data, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => getClient(clientId),
    enabled: !!clientId,
  });

  if (isLoading) {
    return <p className="text-center text-gray-500 py-8">Cargando...</p>;
  }

  if (!data) {
    return (
      <p className="text-center text-gray-500 py-8">Cliente no encontrado</p>
    );
  }

  return (
    <div className="space-y-6">
      <ClientForm
        client={data}
        onSuccess={() => router.push("/workstation/user/clientes/" + clientId)}
      />
    </div>
  );
}
