"use client"

import { useMemo, useState } from "react"
import { Loader2, Package, Plus, Search, Stethoscope } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import type { Product } from "@/lib/api/products"
import type { Service } from "@/lib/api/services"
import { formatMoney, toCentsSafe } from "@/lib/workstation/money"
import {
  newCartKey,
  type CartItem,
  type CartItemKind,
} from "@/lib/workstation/commerce-cart"

type CatalogItem = {
  kind: CartItemKind
  id: number
  name: string
  priceCents: ReturnType<typeof toCentsSafe>
}

interface AddItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: readonly Product[]
  services: readonly Service[]
  loadingProducts?: boolean
  loadingServices?: boolean
  onAdd: (item: CartItem) => void
}

export function AddItemDialog(props: AddItemDialogProps) {
  const {
    open,
    onOpenChange,
    products,
    services,
    loadingProducts = false,
    loadingServices = false,
    onAdd,
  } = props

  const [tab, setTab] = useState<"productos" | "servicios">("productos")
  const [search, setSearch] = useState("")

  const productCatalog = useMemo<CatalogItem[]>(
    () =>
      products.map((p) => ({
        kind: "product",
        id: p.id,
        name: p.name,
        priceCents: toCentsSafe(p.price),
      })),
    [products],
  )

  const serviceCatalog = useMemo<CatalogItem[]>(
    () =>
      services.map((s) => ({
        kind: "service",
        id: s.id,
        name: s.name,
        priceCents: toCentsSafe(s.price),
      })),
    [services],
  )

  const list = tab === "productos" ? productCatalog : serviceCatalog
  const loading = tab === "productos" ? loadingProducts : loadingServices

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return list
    return list.filter((item) => item.name.toLowerCase().includes(term))
  }, [list, search])

  const handleAdd = (item: CatalogItem) => {
    onAdd({
      key: newCartKey(),
      kind: item.kind,
      itemId: item.id,
      name: item.name,
      unitPriceCents: item.priceCents,
      quantity: 1,
    })
    onOpenChange(false)
    setSearch("")
  }

  const isLoading = loading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar item a la venta</DialogTitle>
          <DialogDescription>
            Busque un producto del catalogo o un servicio comercial.
            Esta operacion no impacta la atencion medica.
          </DialogDescription>
        </DialogHeader>

        <div className="border-input bg-muted/40 flex h-9 w-full rounded-lg p-1">
          <button
            type="button"
            onClick={() => setTab("productos")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors",
              tab === "productos"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Package className="size-3.5" /> Productos
          </button>
          <button
            type="button"
            onClick={() => setTab("servicios")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors",
              tab === "servicios"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Stethoscope className="size-3.5" /> Servicios
          </button>
        </div>

        <InputGroup>
          <InputGroupAddon align="inline-start">
            <Search className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Buscar por nombre"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Buscar item"
          />
        </InputGroup>

        <div className="max-h-72 overflow-y-auto rounded-lg border">
          {isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 px-4 py-6 text-sm">
              <Loader2 className="size-3.5 animate-spin" /> Cargando catalogo
            </div>
          ) : filtered.length === 0 ? (
            <Empty className="border-0 shadow-none">
              <EmptyMedia variant="icon">
                <Package />
              </EmptyMedia>
              <EmptyTitle>Sin resultados</EmptyTitle>
              <EmptyDescription>
                No hay {tab === "productos" ? "productos" : "servicios"} que
                coincidan con la busqueda.
              </EmptyDescription>
            </Empty>
          ) : (
            <ul className="divide-y">
              {filtered.map((item) => (
                <li
                  key={`${item.kind}-${item.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium" title={item.name}>
                      {item.name}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {formatMoney(item.priceCents)}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAdd(item)}
                    aria-label={`Agregar ${item.name}`}
                  >
                    <Plus className="size-3.5" /> Agregar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Tip</Label>
          <p className="text-muted-foreground text-xs">
            La atencion medica y la venta comercial son conceptos
            independientes: una consulta puede cerrarse sin venta.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
