"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Loader2,
  PawPrint,
  Plus,
  Search,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getClients, type Client } from "@/lib/api/clients";
import {
  createAppointment,
  getAppointments,
  updateAppointmentStatus,
  type Appointment,
} from "@/lib/api/appointments";
import { getPetsByClient, createPet, type Pet } from "@/lib/api/pets";
import { getServices, type Service } from "@/lib/api/services";
import { openConsultation } from "@/lib/api/consultations";
import { useAuthStore } from "@/lib/auth-store";

type ViewMode = "day" | "week" | "month";
type AppointmentStatus = Appointment["status"];
const statusLabels: Record<AppointmentStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
};
const statusClasses: Record<AppointmentStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  confirmed: "border-blue-200 bg-blue-50 text-blue-800",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelled: "border-red-200 bg-red-50 text-red-800",
};
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const parseDateKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const startOfWeek = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(0, 0, 0, 0);
  return result;
};
const endOfWeek = (date: Date) => {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
};
const formatDate = (date: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-UY", options).format(date);
const formatTime = (value: string) =>
  formatDate(new Date(value), { hour: "2-digit", minute: "2-digit" });
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo completar la operación.";

export default function CitasPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.role);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>("week");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AppointmentStatus | "all">("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [newOpen, setNewOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const appointmentsQuery = useQuery({
    queryKey: ["appointments"],
    queryFn: getAppointments,
  });
  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: getClients });
  const servicesQuery = useQuery({
    queryKey: ["services", "active"],
    queryFn: () => getServices({ isActive: true }),
  });
  const appointments = appointmentsQuery.data ?? [];
  const clients = clientsQuery.data ?? [];
  const services = servicesQuery.data ?? [];
  const clientById = useMemo(
    () => new Map(clients.map((client) => [Number(client.id), client])),
    [clients],
  );
  const range = useMemo(
    () =>
      view === "day"
        ? {
            start: parseDateKey(dateKey(selectedDate)),
            end: parseDateKey(dateKey(selectedDate)),
          }
        : view === "week"
          ? { start: startOfWeek(selectedDate), end: endOfWeek(selectedDate) }
          : {
              start: new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                1,
              ),
              end: new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth() + 1,
                0,
                23,
                59,
                59,
                999,
              ),
            },
    [selectedDate, view],
  );
  const filteredAppointments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return appointments
      .filter((appointment) => {
        const date = new Date(appointment.date);
        const client =
          appointment.client ?? clientById.get(Number(appointment.clientId));
        const matchesSearch =
          !term ||
          [
            appointment.pet?.name,
            client?.name,
            client?.phone,
            client?.documentId,
            appointment.serviceType,
          ].some((value) => value?.toLowerCase().includes(term));
        return (
          date >= range.start &&
          date <= range.end &&
          matchesSearch &&
          (status === "all" || appointment.status === status) &&
          (serviceFilter === "all" || appointment.serviceType === serviceFilter)
        );
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [appointments, clientById, range, search, serviceFilter, status]);
  const todayAppointments = appointments.filter(
    (appointment) =>
      dateKey(new Date(appointment.date)) === dateKey(new Date()),
  );
  const counts = useMemo(
    () => ({
      pending: todayAppointments.filter(
        (item) => item.status === "pending" || item.status === "confirmed",
      ).length,
      completed: todayAppointments.filter((item) => item.status === "completed")
        .length,
    }),
    [todayAppointments],
  );
  const statusMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      updateAppointmentStatus(String(id), "cancelled", reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setCancelTarget(null);
      setCancelReason("");
      toast.success("Cita cancelada correctamente.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const startMutation = useMutation({
    mutationFn: (appointment: Appointment) =>
      openConsultation({
        clientId: appointment.clientId,
        petId: appointment.petId,
        appointmentId: appointment.id,
      }),
    onSuccess: async (consultation) => {
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Consulta iniciada correctamente.");
      window.location.href = `/workstation/user/consultas/${consultation.id}`;
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const moveDate = (amount: number) =>
    setSelectedDate((current) => {
      const next = new Date(current);
      if (view === "month") next.setMonth(next.getMonth() + amount);
      else
        next.setDate(next.getDate() + (view === "week" ? amount * 7 : amount));
      return next;
    });
  const dateTitle =
    view === "day"
      ? formatDate(selectedDate, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : view === "week"
        ? `${formatDate(range.start, { day: "numeric", month: "short" })} — ${formatDate(range.end, { day: "numeric", month: "long", year: "numeric" })}`
        : formatDate(selectedDate, { month: "long", year: "numeric" });
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Operación</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Agenda de Citas
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Organizá las citas y el flujo de atención de la clínica.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="mr-2 size-4" />
          Nueva Cita
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Citas hoy"
          value={todayAppointments.length}
          icon={<CalendarDays />}
          tone="blue"
        />
        <SummaryCard
          label="Pendientes"
          value={counts.pending}
          icon={<Clock3 />}
          tone="amber"
        />
        <SummaryCard
          label="Completadas"
          value={counts.completed}
          icon={<Stethoscope />}
          tone="emerald"
        />
      </div>
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative min-w-0 flex-1 xl:max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar mascota o tutor..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex rounded-lg border bg-muted/30 p-1">
                {(
                  [
                    ["day", "Día"],
                    ["week", "Semana"],
                    ["month", "Mes"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setView(value)}
                    className={`rounded-md px-3 py-1.5 text-sm transition-colors ${view === value ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(new Date())}
                aria-label="Ir a hoy"
              >
                <CalendarDays className="size-4" />
              </Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <FilterSelect
              label="Estado"
              value={status}
              onChange={(value) =>
                setStatus(value as AppointmentStatus | "all")
              }
              options={[
                ["all", "Todos los estados"],
                ["pending", "Pendientes"],
                ["confirmed", "Confirmadas"],
                ["completed", "Completadas"],
                ["cancelled", "Canceladas"],
              ]}
            />
            <FilterSelect
              label="Servicio"
              value={serviceFilter}
              onChange={setServiceFilter}
              options={[
                ["all", "Todos los servicios"],
                ...services.map((service) => [service.name, service.name]),
              ]}
            />
            <div className="space-y-1.5">
              <Label>Veterinario</Label>
              <select
                disabled
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
              >
                <option>Asignación no disponible</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <MiniCalendar
            selectedDate={selectedDate}
            appointments={appointments}
            onSelect={setSelectedDate}
            onMonthChange={(amount) => {
              const next = new Date(selectedDate);
              next.setMonth(next.getMonth() + amount);
              setSelectedDate(next);
            }}
          />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recordatorios</CardTitle>
              <CardDescription>Estado disponible en la agenda.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>WhatsApp no está configurado en el backend actual.</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Veterinarios</CardTitle>
              <CardDescription>
                Asignación pendiente de soporte en citas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Stethoscope className="size-4" />
                La cita actual no tiene veterinario asociado.
              </div>
            </CardContent>
          </Card>
        </aside>
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="capitalize">{dateTitle}</CardTitle>
                <CardDescription>
                  {filteredAppointments.length}{" "}
                  {filteredAppointments.length === 1
                    ? "cita encontrada"
                    : "citas encontradas"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveDate(-1)}
                  aria-label="Período anterior"
                >
                  <ChevronLeft />
                  <ChevronRight className="hidden" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveDate(1)}
                  aria-label="Período siguiente"
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="size-4" />
              Mostrando citas reales de la clínica activa.
            </div>
            {appointmentsQuery.isLoading ? (
              <AgendaSkeleton />
            ) : appointmentsQuery.isError ? (
              <EmptyState
                title="No se pudo cargar la agenda"
                description="Verificá la conexión e intentá nuevamente."
                action={
                  <Button
                    variant="outline"
                    onClick={() => void appointmentsQuery.refetch()}
                  >
                    Reintentar
                  </Button>
                }
              />
            ) : filteredAppointments.length === 0 ? (
              <EmptyState
                title="No hay citas para este período"
                description="Probá cambiar la fecha o ajustar los filtros."
                action={
                  <Button onClick={() => setNewOpen(true)}>
                    <Plus className="mr-2 size-4" />
                    Nueva Cita
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {filteredAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    client={
                      appointment.client ??
                      clientById.get(Number(appointment.clientId))
                    }
                    onStart={() => startMutation.mutate(appointment)}
                    onCancel={() => setCancelTarget(appointment)}
                    starting={
                      startMutation.isPending &&
                      startMutation.variables?.id === appointment.id
                    }
                    canCancel={
                      role === "USER" ||
                      role === "ADMIN" ||
                      role === "SUPER_ADMIN"
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <NewAppointmentDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        selectedDate={selectedDate}
        clients={clients}
        services={services}
        onCreated={() => {
          void queryClient.invalidateQueries({ queryKey: ["appointments"] });
          void queryClient.invalidateQueries({ queryKey: ["pets"] });
        }}
      />
      <Dialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open && !statusMutation.isPending) {
            setCancelTarget(null);
            setCancelReason("");
          }
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-w-xl rounded-xl">
          <DialogHeader>
            <DialogTitle>Cancelar cita</DialogTitle>
            <DialogDescription>
              La cita de {cancelTarget?.pet?.name || "la mascota seleccionada"}{" "}
              quedará cancelada y no se eliminará del historial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="cancel-reason">Motivo de cancelación *</Label>
            <Textarea id="cancel-reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Ej.: El cliente solicitó reprogramar la cita..." rows={4} disabled={statusMutation.isPending} aria-invalid={!cancelReason.trim()} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={statusMutation.isPending} onClick={() => { setCancelTarget(null); setCancelReason(""); }}>
              Volver
            </Button>
            <Button type="button" variant="destructive"
              disabled={statusMutation.isPending || !cancelReason.trim()}
              onClick={() => {
                if (cancelTarget && cancelReason.trim()) {
                  statusMutation.mutate({ id: cancelTarget.id, reason: cancelReason.trim() });
                }
              }}
            >
              {statusMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Confirmar cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "blue" | "amber" | "emerald";
}) {
  const classes = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div
          className={`flex size-10 items-center justify-center rounded-xl ${classes[tone]}`}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}
function MiniCalendar({
  selectedDate,
  appointments,
  onSelect,
  onMonthChange,
}: {
  selectedDate: Date;
  appointments: Appointment[];
  onSelect: (date: Date) => void;
  onMonthChange: (amount: number) => void;
}) {
  const monthStart = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    1,
  );
  const firstMonday = new Date(monthStart);
  const offset = firstMonday.getDay() === 0 ? 6 : firstMonday.getDay() - 1;
  firstMonday.setDate(firstMonday.getDate() - offset);
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstMonday);
    day.setDate(firstMonday.getDate() + index);
    return day;
  });
  const appointmentDays = new Set(
    appointments.map((appointment) => dateKey(new Date(appointment.date))),
  );
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base capitalize">
            {formatDate(selectedDate, { month: "long", year: "numeric" })}
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onMonthChange(-1)}
              aria-label="Mes anterior"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onMonthChange(1)}
              aria-label="Mes siguiente"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
          {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
          {days.map((day) => {
            const currentMonth = day.getMonth() === selectedDate.getMonth();
            const selected = dateKey(day) === dateKey(selectedDate);
            const hasAppointments = appointmentDays.has(dateKey(day));
            return (
              <button
                key={dateKey(day)}
                type="button"
                onClick={() => onSelect(day)}
                className={`relative flex size-8 items-center justify-center rounded-md text-xs ${selected ? "bg-primary text-primary-foreground" : currentMonth ? "hover:bg-accent" : "text-muted-foreground/40"}`}
              >
                {day.getDate()}
                {hasAppointments && (
                  <span
                    className={`absolute bottom-0.5 size-1 rounded-full ${selected ? "bg-primary-foreground" : "bg-primary"}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
function AppointmentCard({
  appointment,
  client,
  onStart,
  onCancel,
  starting,
  canCancel,
}: {
  appointment: Appointment;
  client?: {
    id: number | string;
    name: string;
    phone?: string;
    documentId?: string;
  };
  onStart: () => void;
  onCancel: () => void;
  starting: boolean;
  canCancel: boolean;
}) {
  const consultation = appointment.consultation;
  const isCancelled = appointment.status === "cancelled";
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${isCancelled ? "bg-muted/30 opacity-70" : "bg-background hover:border-primary/30 hover:shadow-sm"}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex min-w-24 items-center gap-2 text-sm font-semibold">
          <Clock3 className="size-4 text-primary" />
          {formatTime(appointment.date)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">
              {appointment.pet?.name || `Mascota #${appointment.petId}`}
            </h3>
            <Badge
              variant="outline"
              className={statusClasses[appointment.status]}
            >
              {statusLabels[appointment.status]}
            </Badge>
            {consultation?.status === "OPEN" && (
              <Badge variant="success">En curso</Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3.5" />
              {client?.name || `Cliente #${appointment.clientId}`}
            </span>
            <span className="inline-flex items-center gap-1">
              <PawPrint className="size-3.5" />
              {appointment.pet?.species || "Mascota"}
            </span>
            <span>{appointment.duration} min</span>
          </div>
          {appointment.serviceType && (
            <p className="mt-2 text-sm font-medium text-primary">
              {appointment.serviceType}
            </p>
          )}
          {appointment.notes && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {appointment.notes}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
          {consultation?.status === "OPEN" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                window.location.href = `/workstation/user/consultas/${consultation.id}`;
              }}
            >
              Continuar
            </Button>
          ) : appointment.status !== "completed" && !isCancelled ? (
            <Button size="sm" onClick={onStart} disabled={starting}>
              {starting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Iniciar consulta
            </Button>
          ) : null}
          {canCancel && !isCancelled && appointment.status !== "completed" && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700"
              onClick={onCancel}
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
function AgendaSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
      <CalendarDays className="size-8 text-muted-foreground" />
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function NewAppointmentDialog({
  open,
  onOpenChange,
  selectedDate,
  clients,
  services,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  clients: Client[];
  services: Service[];
  onCreated: () => void;
}) {
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [date, setDate] = useState(dateKey(selectedDate));
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("30");
  const [serviceType, setServiceType] = useState("");
  const [notes, setNotes] = useState("");
  const [creatingPet, setCreatingPet] = useState(false);
  const [petName, setPetName] = useState("");
  const [petSpecies, setPetSpecies] = useState("");
  const [error, setError] = useState("");
  const petsQuery = useQuery({
    queryKey: ["pets", "client", selectedClient?.id],
    queryFn: () => getPetsByClient(selectedClient!.id),
    enabled: Boolean(selectedClient),
  });
  const visibleClients = clients
    .filter((client) =>
      `${client.name} ${client.phone || ""} ${client.documentId || ""}`
        .toLowerCase()
        .includes(clientSearch.toLowerCase()),
    )
    .slice(0, 8);
  const reset = () => {
    setClientSearch("");
    setSelectedClient(null);
    setSelectedPet(null);
    setDate(dateKey(selectedDate));
    setTime("09:00");
    setDuration("30");
    setServiceType("");
    setNotes("");
    setCreatingPet(false);
    setPetName("");
    setPetSpecies("");
    setError("");
  };
  const close = (value: boolean) => {
    onOpenChange(value);
    if (!value) reset();
  };
  const createPetMutation = useMutation({
    mutationFn: () =>
      createPet({
        name: petName.trim(),
        species: petSpecies.trim(),
        clientId: selectedClient!.id,
      }),
    onSuccess: (pet) => {
      setSelectedPet(pet);
      setCreatingPet(false);
      setPetName("");
      setPetSpecies("");
      void petsQuery.refetch();
      toast.success("Mascota creada correctamente");
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const appointmentMutation = useMutation({
    mutationFn: () =>
      createAppointment({
        clientId: Number(selectedClient!.id),
        petId: selectedPet!.id,
        date: new Date(`${date}T${time}:00`).toISOString(),
        duration: Number(duration),
        serviceType: serviceType || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      onCreated();
      close(false);
      toast.success("Cita creada correctamente");
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClient || !selectedPet) {
      setError("Seleccioná un cliente y una mascota.");
      return;
    }
    if (!date || !time || Number(duration) <= 0) {
      setError("Completá una fecha, hora y duración válidas.");
      return;
    }
    setError("");
    appointmentMutation.mutate();
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="!w-[calc(100%-1.5rem)] max-h-[90vh] overflow-y-auto rounded-xl sm:!max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" />
            Agendar Nueva Cita
          </DialogTitle>
          <DialogDescription>
            Seleccioná el tutor, la mascota y los datos de la cita.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">1. Cliente / tutor</h3>
                <p className="text-sm text-muted-foreground">
                  Buscá por nombre, teléfono o documento.
                </p>
              </div>
              {selectedClient && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedClient(null);
                    setSelectedPet(null);
                  }}
                >
                  <X className="mr-1 size-4" />
                  Cambiar
                </Button>
              )}
            </div>
            {selectedClient ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
                <p className="font-medium">{selectedClient.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedClient.phone || "Sin teléfono"}
                  {selectedClient.documentId
                    ? ` · CI: ${selectedClient.documentId}`
                    : ""}
                </p>
              </div>
            ) : (
              <>
                <Input
                  autoFocus
                  placeholder="Buscar cliente..."
                  value={clientSearch}
                  onChange={(event) => setClientSearch(event.target.value)}
                />
                {clientSearch && (
                  <div className="max-h-44 space-y-2 overflow-y-auto">
                    {visibleClients.map((client) => (
                      <button
                        type="button"
                        key={client.id}
                        className="w-full rounded-lg border p-3 text-left hover:bg-accent"
                        onClick={() => {
                          setSelectedClient(client);
                          setClientSearch("");
                        }}
                      >
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {client.phone || "Sin teléfono"}
                          {client.documentId
                            ? ` · CI: ${client.documentId}`
                            : ""}
                        </p>
                      </button>
                    ))}
                    {visibleClients.length === 0 && (
                      <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                        No encontramos clientes con esos datos.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
          <section className="space-y-3 border-t pt-4">
            <h3 className="font-semibold">2. Mascota</h3>
            {!selectedClient ? (
              <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                Primero seleccioná el cliente.
              </p>
            ) : creatingPet ? (
              <div className="grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="agenda-pet-name">Nombre *</Label>
                  <Input
                    id="agenda-pet-name"
                    value={petName}
                    onChange={(event) => setPetName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agenda-pet-species">Especie *</Label>
                  <Input
                    id="agenda-pet-species"
                    value={petSpecies}
                    onChange={(event) => setPetSpecies(event.target.value)}
                    placeholder="Perro, gato..."
                  />
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <Button
                    type="button"
                    onClick={() => createPetMutation.mutate()}
                    disabled={
                      !petName.trim() ||
                      !petSpecies.trim() ||
                      createPetMutation.isPending
                    }
                  >
                    {createPetMutation.isPending && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Guardar mascota
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCreatingPet(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {petsQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Cargando mascotas...
                  </p>
                ) : (
                  (petsQuery.data ?? []).map((pet) => (
                    <button
                      type="button"
                      key={pet.id}
                      onClick={() => setSelectedPet(pet)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${selectedPet?.id === pet.id ? "border-primary bg-primary/10" : "hover:bg-accent"}`}
                    >
                      <PawPrint className="size-4 text-primary" />
                      <span>
                        <span className="block font-medium">{pet.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {pet.species}
                          {pet.breed ? ` · ${pet.breed}` : ""}
                        </span>
                      </span>
                    </button>
                  ))
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreatingPet(true)}
                >
                  <Plus className="mr-2 size-4" />
                  Crear nueva mascota
                </Button>
              </div>
            )}
          </section>
          <section className="space-y-3 border-t pt-4">
            <h3 className="font-semibold">3. Datos de la cita</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="agenda-date">Fecha *</Label>
                <Input
                  id="agenda-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agenda-time">Hora *</Label>
                <Input
                  id="agenda-time"
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agenda-duration">Duración *</Label>
                <Input
                  id="agenda-duration"
                  type="number"
                  min="15"
                  step="15"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agenda-service">Servicio</Label>
                <select
                  id="agenda-service"
                  value={serviceType}
                  onChange={(event) => {
                    const value = event.target.value;
                    setServiceType(value);
                    const service = services.find(
                      (item) => item.name === value,
                    );
                    if (service?.duration)
                      setDuration(String(service.duration));
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.name}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agenda-notes">Motivo / observaciones</Label>
              <Textarea
                id="agenda-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Información útil para la atención..."
                rows={3}
              />
            </div>
          </section>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => close(false)}
              disabled={appointmentMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                appointmentMutation.isPending || !selectedClient || !selectedPet
              }
            >
              {appointmentMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Crear cita
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
