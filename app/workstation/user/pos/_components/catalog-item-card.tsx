import { Info, Package, Plus, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Product } from "@/lib/api/products";
import type { Service } from "@/lib/api/services";

export type CatalogCardEntry =
  | { itemType: "product"; item: Product }
  | { itemType: "service"; item: Service };

type CatalogItemCardProps = {
  itemType: CatalogCardEntry["itemType"];
  item: CatalogCardEntry["item"];
  stock?: number;
  priceLabel: string;
  onShowInfo: (entry: CatalogCardEntry) => void;
  onAdd: (item: Product | Service, itemType: CatalogCardEntry["itemType"]) => void;
};

export function CatalogItemCard({
  itemType,
  item,
  stock,
  priceLabel,
  onShowInfo,
  onAdd,
}: CatalogItemCardProps) {
  const product = itemType === "product" ? (item as Product) : null;
  const service = itemType === "service" ? (item as Service) : null;
  const isVariablePrice = product?.priceType === "VARIABLE";
  const categoryName = (product?.category?.name ?? "").toLowerCase();
  const cardTheme = service
    ? {
        card: "border-violet-200 bg-violet-50/70 hover:border-violet-300",
        icon: "bg-violet-100 text-violet-700",
        action: "bg-violet-600 hover:bg-violet-700",
      }
    : categoryName.includes("alimento") || categoryName.includes("comida")
      ? {
          card: "border-amber-200 bg-amber-50/70 hover:border-amber-300",
          icon: "bg-amber-100 text-amber-700",
          action: "bg-amber-600 hover:bg-amber-700",
        }
      : categoryName.includes("juguete")
        ? {
            card: "border-violet-200 bg-violet-50/70 hover:border-violet-300",
            icon: "bg-violet-100 text-violet-700",
            action: "bg-violet-600 hover:bg-violet-700",
          }
        : {
            card: "border-teal-200 bg-teal-50/70 hover:border-teal-300",
            icon: "bg-teal-100 text-teal-700",
            action: "bg-teal-700 hover:bg-teal-800",
          };
  const infoEntry: CatalogCardEntry = service
    ? { itemType: "service", item: service }
    : { itemType: "product", item: product! };

  return (
    <Card
      className={`group transition hover:-translate-y-0.5 hover:shadow-md ${cardTheme.card}`}
    >
      <CardContent className="flex h-20 min-h-0 flex-col p-1.5 xl:h-16 xl:p-1">
        <div className="mb-1 flex items-start justify-between gap-1 xl:mb-0">
          <div
            className={`flex size-6 items-center justify-center rounded-md xl:size-5 ${cardTheme.icon}`}
          >
            {service ? <Stethoscope className="size-3" /> : <Package className="size-3" />}
          </div>
          <Badge className="px-1.5 py-0 text-[10px] font-medium" variant={service ? "info" : stock === 0 ? "destructive" : "success"}>
            {service
              ? "Servicio"
              : isVariablePrice
                ? "Precio variable"
                : stock === undefined
                  ? "Disponible"
                  : stock === 0
                    ? "Sin stock"
                    : `${stock} en stock`}
          </Badge>
        </div>
        <p className="line-clamp-1 text-[13px] font-semibold leading-tight text-slate-900 xl:text-xs">
          {item.name}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[11px] leading-tight text-slate-600 xl:hidden">
          {service?.description || product?.description || (service ? "Atención veterinaria" : "Producto para clínica")}
        </p>
        <div className="mt-auto flex items-center justify-between gap-1 pt-1 xl:pt-0">
          <span className="text-xs font-bold text-slate-900 xl:text-[11px]">
            {priceLabel}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="size-6 rounded-md border-slate-300 bg-white/70 p-0 text-slate-600 hover:bg-white xl:size-5"
              aria-label={`Ver información de ${item.name}`}
              title="Ver información"
              onClick={() => onShowInfo(infoEntry)}
            >
              <Info className="size-3" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              className={`size-6 rounded-md text-white shadow-sm xl:size-5 ${cardTheme.action}`}
              aria-label={`Agregar ${item.name}`}
              disabled={stock === 0 && !isVariablePrice}
              onClick={() => onAdd(item, itemType)}
            >
              <Plus className="size-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
