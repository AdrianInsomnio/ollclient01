import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Sale } from "@/lib/api/sales";

type PendingDraftBannerProps = {
  draft: Sale;
  onContinue: () => void;
  onDiscard: () => void;
};

export function PendingDraftBanner({ draft, onContinue, onDiscard }: PendingDraftBannerProps) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950"><div className="flex items-center gap-2"><Sparkles className="size-4 text-sky-700" /><span>Hay un borrador pendiente #{draft.id} de {draft.client?.name ?? "la última venta"}.</span></div><div className="flex gap-2"><Button size="sm" className="h-7 px-2 text-xs" onClick={onContinue}>Continuar</Button><Button size="sm" className="h-7 px-2 text-xs" variant="ghost" onClick={onDiscard}>Descartar</Button></div></div>
  );
}
