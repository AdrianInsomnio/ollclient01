"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  Loader2,
  Search,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getMyConsultations, type Consultation } from "@/lib/api/consultations";

const statusLabels: Record<Consultation["status"], string> = {
  OPEN: "En curso",
  CLOSED: "Finalizada",
};

const statusClasses: Record<Consultation["status"], string> = {
  OPEN: "border-blue-200 bg-blue-50 text-blue-800",
  CLOSED: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

const dateValue = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const displayDate = (value: string) =>
  new Intl.DateTimeFormat("es-UY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));

const shortDate = (value: string) =>
  new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value)).replace(".", "");

const time = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("es-UY", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))
    : "—";

const duration = (consultation: Consultation) => {
  const start = consultation.historyStartedAt ?? consultation.startAt ?? consultation.createdAt;
  const end = consultation.historyEndedAt ?? consultation.endAt;
  if (!end) return null;
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return minutes >= 0 ? `${minutes} min` : null;
};

export default function VetAtencionesPage() {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<"" | Consultation["status"]>("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Consultation | null>(null);
  const query = useQuery({
    queryKey: ["my-consultations", search, from, to, status, page],
    queryFn: () => getMyConsultations({ search: search.trim() || undefined, from: from || undefined, to: to || undefined, status: status || undefined, page, limit: 50 }),
  });

  const grouped = useMemo(() => {
    const groups = new Map<string, Consultation[]>();
    for (const consultation of query.data?.consultations ?? []) {
      const key = dateValue(consultation.historyStartedAt ?? consultation.startAt ?? consultation.createdAt);
      const items = groups.get(key) ?? [];
      items.push(consultation);
      groups.set(key, items);
    }
    return [...groups.entries()];
  }, [query.data?.consultations]);
  const totalPages = query.data?.pagination?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Historia clínica</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Mis atenciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">Historial de consultas realizadas por ti.</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filtrar historial</CardTitle>
          <CardDescription>Busca por paciente o cliente y combina los filtros de fecha y estado.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_1fr_1fr_1fr]">
          <div className="space-y-1.5 md:col-span-1">
            <Label htmlFor="my-attentions-search">Paciente o cliente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="my-attentions-search" className="pl-9" placeholder="Buscar paciente o cliente..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="my-attentions-from">Desde</Label>
            <Input id="my-attentions-from" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="my-attentions-to">Hasta</Label>
            <Input id="my-attentions-to" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="my-attentions-status">Estado</Label>
            <select id="my-attentions-status" value={status} onChange={(event) => { setStatus(event.target.value as "" | Consultation["status"]); setPage(1); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Todos los estados</option>
              <option value="OPEN">En curso</option>
              <option value="CLOSED">Finalizadas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-slate-50/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="size-5 text-primary" /> Línea de tiempo</CardTitle>
              <CardDescription>{query.data?.pagination.total ?? 0} atención{query.data?.pagination.total === 1 ? "" : "es"} encontrada{query.data?.pagination.total === 1 ? "" : "s"}.</CardDescription>
            </div>
            {(search || from || to || status) && <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFrom(""); setTo(""); setStatus(""); setPage(1); }}><X className="mr-1.5 size-4" />Limpiar</Button>}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {query.isLoading ? <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-primary" /></div> : query.isError ? <p className="py-12 text-center text-sm text-destructive">No se pudo cargar tu historial.</p> : grouped.length === 0 ? <div className="py-14 text-center"><FileText className="mx-auto size-9 text-muted-foreground" /><p className="mt-3 font-medium">No hay atenciones con estos filtros</p><p className="mt-1 text-sm text-muted-foreground">Prueba con otro período o término de búsqueda.</p></div> : <div className="space-y-8">
            {grouped.map(([key, items]) => <section key={key} className="relative pl-8 sm:pl-10">
              <div className="absolute bottom-0 left-2 top-8 w-px bg-slate-200 sm:left-3" />
              <div className="relative mb-4 flex items-center gap-3"><span className="absolute -left-[1.55rem] flex size-5 items-center justify-center rounded-full border-4 border-background bg-primary sm:-left-[1.65rem]" /><h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-700">{shortDate(key)}</h2></div>
              <div className="space-y-3">
                {items.map((consultation) => <button key={consultation.id} type="button" onClick={() => setSelected(consultation)} className="group relative block w-full rounded-xl border border-slate-200 bg-background p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  <span className="absolute -left-[2rem] top-5 flex size-3 items-center justify-center rounded-full border-2 border-primary bg-background sm:-left-[2.1rem]" />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="inline-flex items-center gap-1.5 text-sm font-bold tabular-nums text-primary"><Clock3 className="size-4" />{time(consultation.historyStartedAt ?? consultation.startAt ?? consultation.createdAt)}</span><h3 className="text-base font-semibold text-slate-950">{consultation.pet?.name ?? `Mascota #${consultation.petId}`}</h3><Badge variant="outline" className={statusClasses[consultation.status]}>{statusLabels[consultation.status]}</Badge></div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1.5"><UserRound className="size-3.5" />Cliente: {consultation.client?.name ?? `#${consultation.clientId}`}</span>{consultation.appointment?.serviceType && <span className="inline-flex items-center gap-1.5"><Stethoscope className="size-3.5" />{consultation.appointment.serviceType}</span>}{(consultation.historyConsultorioName ?? consultation.consultorio?.name) && <span>{consultation.historyConsultorioName ?? consultation.consultorio?.name}</span>}</div>
                    </div><ChevronRight className="hidden size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
                  </div>
                  {duration(consultation) && <p className="mt-3 text-xs font-medium text-muted-foreground">Duración: {duration(consultation)}</p>}
                </button>)}
              </div>
            </section>)}
          </div>}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Siguiente</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-lg rounded-xl">
          {selected && <><DialogHeader><DialogTitle className="flex items-center gap-2"><Stethoscope className="size-5 text-primary" />Detalle de atención</DialogTitle><DialogDescription>{displayDate(selected.historyStartedAt ?? selected.startAt ?? selected.createdAt)}</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Detail label="Paciente" value={selected.pet?.name ?? `Mascota #${selected.petId}`} /><Detail label="Cliente" value={selected.client?.name ?? `Cliente #${selected.clientId}`} /><Detail label="Inicio" value={time(selected.historyStartedAt ?? selected.startAt ?? selected.createdAt)} /><Detail label="Fin" value={time(selected.historyEndedAt ?? selected.endAt)} /><Detail label="Duración" value={duration(selected) ?? "No disponible"} /><Detail label="Consultorio" value={selected.historyConsultorioName ?? selected.consultorio?.name ?? "No asignado"} /><Detail label="Estado" value={<Badge variant="outline" className={statusClasses[selected.status]}>{statusLabels[selected.status]}</Badge>} /><Detail label="Motivo" value={selected.appointment?.serviceType ?? "Consulta clínica"} /></div><Separator />{(selected.symptoms || selected.notes || selected.diagnoses?.length || selected.treatments?.length) && <div className="space-y-3 text-sm">{selected.symptoms && <Detail label="Síntomas" value={selected.symptoms} />}{selected.notes && <Detail label="Notas" value={selected.notes} />}{selected.diagnoses?.length ? <Detail label="Diagnósticos" value={selected.diagnoses.map((item) => item.description).join(", ")} /> : null}{selected.treatments?.length ? <Detail label="Tratamientos" value={selected.treatments.map((item) => item.description).join(", ")} /> : null}</div>}</>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="space-y-1"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><div className="text-sm font-medium text-slate-900">{value}</div></div>;
}
