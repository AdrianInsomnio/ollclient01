import { CreditCard, Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CustomerPetBarProps = {
  clientName: string;
  documentId?: string | null;
  hasSelectedClient: boolean;
  canLoadInstallments: boolean;
  installmentsLoading: boolean;
  onChooseClient: () => void;
  onLoadInstallments: () => void;
};

export function CustomerPetBar({
  clientName,
  documentId,
  hasSelectedClient,
  canLoadInstallments,
  installmentsLoading,
  onChooseClient,
  onLoadInstallments,
}: CustomerPetBarProps) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardContent className="flex flex-wrap items-center justify-between gap-2 p-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <UserRound className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Tutor y mascota
            </p>
            <p className="truncate text-sm font-semibold text-slate-900">
              {clientName}
            </p>
            <p className="truncate text-xs text-slate-500">
              {hasSelectedClient
                ? `Documento ${documentId || "sin documento"} · listo para vender`
                : "Sin cliente asociado al ticket"}
            </p>
          </div>
        </div>
        <div className="flex w-full max-w-none flex-row items-center gap-2 sm:w-auto">
          <Button
            size="sm"
            className="min-w-0 flex-1 justify-start sm:flex-none"
            variant={hasSelectedClient ? "outline" : "default"}
            onClick={onChooseClient}
          >
            <UserRound className="mr-2 size-4" />
            {hasSelectedClient ? "Cambiar tutor" : "Asignar tutor / mascota"}
          </Button>
          <Button
            size="sm"
            className="min-w-0 flex-1 justify-start sm:flex-none"
            variant="outline"
            onClick={onLoadInstallments}
            disabled={!canLoadInstallments || installmentsLoading}
          >
            {installmentsLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 size-4" />
            )}
            Cargar cuotas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
