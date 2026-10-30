import { ChevronRight, Clock3, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Sale } from "@/lib/api/sales";

type WaitingSalesDialogProps = {
  open: boolean;
  sales: Sale[];
  loading: boolean;
  formatDateTime: (value?: string | null) => string;
  formatMoney: (value: number) => string;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  onContinue: (sale: Sale) => void;
  onCancel: (sale: Sale) => void;
};

export function WaitingSalesDialog({ open, sales, loading, formatDateTime, formatMoney, onOpenChange, onRefresh, onContinue, onCancel }: WaitingSalesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl"><DialogHeader><div className="flex items-center justify-between gap-3"><div><DialogTitle className="flex items-center gap-2"><Clock3 className="size-5 text-amber-600" />Cuentas en espera <Badge variant={sales.length ? "warning" : "neutral"}>{sales.length}</Badge></DialogTitle><DialogDescription className="mt-1">Ventas pausadas de este turno. No afectan la caja hasta ser cobradas.</DialogDescription></div><Button variant="ghost" size="icon" onClick={onRefresh} aria-label="Actualizar cuentas"><RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} /></Button></div></DialogHeader>
      <ScrollArea className="max-h-[55vh] pr-3"><div className="space-y-3">{sales.map((sale) => <div key={sale.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="text-sm font-bold">Cuenta #{sale.id}</span><Badge variant="warning">WAITING</Badge></div><p className="mt-1 text-sm font-medium text-slate-800">{sale.client?.name ?? "Consumidor Final"}{sale.pet?.name ? ` · ${sale.pet.name}` : ""}</p><p className="mt-1 text-xs text-slate-500">{(sale.saleItems ?? sale.items ?? []).length} artículos · {formatDateTime(sale.createdAt)}</p></div><span className="text-lg font-bold text-teal-800">{formatMoney(Number(sale.total || 0))}</span></div><div className="mt-3 flex justify-end gap-2"><Button size="sm" onClick={() => onContinue(sale)}><ChevronRight className="mr-1 size-4" />Retomar</Button><Button size="sm" variant="outline" className="text-red-700 hover:bg-red-50" onClick={() => onCancel(sale)}>Cancelar</Button></div></div>)}{!sales.length && <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center"><Clock3 className="mx-auto size-8 text-slate-300" /><p className="mt-3 text-sm font-semibold">No hay cuentas en espera</p><p className="mt-1 text-xs text-slate-500">Cuando pauses un ticket aparecerá aquí.</p></div>}</div></ScrollArea>
    </DialogContent></Dialog>
  );
}
