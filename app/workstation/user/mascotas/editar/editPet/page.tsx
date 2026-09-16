"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { getPet } from "@/lib/api/pets";
import { PetForm } from "@/components/pets/pet-form";

export default function EditPetPage() {
  const params = useParams();
  const router = useRouter();
  const petId = params.id as string;
  const { data, isLoading } = useQuery({
    queryKey: ["pet", petId],
    queryFn: () => getPet(petId),
    enabled: !!petId,
  });

  if (isLoading) {
    return <p className="text-center text-gray-500 py-8">Cargando...</p>;
  }

  if (!data) {
    return (
      <p className="text-center text-gray-500 py-8">Mascota no encontrada</p>
    );
  }

  return (
    <div className="space-y-6">
      <PetForm
        pet={data}
        onSuccess={() => router.push("/workstation/user/mascotas/" + petId)}
      />
    </div>
  );
}
