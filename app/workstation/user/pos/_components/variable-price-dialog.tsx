import type { KeyboardEvent } from "react";
import type { Product } from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type VariablePriceDialogProps = {
  product: Product | null;
  price: string;
  taxPreview: { net: number; tax: number } | null;
  formatMoney: (value: number) => string;
  onOpenChange: (open: boolean) => void;
  onPriceChange: (price: string) => void;
  onEnter: () => void;
  onConfirm: () => void;
};

export function VariablePriceDialog({ product, price, taxPreview, formatMoney, onOpenChange, onPriceChange, onEnter, onConfirm }: VariablePriceDialogProps) {
  return (
    <Dialog open={Boolean(product)} onOpenChange={(open) => !open && onOpenChange(false)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Definir importe</DialogTitle><DialogDescription>{product?.name} es un producto de precio variable. Este importe solo se aplicará a esta línea de venta.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="variable-product-price">Importe de venta</Label><Input id="variable-product-price" type="number" min="0.01" step="0.01" autoFocus value={price} onChange={(event) => onPriceChange(event.target.value)} onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter") onEnter(); }} />{taxPreview && <div className="rounded-md bg-muted/50 p-3 text-sm"><p className="font-medium">IVA incluido</p><p className="text-muted-foreground">Sin IVA: {formatMoney(taxPreview.net)}</p><p className="text-muted-foreground">IVA 22%: {formatMoney(taxPreview.tax)}</p></div>}</div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="button" onClick={onConfirm}>Agregar al ticket</Button></DialogFooter></DialogContent></Dialog>
  );
}
