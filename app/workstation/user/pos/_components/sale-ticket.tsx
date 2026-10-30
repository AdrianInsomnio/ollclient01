import type { ReactNode } from "react";
import { Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SaleTicketProps = {
  draftId: string | null;
  lineCount: number;
  hasTicketItems: boolean;
  submitting: boolean;
  onClear: () => void;
  children: ReactNode;
};

export function SaleTicket({ draftId, lineCount, hasTicketItems, submitting, onClear, children }: SaleTicketProps) {
  return (
    <Card className="flex h-full max-h-full flex-col overflow-hidden border-slate-200/80 bg-white shadow-[0_12px_40px_rgb(15_58_58/0.08)]">
      <CardHeader className="border-b border-slate-100 px-4 py-3"><div className="flex items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><Receipt className="size-4 text-teal-700" />Ticket de venta</CardTitle><CardDescription className="mt-1">{draftId ? `Borrador #${draftId}` : "Nueva venta"} · {lineCount} líneas</CardDescription></div><Button variant="ghost" size="icon-sm" aria-label="Vaciar ticket" disabled={!hasTicketItems || submitting} onClick={onClear}><Trash2 className="size-4 text-slate-500" /></Button></div></CardHeader>
      {children}
    </Card>
  );
}
