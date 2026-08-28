"use client";

import { useEffect, useMemo, useState } from "react";
import { UserMinus, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAdminUsers,
  updateUserClinics,
  type UserListItem,
} from "@/lib/api/admin";

type ClinicUsersModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: number | null;
  clinicName: string;
};

const roleLabels: Record<UserListItem["role"], string> = {
  ADMIN: "Administrador",
  VET: "Veterinario",
  USER: "Usuario",
  SUPER_ADMIN: "Super administrador",
};
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export function ClinicUsersModal({
  open,
  onOpenChange,
  clinicId,
  clinicName,
}: ClinicUsersModalProps) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removeUser, setRemoveUser] = useState<UserListItem | null>(null);

  useEffect(() => {
    if (!open || clinicId === null) return;
    setQuery("");
    setSelected([]);
    setLoading(true);
    getAdminUsers()
      .then((response) => setUsers(response.users))
      .catch(() => toast.error("No se pudieron cargar los usuarios."))
      .finally(() => setLoading(false));
  }, [open, clinicId]);

  const assigned = useMemo(
    () =>
      users.filter((user) =>
        user.clinics?.some((clinic) => clinic.id === clinicId),
      ),
    [users, clinicId],
  );
  const available = useMemo(
    () =>
      users.filter(
        (user) =>
          !user.clinics?.some((clinic) => clinic.id === clinicId) &&
          `${user.username} ${user.email}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [users, clinicId, query],
  );

  const toggleSelected = (id: number, checked: boolean) =>
    setSelected((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((item) => item !== id),
    );
  const assignSelected = async () => {
    if (clinicId === null || selected.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        selected.map(async (userId) => {
          const user = users.find((item) => item.id === userId);
          if (user)
            await updateUserClinics(user.id, [
              ...(user.clinics || []).map((clinic) => clinic.id),
              clinicId,
            ]);
        }),
      );
      setUsers((current) =>
        current.map((user) =>
          selected.includes(user.id)
            ? {
                ...user,
                clinics: [
                  ...(user.clinics || []),
                  { id: clinicId, name: clinicName },
                ],
              }
            : user,
        ),
      );
      setSelected([]);
      toast.success(
        selected.length === 1
          ? "Usuario asignado correctamente."
          : "Usuarios asignados correctamente.",
      );
    } catch {
      toast.error("No se pudo asignar el usuario.");
    } finally {
      setSaving(false);
    }
  };
  const confirmRemove = async () => {
    if (!removeUser || clinicId === null) return;
    setSaving(true);
    try {
      await updateUserClinics(
        removeUser.id,
        (removeUser.clinics || [])
          .filter((clinic) => clinic.id !== clinicId)
          .map((clinic) => clinic.id),
      );
      setUsers((current) =>
        current.map((user) =>
          user.id === removeUser.id
            ? {
                ...user,
                clinics: (user.clinics || []).filter(
                  (clinic) => clinic.id !== clinicId,
                ),
              }
            : user,
        ),
      );
      toast.success("Usuario desasignado correctamente.");
    } catch {
      toast.error("No se pudo desasignar el usuario.");
    } finally {
      setSaving(false);
      setRemoveUser(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[98vh] w-[95vw]! max-w-300! flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5">
            <div className="flex items-start justify-between gap-4 pr-8">
              <div>
                <DialogTitle>Gestionar Usuarios de Clínica</DialogTitle>
                <DialogDescription className="mt-1">
                  {clinicName}
                </DialogDescription>
                <p className="mt-2 text-sm text-muted-foreground">
                  Administra los usuarios que pertenecen a esta clínica y
                  consulta su rol global actual.
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="min-h-0 space-y-6 overflow-y-auto px-6 py-5">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    Usuarios Asignados ({assigned.length})
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    El rol mostrado es el rol global del usuario.
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                {loading ? (
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : assigned.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="font-medium">
                      No hay usuarios asignados a esta clínica.
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Puedes asignar usuarios desde la sección inferior.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol global</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assigned.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar size="sm">
                                <AvatarFallback>
                                  {initials(user.username)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {user.username}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {roleLabels[user.role]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={user.isActive ? "success" : "neutral"}
                            >
                              {user.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRemoveUser(user)}
                              disabled={saving}
                            >
                              <UserMinus className="mr-2 size-4" />
                              Desasignar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </section>
            <section>
              <div className="mb-3">
                <h3 className="font-semibold">Asignar Usuario a la Clínica</h3>
                <p className="text-sm text-muted-foreground">
                  Busca usuarios de la organización que todavía no pertenecen a
                  esta clínica.
                </p>
              </div>
              <div className="mb-4 space-y-1.5">
                <Label htmlFor="clinic-user-search">
                  Buscar usuario por nombre o email
                </Label>
                <Input
                  id="clinic-user-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar usuario por nombre o email..."
                />
              </div>
              <div className="overflow-x-auto rounded-lg border">
                {loading ? (
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : available.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Todos los usuarios ya están asignados a esta clínica.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Seleccionar</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol global</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {available.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox
                              checked={selected.includes(user.id)}
                              onCheckedChange={(checked) =>
                                toggleSelected(user.id, checked === true)
                              }
                              aria-label={`Seleccionar ${user.username}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar size="sm">
                                <AvatarFallback>
                                  {initials(user.username)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {user.username}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {roleLabels[user.role]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => void assignSelected()}
                  disabled={selected.length === 0 || saving}
                >
                  {saving
                    ? "Guardando..."
                    : `Asignar Usuarios (${selected.length})`}
                </Button>
              </div>
            </section>
          </div>
          <div className="flex justify-end border-t px-6 py-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={removeUser !== null}
        onOpenChange={(open) => {
          if (!open && !saving) setRemoveUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desasignar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeUser?.username} dejará de pertenecer a esta clínica. Esta
              acción no elimina el usuario del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(event) => {
                event.preventDefault();
                void confirmRemove();
              }}
            >
              {saving ? "Desasignando..." : "Desasignar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
