import { Minus, Package, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/api/products";
import type { Service } from "@/lib/api/services";

export type PosCartItem = {
  itemType: "product" | "service";
  item: Product | Service;
  quantity: number;
  unitPrice?: number;
};

type CartLineListProps = {
  items: PosCartItem[];
  formatMoney: (value: number) => string;
  onQuantityChange: (itemType: PosCartItem["itemType"], itemId: number, quantity: number) => void;
};

export function CartLineList({ items, formatMoney, onQuantityChange }: CartLineListProps) {
  return (
    <div className="space-y-2">
      {items.map((entry) => (
        <div key={`${entry.itemType}-${entry.item.id}-${entry.unitPrice ?? "base"}`} className="rounded-xl border border-slate-100 bg-slate-50/70 p-2">
          <div className="flex gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700"><Package className="size-4" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-sm font-semibold leading-tight text-slate-800">{entry.item.name}</p>
                <button type="button" aria-label={`Quitar ${entry.item.name}`} className="text-slate-400 hover:text-red-600" onClick={() => onQuantityChange(entry.itemType, entry.item.id, 0)}><X className="size-4" /></button>
              </div>
              <p className="text-[11px] text-slate-500">{formatMoney(Number(entry.unitPrice ?? entry.item.price))} c/u · {entry.itemType === "service" ? "Servicio" : "Producto"}</p>
              <div className="mt-1 flex items-center justify-between">
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
                  <Button variant="ghost" size="icon-sm" className="size-6" aria-label={`Reducir ${entry.item.name}`} onClick={() => onQuantityChange(entry.itemType, entry.item.id, entry.quantity - 1)}><Minus className="size-3" /></Button>
                  <span className="w-6 text-center text-xs font-semibold">{entry.quantity}</span>
                  <Button variant="ghost" size="icon-sm" className="size-6" aria-label={`Aumentar ${entry.item.name}`} onClick={() => onQuantityChange(entry.itemType, entry.item.id, entry.quantity + 1)}><Plus className="size-3" /></Button>
                </div>
                <span className="text-sm font-bold text-slate-900">{formatMoney(Number(entry.unitPrice ?? entry.item.price) * entry.quantity)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
