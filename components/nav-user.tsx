"use client";

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Mail,
  ArrowRight,
  Building2,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  LogOut,
  Settings,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { logoutRemote } from "@/lib/api/auth";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useState } from "react";
import Link from "next/link";

const exampleNotifications = [
  {
    id: 1,
    title: "Nueva atención registrada",
    preview: "La consulta de Max fue cerrada correctamente.",
    body: "La atención veterinaria de Max fue registrada y cerrada correctamente por el equipo médico.",
    time: "Hace 12 min",
    tone: "blue",
    icon: Mail,
  },
  {
    id: 2,
    title: "Stock actualizado",
    preview: "El inventario de medicamentos fue actualizado.",
    body: "Se registraron cambios recientes en el inventario. Revisá los productos con stock bajo para mantener la disponibilidad.",
    time: "Hace 1 h",
    tone: "green",
    icon: CheckCircle2,
  },
  {
    id: 3,
    title: "Recordatorio de agenda",
    preview: "Hay turnos próximos para revisar hoy.",
    body: "Tu agenda tiene turnos próximos pendientes de confirmar. Podés revisarlos desde la sección de citas.",
    time: "Hoy, 09:30",
    tone: "amber",
    icon: AlertTriangle,
  },
] as const;

export function NavUser({
  user,
}: {
  user: {
    username?: string;
    name?: string;
    email: string;
    avatar: string;
    role?: string;
    isActive?: boolean;
    organizationId?: number;
    lastLogin?: string | null;
    createdAt?: string;
    clinics?: Array<{ id: number; name: string }>;
  };
}) {
  const { isMobile } = useSidebar();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState<number>(exampleNotifications[0].id);

  const router = useRouter();
  const { logout } = useAuthStore();
  const displayName = user.username || user.name || "Usuario";
  const selectedNotification = exampleNotifications.find((item) => item.id === selectedNotificationId) || exampleNotifications[0];
  const settingsHref = user.role === "SUPER_ADMIN"
    ? "/workstation/superadmin/settings"
    : user.role === "ADMIN"
      ? "/workstation/admin/settings"
      : user.role === "VET"
        ? "/workstation/vet/settings"
        : "/workstation/user/settings";
  const roleLabels: Record<string, string> = {
    USER: "Usuario",
    VET: "Veterinario",
    ADMIN: "Administrador",
    SUPER_ADMIN: "Super administrador",
  };
  const formatDate = (value?: string | null) => value
    ? new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Sin registro";

  const handleLogout = async () => {
    await logoutRemote();
    logout();
    router.push("/login");
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={displayName} />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={displayName} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
                <BadgeCheck />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                <Settings />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setNotificationsOpen(true)}>
                <Bell />
                Notificaciones
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar sesión</span>
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
          <DialogContent className="w-[calc(100%-1.5rem)]! sm:max-w-4xl! rounded-xl border-blue-200/70 bg-linear-to-br from-blue-50/80 via-background to-indigo-50/60">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserRound className="size-5 text-primary" />
                Mi perfil
              </DialogTitle>
              <DialogDescription>
                Información de la cuenta actualmente autenticada.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="flex items-center gap-4 rounded-xl border border-blue-200/70 bg-white/80 p-4 shadow-sm">
                <Avatar className="size-14 rounded-xl ring-4 ring-blue-100">
                  <AvatarImage src={user.avatar} alt={displayName} />
                  <AvatarFallback className="rounded-xl bg-blue-100 text-lg text-blue-700">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{displayName}</p>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ProfileDetail icon={<ShieldCheck className="size-4" />} label="Rol" value={roleLabels[user.role || ""] || user.role || "Sin asignar"} />
                <ProfileDetail icon={<CalendarClock className="size-4" />} label="Último inicio de sesión" value={formatDate(user.lastLogin)} />
                <ProfileDetail label="Estado" value={user.isActive === false ? "Inactivo" : "Activo"} />
                <ProfileDetail label="Fecha de creación" value={formatDate(user.createdAt)} />
                <ProfileDetail label="Organización" value={user.organizationId ? `Organización #${user.organizationId}` : "Sin asignar"} />
                <ProfileDetail label="Clínica" value={user.clinics?.[0]?.name || "Sin clínica asignada"} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <DialogContent className="w-[calc(100%-1rem)]! sm:max-w-7xl! overflow-hidden rounded-xl p-0">
            <div className="grid max-h-[min(82vh,760px)] min-h-120 lg:grid-cols-[3fr_7fr]">
              <aside className="border-b bg-muted/20 p-4 lg:border-r lg:border-b-0">
                <DialogHeader className="mb-4 px-1 text-left">
                  <DialogTitle className="flex items-center gap-2">
                    <Bell className="size-5 text-primary" />
                    Notificaciones
                  </DialogTitle>
                  <DialogDescription>Mensajes y novedades recientes.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 overflow-y-auto lg:max-h-140">
                  {exampleNotifications.map((notification) => {
                    const Icon = notification.icon;
                    const selected = notification.id === selectedNotification.id;
                    return (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => setSelectedNotificationId(notification.id)}
                        className={`w-full rounded-xl border p-3 text-left transition-colors ${selected ? "border-primary/40 bg-primary/10 shadow-sm" : "bg-background hover:bg-accent"}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${notification.tone === "green" ? "bg-emerald-100 text-emerald-700" : notification.tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{notification.title}</span>
                            <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">{notification.preview}</span>
                            <span className="mt-2 block text-[11px] text-muted-foreground">{notification.time}</span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>
              <section className="flex min-h-0 flex-col p-5 sm:p-7">
                <div className="flex items-start gap-3 border-b pb-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Info className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">{selectedNotification.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedNotification.time}</p>
                  </div>
                </div>
                <div className="flex-1 py-6">
                  <p className="max-w-2xl text-sm leading-7 text-foreground/80">{selectedNotification.body}</p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Este panel muestra ejemplos de mensajes y notificaciones. Podrá conectarse a notificaciones reales cuando el servicio esté disponible.
                </div>
              </section>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="w-[calc(100%-1.5rem)]! sm:max-w-4xl! rounded-xl border-violet-200/70 bg-linear-to-br from-violet-50/80 via-background to-blue-50/60">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="size-5 text-violet-600" />
                Configuración
              </DialogTitle>
              <DialogDescription>
                Accesos rápidos para administrar tu cuenta y el espacio de trabajo.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-3">
              <SettingsCard
                icon={<SlidersHorizontal className="size-5" />}
                title="Preferencias"
                description="Revisá las opciones generales disponibles para tu espacio de trabajo."
                tone="violet"
              />
              <SettingsCard
                icon={<LockKeyhole className="size-5" />}
                title="Seguridad"
                description="Actualizá tu contraseña y mantené protegida tu cuenta."
                tone="blue"
              />
              <SettingsCard
                icon={<Building2 className="size-5" />}
                title="Clínica"
                description="Accedé a la configuración completa de tu clínica y sus recursos."
                tone="emerald"
              />
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-violet-100 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Configuración completa</p>
                <p className="mt-1 text-sm text-muted-foreground">Abrí el panel con todas las opciones disponibles para tu rol.</p>
              </div>
              <Button asChild className="shrink-0 gap-2">
                <Link href={settingsHref} onClick={() => setSettingsOpen(false)}>
                  Abrir configuración
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function ProfileDetail({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-white/70 p-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 wrap-break-word text-sm font-semibold">{value}</p>
    </div>
  );
}

function SettingsCard({ icon, title, description, tone }: { icon: React.ReactNode; title: string; description: string; tone: "violet" | "blue" | "emerald" }) {
  const toneClasses = {
    violet: "border-violet-100 bg-violet-50/70 text-violet-700",
    blue: "border-blue-100 bg-blue-50/70 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneClasses[tone]}`}>
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white/80 shadow-sm">{icon}</div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
