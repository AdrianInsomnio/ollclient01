import { Check, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Client as ApiClient } from "@/lib/api/clients";

export type PosClient = Pick<ApiClient, "id" | "name" | "documentId">;

type ClientPickerDialogProps = {
  open: boolean;
  query: string;
  clients: PosClient[];
  selectedClientId: string | null;
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  onSelect: (clientId: string) => void;
};

export function ClientPickerDialog({ open, query, clients, selectedClientId, onOpenChange, onQueryChange, onSelect }: ClientPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Asignar tutor / mascota</DialogTitle><DialogDescription>Busca un cliente para asociarlo al ticket actual.</DialogDescription></DialogHeader>
        <Input autoFocus placeholder="Buscar por nombre o documento" value={query} onChange={(event) => onQueryChange(event.target.value)} />
        <ScrollArea className="h-72 rounded-lg border"><div className="space-y-1 p-2">{clients.map((client) => <button type="button" key={client.id} className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-teal-50 ${selectedClientId === client.id ? "bg-teal-50 ring-1 ring-teal-200" : ""}`} onClick={() => onSelect(client.id)}><div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"><UserRound className="size-4" /></div><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{client.name}</strong><small className="text-xs text-slate-500">{client.documentId || "Sin documento"}</small></span>{selectedClientId === client.id && <Check className="size-4 text-teal-700" />}</button>)}{!clients.length && <p className="p-6 text-center text-sm text-slate-500">No encontramos clientes.</p>}</div></ScrollArea>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
