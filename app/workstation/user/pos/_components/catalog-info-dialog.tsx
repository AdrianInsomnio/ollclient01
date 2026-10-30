import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CatalogCardEntry } from "./catalog-item-card";

type CatalogInfoDialogProps = {
  item: CatalogCardEntry | null;
  formatMoney: (value: number) => string;
  onClose: () => void;
};

export function CatalogInfoDialog({ item, formatMoney, onClose }: CatalogInfoDialogProps) {
  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-2"><Info className="size-5 text-teal-700" />Información del artículo</DialogTitle><DialogDescription>Consulta los datos del artículo antes de agregarlo al ticket.</DialogDescription></DialogHeader>
      {item && <div className="space-y-3"><div className="rounded-xl bg-slate-50 p-3"><p className="font-semibold text-slate-900">{item.item.name}</p><p className="mt-1 text-sm text-slate-500">{item.item.description || "Sin descripción disponible."}</p></div><div className="grid gap-2 text-sm sm:grid-cols-2"><div className="rounded-lg border border-slate-200 p-2.5"><span className="block text-xs text-slate-500">Precio</span><strong className="text-slate-900">{item.itemType === "product" && item.item.priceType === "VARIABLE" ? "Importe variable" : formatMoney(Number(item.item.price))}</strong></div><div className="rounded-lg border border-slate-200 p-2.5"><span className="block text-xs text-slate-500">Categoría</span><strong className="text-slate-900">{item.itemType === "product" ? item.item.category?.name || "Sin categoría" : item.item.category || "Servicio"}</strong></div>{item.itemType === "product" ? <><div className="rounded-lg border border-slate-200 p-2.5"><span className="block text-xs text-slate-500">Stock</span><strong className="text-slate-900">{item.item.priceType === "VARIABLE" ? "No aplica" : `${item.item.stock} unidades`}</strong></div><div className="rounded-lg border border-slate-200 p-2.5"><span className="block text-xs text-slate-500">SKU</span><strong className="text-slate-900">{item.item.sku || "Sin SKU"}</strong></div>{(item.item.brand || item.item.supplier) && <div className="rounded-lg border border-slate-200 p-2.5 sm:col-span-2"><span className="block text-xs text-slate-500">Marca / proveedor</span><strong className="text-slate-900">{[item.item.brand, item.item.supplier].filter(Boolean).join(" · ")}</strong></div>}</> : <div className="rounded-lg border border-slate-200 p-2.5"><span className="block text-xs text-slate-500">Duración</span><strong className="text-slate-900">{item.item.duration ? `${item.item.duration} minutos` : "No especificada"}</strong></div>}</div></div>}
      <DialogFooter><Button variant="outline" onClick={onClose}>Cerrar</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}
