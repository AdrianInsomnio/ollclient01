"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import {
  addDiagnosis,
  addPrescription,
  addTreatment,
  getConsultation,
  updateConsultationClinical,
  type UpdateClinicalPayload,
} from "@/lib/api/consultations"
import { getPetHistory } from "@/lib/api/pets"
import { getProducts, type Product } from "@/lib/api/products"
import { getServices, type Service } from "@/lib/api/services"
import { createSale } from "@/lib/api/sales"

import {
  computeCartTotal,
  itemToSalePayload,
  newCartKey,
  type CartItem,
} from "@/lib/workstation/commerce-cart"
import {
  getMockSchedule,
  type ConsultationSchedule,
} from "@/lib/workstation/schedule.mock"
import { workspaceToast } from "@/lib/workstation/toast"

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
  MobileCheckoutBar,
  PetClientCard,
  type PaymentMethodOption,
} from "@/components/workstation"

const dateFormatter = new Intl.DateTimeFormat("es-UY", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

export default function VetConsultationDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const consultationId = params?.id ?? ""

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
    queryKey: ["products", "active"],
    queryFn: () => getProducts({ isActive: true }),
  })

  const servicesQuery = useQuery({
    queryKey: ["services", "active"],
    queryFn: () => getServices({ isActive: true }),
  })

  // Mock tipado de turno/profesional.
  const [schedule, setSchedule] = useState<ConsultationSchedule | null>(null)
  useEffect(() => {
    if (!consultationId) return
    let active = true
    void getMockSchedule(consultationId).then((s) => {
      if (active) setSchedule(s)
    })
    return () => {
      active = false
    }
  }, [consultationId])

  // Estado del carrito comercial.
  const [cart, setCart] = useState<CartItem[]>([])
  const [discountPercent, setDiscountPercent] = useState(0)
  const [saleNotes, setSaleNotes] = useState("")
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodOption>("CASH")
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)

  const consultation = consultationQuery.data
  const isClosed = consultation?.status === "CLOSED"

  // Mutaciones clinicas.
  const updateClinical = useMutation({
    mutationFn: (values: UpdateClinicalPayload) =>
      updateConsultationClinical(consultationId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["consultation", consultationId],
      })
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

  // Mutacion comercial.
  const checkout = useMutation({
    mutationFn: async () => {
      if (!consultation) throw new Error("Consulta no cargada")
      return createSale({
        clientId: consultation.clientId,
        petId: consultation.petId,
        consultationId: consultation.id,
        discount: discountPercent,
        paymentMethod,
        items: cart.map((item) => {
          const payload = itemToSalePayload(item)
          if (item.kind === "service") {
            return {
              itemType: payload.itemType,
              itemId: payload.itemId,
              quantity: payload.quantity,
              nameSnapshot: payload.nameSnapshot,
              priceSnapshot: payload.priceSnapshot,
            }
          }
          return {
            itemType: payload.itemType,
            itemId: payload.itemId,
            quantity: payload.quantity,
          }
        }),
        notes: saleNotes || undefined,
      })
    },
    onSuccess: (sale) => {
      queryClient.invalidateQueries({
        queryKey: ["consultation", consultationId],
      })
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      const consultationIdSafe = consultation!.id
      const saleId = sale?.id ?? consultationIdSafe
      workspaceToast.saleRegistered(
        saleId,
        totalCents,
        paymentMethod,
      )
      setCart([])
      setDiscountPercent(0)
      setSaleNotes("")
    },
    onError: (err) => workspaceToast.saleError(err),
  })

  // Hidratar carrito si la consulta ya tiene una venta asociada.
  useEffect(() => {
    if (!consultation) return
    if (cart.length > 0) return
    const existingSale = consultation.sales?.[0]
    if (!existingSale?.items || existingSale.items.length === 0) return
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

  // Total monetario en centavos enteros.
  const totalCents = useMemo(
    () => computeCartTotal(cart, discountPercent),
    [cart, discountPercent],
  )

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

  const canCheckout = cart.length > 0 && !isClosed && !checkout.isPending

  return (
    <div className="flex flex-col gap-4 pb-32 md:pb-6">
      <MedicalHeader
        title="Atencion medica"
        subtitle={`Consulta #${consultation.id}${
          consultation.appointmentId
            ? " - Turno #" + consultation.appointmentId
            : ""
        }`}
        status={status}
        scheduledLabel={
          schedule?.scheduledAt
            ? dateFormatter.format(new Date(schedule.scheduledAt))
            : undefined
        }
        professional={schedule?.professional}
        totalCents={totalCents}
        onPrint={
          consultation.sales && consultation.sales.length > 0
            ? () => workspaceToast.reprintPending()
            : undefined
        }
        onFinalize={() => setConfirmCloseOpen(true)}
      />

      <PetClientCard
        petName={petName}
        petSpecies={consultation.pet?.species}
        petBreed={consultation.pet?.breed}
        clientName={clientName}
        clientPhone={consultation.client?.phone}
        clientDocumentId={consultation.client?.documentId}
        historyCount={historyCount}
        onViewHistory={() => router.push("/workstation/vet/historial")}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
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

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <CommercePanel
            items={cart}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemoveItem}
            onClear={handleClearCart}
            discountPercent={discountPercent}
            onDiscountChange={setDiscountPercent}
            notes={saleNotes}
            onNotesChange={setSaleNotes}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            onAddItem={() => setItemDialogOpen(true)}
            loading={checkout.isPending}
            canCheckout={canCheckout}
            onCheckout={() => checkout.mutate()}
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

      <MobileCheckoutBar
        totalCents={totalCents}
        itemsCount={cart.length}
        loading={checkout.isPending}
        canCheckout={canCheckout}
        onCheckout={() => checkout.mutate()}
      />

      <Dialog
        open={confirmCloseOpen}
        onOpenChange={(next) => setConfirmCloseOpen(next)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar atencion</DialogTitle>
            <DialogDescription>
              {cart.length > 0
                ? "Hay items cargados sin cobrar. Cancela la venta o cobrala antes de finalizar."
                : isClosed
                ? "La consulta ya esta finalizada."
                : "Esta accion cierra la consulta. La atencion medica queda registrada independientemente del cobro. (Nota: el backend actual exige items para usar /close; este flujo quedara habilitado cuando se exponga el endpoint de cierre sin venta.)"}
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
                setConfirmCloseOpen(false)
                workspaceToast.finalizeWithoutSalePending()
              }}
              disabled={cart.length > 0 || isClosed}
            >
              Si, finalizar
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
