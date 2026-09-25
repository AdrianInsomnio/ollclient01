"use client"

import {
  Loader2,
  Minus,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
  Trash2,
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

export interface CommercePanelProps {
  items: readonly CartItem[]
  onQuantityChange: (key: string, quantity: number) => void
  onRemove: (key: string) => void
  onClear: () => void
  discountPercent: number
  onDiscountChange: (percent: number) => void
  notes: string
  onNotesChange: (notes: string) => void
  onAddItem: () => void
  loading?: boolean
    /** Botón deshabilitado si la atención ya está cerrada o finalizando. */
  canCheckout: boolean
  onCheckout: () => void
    /** Callback que finaliza la atención y deja la cuenta pendiente. */
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
      <Card className="gap-3 xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:overflow-hidden">
        <CardHeader className="pb-0 xl:shrink-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="size-4" /> Resumen de venta
        </CardTitle>
        <p className="text-muted-foreground text-xs">
            Cuenta vinculada a esta atención. El cobro queda pendiente para recepción.
        </p>
      </CardHeader>
        <CardContent className="flex flex-col gap-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain">
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
                Agregue productos o servicios. Al finalizar, se agregarán a la cuenta pendiente de recepción.
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
          <Label htmlFor="discount" className="text-xs">Descuento general (%)</Label>
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

          <Button
            onClick={onFinalizeWithoutSale ?? onCheckout}
            disabled={!canCheckout || loading || finalizingWithoutSale}
            className="w-full"
          >
            {loading || finalizingWithoutSale ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Receipt className="size-3.5" />
            )}
            {finalizingWithoutSale ? "Finalizando atención..." : "Finalizar atención"}
          </Button>

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
