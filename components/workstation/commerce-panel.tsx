"use client"

import {
  CreditCard,
  Loader2,
  Minus,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
  Trash2,
  Wallet,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Textarea } from "@/components/ui/textarea"

import { formatMoney, type Cents } from "@/lib/workstation/money"
import {
  
  computeCartDiscount,
  computeCartSubtotal,
  computeCartTotal,
  computeLineSubtotal,
  
  type CartItem,
} from "@/lib/workstation/commerce-cart"

export type PaymentMethodOption = "CASH" | "DEBIT_CARD" | "CREDIT_CARD" | "BANK_TRANSFER" | "MERCADO_PAGO"

const paymentOptions: { value: PaymentMethodOption; label: string; icon: typeof Wallet }[] = [
  { value: "CASH", label: "Efectivo", icon: Wallet },
  { value: "DEBIT_CARD", label: "Debito", icon: CreditCard },
  { value: "CREDIT_CARD", label: "Credito", icon: CreditCard },
  { value: "BANK_TRANSFER", label: "Transferencia", icon: CreditCard },
  { value: "MERCADO_PAGO", label: "MercadoPago", icon: CreditCard },
]

export interface CommercePanelProps {
  items: readonly CartItem[]
  onQuantityChange: (key: string, quantity: number) => void
  onRemove: (key: string) => void
  onClear: () => void
  discountPercent: number
  onDiscountChange: (percent: number) => void
  notes: string
  onNotesChange: (notes: string) => void
  paymentMethod: PaymentMethodOption
  onPaymentMethodChange: (method: PaymentMethodOption) => void
  onAddItem: () => void
  loading?: boolean
  /** Boton deshabilitado si la consulta esta cerrada o el carrito esta vacio. */
  canCheckout: boolean
  onCheckout: () => void
  /** Callback que ejecuta la accion "Finalizar atencion" (sin venta). */
  onFinalizeWithoutSale?: () => void
  finalizingWithoutSale?: boolean
}

export function CommercePanel(props: CommercePanelProps) {
  const {
    items,
    onQuantityChange,
    onRemove,
    onClear,
    discountPercent,
    onDiscountChange,
    notes,
    onNotesChange,
    paymentMethod,
    onPaymentMethodChange,
    onAddItem,
    loading = false,
    canCheckout,
    onCheckout,
    onFinalizeWithoutSale,
    finalizingWithoutSale = false,
  } = props

  const subtotalCents: Cents = computeCartSubtotal(items)
  const discountCents: Cents = computeCartDiscount(items, discountPercent)
  const totalCents: Cents = computeCartTotal(items, discountPercent)

  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="size-4" /> Resumen de venta
        </CardTitle>
        <p className="text-muted-foreground text-xs">
          Fuente de verdad comercial: Sale + SaleItem. Independiente
          de la atencion medica.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs">Items</span>
          <Button size="sm" variant="outline" onClick={onAddItem}>
            <Plus className="size-3.5" /> Agregar
          </Button>
        </div>

        {items.length === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <ShoppingCart />
            </EmptyMedia>
            <EmptyTitle>Sin items</EmptyTitle>
            <EmptyDescription>
              Agregue productos o servicios para generar una venta.
              Puede finalizar la consulta sin venta.
            </EmptyDescription>
          </Empty>
        ) : (
          <ul className="divide-y">
            {items.map((item) => {
              const lineSubtotal = computeLineSubtotal(item)
              const isService = item.kind === "service"
              return (
                <li
                  key={item.key}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 truncate font-medium" title={item.name}>
                      {isService ? (
                        <Receipt className="text-muted-foreground size-3.5 shrink-0" />
                      ) : (
                        <Package className="text-muted-foreground size-3.5 shrink-0" />
                      )}
                      <span className="truncate">{item.name}</span>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {formatMoney(item.unitPriceCents)} c/u
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() =>
                        onQuantityChange(item.key, Math.max(1, item.quantity - 1))
                      }
                      aria-label="Restar uno"
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => onQuantityChange(item.key, item.quantity + 1)}
                      aria-label="Sumar uno"
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                  <span className="w-20 text-right text-sm font-medium tabular-nums">
                    {formatMoney(lineSubtotal)}
                  </span>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => onRemove(item.key)}
                    aria-label="Quitar item"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}

        {items.length > 0 ? (
          <Button variant="link" size="xs" onClick={onClear} className="self-end">
            Vaciar carrito
          </Button>
        ) : null}

        <Separator />

        <div className="space-y-1.5">
          <Label htmlFor="discount" className="text-xs">Descuento (%)</Label>
          <Input
            id="discount"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={Number.isFinite(discountPercent) ? discountPercent : 0}
            onChange={(event) => {
              const next = Number(event.target.value)
              onDiscountChange(Number.isFinite(next) ? next : 0)
            }}
            disabled={items.length === 0}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sale-notes" className="text-xs">Notas de venta</Label>
          <Textarea
            id="sale-notes"
            rows={2}
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Observaciones para el ticket"
            disabled={items.length === 0}
          />
        </div>

        <Separator />

        <dl className="space-y-1 text-sm">
          <Row label="Subtotal" value={formatMoney(subtotalCents)} />
          <Row label="Descuento" value={`-${formatMoney(discountCents)}`} />
          <Row
            label="Total"
            value={formatMoney(totalCents)}
            strong
          />
        </dl>

        <div className="space-y-1.5">
          <Label className="text-xs">Metodo de pago</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {paymentOptions.map((option) => {
              const Icon = option.icon
              const active = paymentMethod === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onPaymentMethodChange(option.value)}
                  className={
                    "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors " +
                    (active
                      ? "border-primary bg-primary/5 text-foreground"
                      : "text-muted-foreground hover:text-foreground")
                  }
                  aria-pressed={active}
                >
                  <Icon className="size-3.5" /> {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <Button
          onClick={onCheckout}
          disabled={!canCheckout || loading}
          className="w-full"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CreditCard className="size-3.5" />
          )}
          Cobrar venta
        </Button>

        {onFinalizeWithoutSale ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onFinalizeWithoutSale}
            disabled={finalizingWithoutSale || items.length > 0}
            className="w-full"
          >
            {finalizingWithoutSale ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            Finalizar consulta sin venta
          </Button>
        ) : null}

      </CardContent>
    </Card>
  )
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={strong ? "text-foreground font-semibold" : "text-muted-foreground"}>
        {label}
      </dt>
      <dd className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>
        {value}
      </dd>
    </div>
  )
}
