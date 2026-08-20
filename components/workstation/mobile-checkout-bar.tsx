"use client"

import { CreditCard, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatMoney, type Cents } from "@/lib/workstation/money"

interface MobileCheckoutBarProps {
  totalCents: Cents
  itemsCount: number
  loading?: boolean
  canCheckout: boolean
  onCheckout: () => void
}

export function MobileCheckoutBar(props: MobileCheckoutBarProps) {
  const { totalCents, itemsCount, loading = false, canCheckout, onCheckout } = props

  return (
    <div
      role="region"
      aria-label="Resumen de cobro"
      className="bg-background fixed inset-x-0 bottom-0 z-30 border-t shadow-[0_-4px_16px_rgba(0,0,0,0.04)] md:hidden"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3">
        <div className="flex flex-1 flex-col">
          <span className="text-muted-foreground text-xs">
            {itemsCount} {itemsCount === 1 ? "item" : "items"} a cobrar
          </span>
          <span className="text-base font-semibold tabular-nums">
            {formatMoney(totalCents)}
          </span>
        </div>
        <Button
          onClick={onCheckout}
          disabled={!canCheckout || loading}
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CreditCard className="size-3.5" />
          )}
          Finalizar
        </Button>
      </div>
    </div>
  )
}
