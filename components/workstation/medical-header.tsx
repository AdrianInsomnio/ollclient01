"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Loader2, Printer, Stethoscope } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { formatMoney, type Cents } from "@/lib/workstation/money"

export interface MedicalHeaderProps {
  title: string
  subtitle?: string
  /** Identificador legible (id/nombre) para subtitulo opcional. */
  badge?: string
  /** Estado de la consulta ("OPEN" | "CLOSED"). */
  status: "OPEN" | "CLOSED"
  /** Fecha/hora del turno. */
  scheduledLabel?: string
  /** Profesional. */
  professional?: string
  /** Finalizar consulta sin venta. */
  onFinalize?: () => void
  finalizing?: boolean
  /** Callback para imprimir comprobante. */
  onPrint?: () => void
  printing?: boolean
  /** Total a pagar visible en el header (mobile y desktop). */
  totalCents: Cents
  /** Href al cual volver. */
  backHref?: string
}

const statusStyles: Record<MedicalHeaderProps["status"], string> = {
  OPEN: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CLOSED: "bg-muted text-muted-foreground border-border",
}

const statusLabel: Record<MedicalHeaderProps["status"], string> = {
  OPEN: "En curso",
  CLOSED: "Finalizada",
}

export function MedicalHeader(props: MedicalHeaderProps) {
  const {
    title,
    subtitle,
    status,
    scheduledLabel,
    professional,
    onFinalize,
    finalizing = false,
    onPrint,
    printing = false,
    totalCents,
    backHref,
  } = props
  const router = useRouter()
  const isClosed = status === "CLOSED"

  return (
    <Card size="sm" className="overflow-visible">
      <CardContent className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="flex items-start gap-3 md:items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Volver"
            onClick={() => (backHref ? router.push(backHref) : router.back())}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex flex-col">
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Stethoscope className="size-3.5" />
              Atencion medica
            </span>
            <h1 className="text-base font-semibold leading-tight md:text-lg">
              {title}
            </h1>
            {subtitle ? (
              <span className="text-muted-foreground text-xs">{subtitle}</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {scheduledLabel ? (
            <div className="text-muted-foreground hidden text-right text-xs md:block">
              <div>Turno</div>
              <div className="text-foreground font-medium">{scheduledLabel}</div>
            </div>
          ) : null}
          {professional ? (
            <div className="text-muted-foreground hidden text-right text-xs md:block">
              <div>Profesional</div>
              <div className="text-foreground font-medium">{professional}</div>
            </div>
          ) : null}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
              statusStyles[status],
            )}
          >
            <CheckCircle2 className="size-3" aria-hidden />
            {statusLabel[status]}
          </span>
          {onPrint ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onPrint}
              disabled={printing}
              aria-label="Imprimir comprobante"
            >
              {printing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Printer className="size-3.5" />
              )}
              Imprimir
            </Button>
          ) : null}
          <div className="flex items-center gap-2 md:hidden" aria-label="Total">
            <span className="text-muted-foreground text-xs">Total</span>
            <span className="text-sm font-semibold">{formatMoney(totalCents)}</span>
          </div>
          {onFinalize ? (
            <Button
              onClick={onFinalize}
              disabled={finalizing || isClosed}
              size="sm"
              className="ml-auto md:ml-0"
            >
              {finalizing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              Finalizar atencion
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
