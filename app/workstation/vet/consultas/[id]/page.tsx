"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  addDiagnosis,
  addPrescription,
  addTreatment,
  closeConsultation,
  getConsultation,
  updateConsultationClinical,
  type UpdateClinicalPayload,
} from "@/lib/api/consultations"
import { getPetHistory } from "@/lib/api/pets"
import { getProducts, type Product } from "@/lib/api/products"
import { getServices, type Service } from "@/lib/api/services"
import { updateSale } from "@/lib/api/sales"

import {
  itemToSalePayload,
  newCartKey,
  type CartItem,
} from "@/lib/workstation/commerce-cart"
import { workspaceToast } from "@/lib/workstation/toast"
import { useAuthStore } from "@/lib/auth-store"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  AddItemDialog,
  CommercePanel,
  ConsultationTabs,
  MedicalHeader,
  PetClientCard,
} from "@/components/workstation"

export default function VetConsultationDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const consultationId = params?.id ?? ""
  const tenantId = useAuthStore((state) => state.tenantId ?? "unknown")

  // Datos clinicos.
  const consultationQuery = useQuery({
    queryKey: ["consultation", consultationId],
    queryFn: () => getConsultation(consultationId),
    enabled: !!consultationId,
  })

  const petHistoryQuery = useQuery({
    queryKey: ["pet-history", consultationQuery.data?.petId],
    queryFn: () => getPetHistory(String(consultationQuery.data?.petId ?? "")),
    enabled: !!consultationQuery.data?.petId,
  })

  // Catalogo comercial.
  const productsQuery = useQuery({
    queryKey: ["products", "active", tenantId],
    queryFn: () => getProducts({ isActive: true }),
  })

  const servicesQuery = useQuery({
    queryKey: ["services", "active", tenantId],
    queryFn: () => getServices({ isActive: true }),
  })

  // Estado del carrito comercial.
  const [cart, setCart] = useState<CartItem[]>([])
  const [discountPercent, setDiscountPercent] = useState(0)
  const [saleNotes, setSaleNotes] = useState("")
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const consultation = consultationQuery.data
  const isClosed = consultation?.status === "CLOSED"

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!consultation) throw new Error("Consulta no cargada")
      const waitingSale = consultation.sales?.find((sale) => sale.status === "WAITING")
      if (cart.length > 0) {
        if (!waitingSale) {
          throw new Error("Esta atención no tiene una cuenta en espera vinculada. Solicite a recepción que la cree.")
        }
        await updateSale(String(waitingSale.id), {
          keepWaiting: true,
          discount: discountPercent,
          notes: saleNotes || undefined,
          items: cart.map((item) => {
            const payload = itemToSalePayload(item)
            return {
              itemType: payload.itemType,
              itemId: payload.itemId,
              quantity: payload.quantity,
              ...(item.kind === "service"
                ? { nameSnapshot: payload.nameSnapshot, priceSnapshot: payload.priceSnapshot }
                : {}),
            }
          }),
        })
      }
      return closeConsultation(consultationId, { items: [], discount: 0 })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["consultation", consultationId],
      })
      await queryClient.invalidateQueries({ queryKey: ["consultations"] })
      await queryClient.invalidateQueries({ queryKey: ["consultations-open"] })
      await queryClient.invalidateQueries({ queryKey: ["my-consultations"] })
      await queryClient.invalidateQueries({ queryKey: ["sales"] })
      await queryClient.invalidateQueries({ queryKey: ["waiting-sales"] })
        if (consultationQuery.data?.petId != null) {
          await queryClient.invalidateQueries({
            queryKey: ["pet-history", tenantId, consultationQuery.data.petId],
          })
        }
      setConfirmCloseOpen(false)
      setCart([])
      setDiscountPercent(0)
      setSaleNotes("")
        toast.success("Atención finalizada. La cuenta sigue en espera para recepción.")
    },
    onError: (err) => workspaceToast.clinicalError(err),
  })

  // Mutaciones clinicas.
  const updateClinical = useMutation({
    mutationFn: (values: UpdateClinicalPayload) =>
      updateConsultationClinical(consultationId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["consultation", consultationId],
      })
      queryClient.invalidateQueries({ queryKey: ["consultations-open"] })
      if (consultationQuery.data?.petId != null) {
        queryClient.invalidateQueries({
          queryKey: ["pet-history", tenantId, consultationQuery.data.petId],
        })
      }
      workspaceToast.clinicalSaved()
    },
    onError: (err) => workspaceToast.clinicalError(err),
  })

  const addEntry = useMutation({
    mutationFn: async ({
      kind,
      description,
    }: {
      kind: "diagnosis" | "treatment" | "prescription"
      description: string
    }) => {
      if (kind === "diagnosis") return addDiagnosis(consultationId, description)
      if (kind === "treatment") return addTreatment(consultationId, description)
      return addPrescription(consultationId, description)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["consultation", consultationId],
      })
      if (consultationQuery.data?.petId != null) {
        queryClient.invalidateQueries({
          queryKey: ["pet-history", tenantId, consultationQuery.data.petId],
        })
      }
      if (variables.kind === "diagnosis") {
        workspaceToast.diagnosisAdded()
      } else if (variables.kind === "treatment") {
        workspaceToast.treatmentAdded()
      } else {
        workspaceToast.prescriptionAdded()
      }
    },
    onError: (err) => workspaceToast.clinicalEntryError(err),
  })

  // Hidratar carrito si la consulta ya tiene una venta asociada.
  useEffect(() => {
    if (!consultation) return
  const existingSale = consultation.sales?.find((sale) => sale.status === "WAITING") ?? consultation.sales?.[0]
    if (!existingSale) return
    if (cart.length === 0 && existingSale.items?.length) {
      setCart(
        existingSale.items.map((it) => ({
          key: newCartKey(),
          kind: it.itemType,
          itemId: it.itemId,
          name: it.nameSnapshot,
          unitPriceCents: toCents((it.priceSnapshot ?? 0) as number),
          quantity: it.quantity,
        })),
      )
    }
    if (Number(existingSale.subtotal) > 0) {
      setDiscountPercent(Number(((Number(existingSale.discount) / Number(existingSale.subtotal)) * 100).toFixed(2)))
    }
    setSaleNotes(existingSale.notes ?? "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultation?.id])

  // Acciones del carrito comercial.
  const handleAddItem = (item: CartItem) => {
    setCart((current) => {
      const existing = current.find(
        (entry) => entry.kind === item.kind && entry.itemId === item.itemId,
      )
      if (existing) {
        return current.map((entry) =>
          entry.key === existing.key
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry,
        )
      }
      return [...current, { ...item, quantity: Math.max(1, item.quantity) }]
    })
    workspaceToast.itemAdded(item.name)
  }

  const handleQuantityChange = (key: string, quantity: number) => {
    setCart((current) =>
      current.map((entry) =>
        entry.key === key ? { ...entry, quantity } : entry,
      ),
    )
  }

  const handleRemoveItem = (key: string) => {
    setCart((current) => current.filter((entry) => entry.key !== key))
  }

  const handleClearCart = () => {
    setCart([])
    setDiscountPercent(0)
    setSaleNotes("")
    workspaceToast.cartCleared()
  }

  const historyCount = (petHistoryQuery.data?.consultations ?? []).length

  if (consultationQuery.isLoading) {
    return (
      <div
        role="status"
        aria-label="Cargando consulta"
        className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm"
      >
        <Loader2 className="size-4 animate-spin" /> Cargando consulta
      </div>
    )
  }

  if (consultationQuery.isError) {
    return (
      <div className="text-destructive py-12 text-center text-sm">
        No se pudo cargar la consulta.
      </div>
    )
  }

  if (!consultation) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        Consulta no encontrada
      </div>
    )
  }

  const petName = consultation.pet?.name ?? `Mascota #${consultation.petId}`
  const clientName =
    consultation.client?.name ?? `Cliente #${consultation.clientId}`
  const status: "OPEN" | "CLOSED" =
    consultation.status === "CLOSED" ? "CLOSED" : "OPEN"

  const canCheckout = !isClosed && !closeMutation.isPending

      return (
        <div className="pb-32 md:pb-6">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-stretch">
            <section className="flex min-w-0 flex-col gap-4">
              <MedicalHeader
                title={`Consulta #${consultation.id}`}
                subtitle={consultation.appointmentId ? `Turno #${consultation.appointmentId}` : undefined}
                status={status}
                onPrint={
                  consultation.sales && consultation.sales.length > 0
                    ? () => workspaceToast.reprintPending()
                    : undefined
                }
              >
                <PetClientCard
                  embedded
                  petName={petName}
                  petSpecies={consultation.pet?.species}
                  petBreed={consultation.pet?.breed}
                  clientName={clientName}
                  clientPhone={consultation.client?.phone}
                  clientDocumentId={consultation.client?.documentId}
                  historyCount={historyCount}
                  onViewHistory={() => router.push("/workstation/vet/historial")}
                />
              </MedicalHeader>

              <ConsultationTabs
                consultationId={String(consultation.id)}
          form={{
            initialValues: {
              weight: consultation.weight,
              temperature: consultation.temperature,
              // El detalle de diagnosticos / tratamientos vive en las
              // relaciones (tabs dedicadas); las columnas `diagnosis` /
              // `treatment` no existen en el schema, solo se persisten
              // `symptoms` y `notes`.
              symptoms: consultation.symptoms ?? undefined,
              notes: consultation.notes ?? undefined,
            },
            disabled: isClosed,
            saving: updateClinical.isPending,
            onSave: (values) => updateClinical.mutate(values),
          }}
          diagnoses={consultation.diagnoses ?? []}
          treatments={consultation.treatments ?? []}
          prescriptions={consultation.prescriptions ?? []}
          onAddDiagnosis={async (description) => {
            await addEntry.mutateAsync({ kind: "diagnosis", description })
          }}
          onAddTreatment={async (description) => {
            await addEntry.mutateAsync({ kind: "treatment", description })
          }}
          onAddPrescription={async (description) => {
            await addEntry.mutateAsync({ kind: "prescription", description })
          }}
              />
          </section>
  
          <aside className="min-w-0 xl:sticky xl:top-4 xl:h-[calc(100dvh-7rem)] xl:min-h-0">
          <CommercePanel
            items={cart}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemoveItem}
            onClear={handleClearCart}
            discountPercent={discountPercent}
            onDiscountChange={setDiscountPercent}
            notes={saleNotes}
            onNotesChange={setSaleNotes}
            onAddItem={() => setItemDialogOpen(true)}
            loading={closeMutation.isPending}
            canCheckout={canCheckout}
            onCheckout={() => setConfirmCloseOpen(true)}
            onFinalizeWithoutSale={() => setConfirmCloseOpen(true)}
            finalizingWithoutSale={closeMutation.isPending}
          />
            </aside>
        </div>
  
        <AddItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        products={(productsQuery.data ?? []) as Product[]}
        services={(servicesQuery.data ?? []) as Service[]}
        loadingProducts={productsQuery.isLoading}
        loadingServices={servicesQuery.isLoading}
        onAdd={handleAddItem}
      />

      <Dialog
        open={confirmCloseOpen}
        onOpenChange={(next) => setConfirmCloseOpen(next)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar atencion</DialogTitle>
            <DialogDescription>
              {isClosed
                ? "La consulta ya esta finalizada."
                : cart.length > 0
                  ? "Los items clínicos se guardarán en la cuenta pendiente de esta atención. Recepción podrá cobrarla después."
                  : "La atención se finalizará y la cuenta de recepción seguirá pendiente de cobro."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmCloseOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                closeMutation.mutate()
              }}
              disabled={isClosed || closeMutation.isPending}
            >
              {closeMutation.isPending ? "Finalizando..." : "Sí, finalizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Import dinamico al final para mantener el archivo simple y evitar
// conflicto de orden con el hook que usa `totalCents` antes del
// `useMemo`. (esbuild/Next resuelven este modulo igual).
import { toCents } from "@/lib/workstation/money"
