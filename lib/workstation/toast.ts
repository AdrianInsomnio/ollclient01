// Helper tipado de toasts para el workspace.
// Centraliza mensajes para no duplicar ni desincronizar.

import { toast } from "sonner"

import { formatMoney, type Cents } from "./money"
import type { PaymentMethodOption } from "@/components/workstation"

const paymentLabel: Record<PaymentMethodOption, string> = {
  CASH: "Efectivo",
  DEBIT_CARD: "Debito",
  CREDIT_CARD: "Credito",
  BANK_TRANSFER: "Transferencia",
  MERCADO_PAGO: "MercadoPago",
}

const errorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

const promiseFallback = (err: unknown, fallback: string): string => {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export const workspaceToast = {
  clinicalSaved: () =>
    toast.success("Cambios clinicos guardados"),
  clinicalError: (err: unknown) =>
    toast.error(errorMessage(err, "No se pudo guardar la consulta")),

  diagnosisAdded: () => toast.success("Diagnostico agregado"),
  treatmentAdded: () => toast.success("Tratamiento agregado"),
  prescriptionAdded: () => toast.success("Receta agregada"),
  clinicalEntryError: (err: unknown) =>
    toast.error(errorMessage(err, "No se pudo guardar el registro")),

  saleRegistered: (saleId: string | number, totalCents: Cents, method: PaymentMethodOption) =>
    toast.success(
      `Venta #${saleId} registrada (${paymentLabel[method]} - ${formatMoney(totalCents)})`,
    ),
  saleError: (err: unknown) =>
    toast.error(errorMessage(err, "No se pudo registrar la venta")),

  itemAdded: (name: string) =>
    toast.success(`${name} agregado a la venta`),
  cartCleared: () => toast.info("Venta vaciada"),

  fileAttached: (name: string) => toast.success(`Archivo "${name}" adjunto`),
  fileRemoved: () => toast.success("Archivo quitado"),
  fileError: (err: unknown) => toast.error(promiseFallback(err, "No se pudo adjuntar")),

  inquiryLoadError: () =>
    toast.error("No se pudo cargar la consulta"),

  reprintQueued: () => toast.info("Reimpresion enviada"),
  reprintPending: () =>
    toast.info("Reimpresion disponible proximamente"),

  finalizeWithoutSalePending: () =>
    toast.warning(
      "Cierre sin venta pendiente: requiere endpoint backend dedicado. Se registro solo el guardado clinico.",
    ),

  genericError: (msg: string) => toast.error(msg),
}

export const workspacePromiseToast = <T,>(
  pending: string,
  promise: Promise<T>,
  success: (value: T) => string,
  errorMessage: string,
): unknown =>
  toast.promise(promise, {
    loading: pending,
    success,
    error: errorMessage,
  })
