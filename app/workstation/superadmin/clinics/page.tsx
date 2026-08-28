"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import {
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Pagination,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Form,
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  Label,
  Input,
  Select,
  Switch,
  Textarea,
  Separator,
} from "@/components/ui";
import {
  createClinic,
  getClinicsByOrganization,
  updateClinic,
  deleteClinic,
} from "@/lib/api/admin";
import { Edit, Trash2, UserPlus } from "lucide-react";
import { ClinicUsersModal } from "@/components/clinics/clinic-users-modal";

// Types for clinic data
type Clinic = {
  id: number;
  name: string;
  rut: string | null;
  website: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  imageVersion: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isDefault: boolean;
  organizationId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type PaginatedResponse = {
  clinics: Clinic[];
  total: number;
};

// Helper function to format dates
const formatDate = (iso: string | null): string => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-UY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const formatDateTime = (iso: string | null): string => {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleString("es-UY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function SuperAdminClinicsPage() {
  const { user } = useAuthStore();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClinicId, setEditingClinicId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Clinic>>({});
  const [usersClinic, setUsersClinic] = useState<Clinic | null>(null);

  // Fetch clinics with pagination
  const fetchClinics = async () => {
    setLoading(true);
    try {
      if (!user?.organizationId) return;
      const items = await getClinicsByOrganization(user.organizationId);
      const start = (page - 1) * limit;
      setClinics(items.slice(start, start + limit) as Clinic[]);
      setTotal(items.length);
      return;
      const response = await fetch(
        "/api/clinics?page=" + page + "&limit=" + limit,
      );
      if (!response.ok) throw new Error("Error al obtener clínicas");
      const data: PaginatedResponse = await response.json();
      setClinics(data.clinics);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron cargar las clínicas");
    } finally {
      setLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (value: number) => {
    setPage(value);
  };

  // Handle limit change
  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLimit(Number(e.target.value));
    setPage(1); // Reset to first page when changing limit
  };

  // Open create clinic dialog
  const handleCreateClinic = () => {
    setEditingClinicId(null);
    setFormData({
      name: "",
      rut: "",
      website: "",
      imageUrl: "",
      imagePublicId: "",
      imageVersion: "",
      address: "",
      phone: "",
      email: "",
      isDefault: false,
      isActive: true,
      organizationId: 1,
    });
    setDialogOpen(true);
  };

  // Open edit clinic dialog
  const handleEditClinic = (clinic: Clinic) => {
    setEditingClinicId(clinic.id);
    setFormData({
      id: clinic.id,
      name: clinic.name,
      rut: clinic.rut ?? "",
      website: clinic.website ?? "",
      imageUrl: clinic.imageUrl ?? "",
      imagePublicId: clinic.imagePublicId ?? "",
      imageVersion: clinic.imageVersion ?? "",
      address: clinic.address ?? "",
      phone: clinic.phone ?? "",
      email: clinic.email ?? "",
      isDefault: clinic.isDefault,
      isActive: clinic.isActive,
      organizationId: clinic.organizationId,
    });
    setDialogOpen(true);
  };

  const handleAddUserToClinic = (id: number) => {
    const clinic = clinics.find((item) => item.id === id);
    if (clinic) setUsersClinic(clinic);
  };
  // Close dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingClinicId(null);
    setFormData({});
  };

  const handleClinicUserList = (id: number) => {
    const clinic = clinics.find((item) => item.id === id);
    if (clinic) setUsersClinic(clinic);
  };

  // Handle form input changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle form submission (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingClinicId) {
        await updateClinic(editingClinicId, {
          name: formData.name ?? "",
          rut: formData.rut,
          website: formData.website,
          imageUrl: formData.imageUrl,
          imagePublicId: formData.imagePublicId,
          imageVersion: formData.imageVersion,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          isDefault: formData.isDefault,
          isActive: formData.isActive,
          organizationId: formData.organizationId,
        });
        toast.success("Clínica actualizada correctamente");
      } else {
        await createClinic({
          name: formData.name ?? "",
          rut: formData.rut,
          website: formData.website,
          imageUrl: formData.imageUrl,
          imagePublicId: formData.imagePublicId,
          imageVersion: formData.imageVersion,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          isDefault: formData.isDefault,
          isActive: formData.isActive,
          organizationId: Number(formData.organizationId),
        });
        toast.success("Clínica creada correctamente");
      }

      await fetchClinics();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving clinic:", error);
      if (error instanceof Error && error.message.includes("Validation")) {
        toast.error("Error de validación: " + error.message);
      } else {
        toast.error("No se pudo guardar la clínica");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle clinic deletion
  const handleDeleteClinic = async (id: number) => {
    if (!window.confirm("¿Estás seguro de eliminar esta clínica?")) return;

    setLoading(true);
    try {
      await deleteClinic(id);
      toast.success("Clínica eliminada correctamente");
      await fetchClinics();
    } catch (error) {
      console.error("Error deleting clinic:", error);
      if (
        error instanceof Error &&
        (error.message.includes("foreign key") ||
          error.message.includes("referenced") ||
          error.message.includes("restrict"))
      ) {
        toast.error(
          "No se puede eliminar la clínica porque tiene registros asociados (citas, pacientes, etc.)",
        );
      } else {
        toast.error("No se pudo eliminar la clínica");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinics();
  }, [page, limit, user?.organizationId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestión de Clínicas</h1>
        <Button variant="default" onClick={handleCreateClinic} className="ml-4">
          Nueva Clínica
        </Button>
      </div>

      {clinics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase">Total</p>
            <p className="text-2xl font-bold mt-1">{clinics.length}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase">Activas</p>
            <p className="text-2xl font-bold mt-1">
              {clinics.filter((c) => c.isActive).length}
            </p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase">Inactivas</p>
            <p className="text-2xl font-bold mt-1">
              {clinics.filter((c) => !c.isActive).length}
            </p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase">Por defecto</p>
            <p className="text-2xl font-bold mt-1">
              {clinics.filter((c) => c.isDefault).length}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="flex justify-center items-center space-x-3">
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-500"></div>
              <span>Cargando clínicas...</span>
            </div>
          </div>
        ) : clinics.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-lg font-semibold text-gray-800">
              Aún no hay clínicas
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Las clínicas se crean desde el panel de administración.
            </p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Predeterminada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Activa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Creada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clinics.map((clinic) => (
                  <tr key={clinic.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {clinic.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {clinic.phone || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {clinic.email || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {clinic.isDefault ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          Sí
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {clinic.isActive ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Sí
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(clinic.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium space-x-2 flex-col items-center justify-center">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleEditClinic(clinic)}
                      >
                        <Edit className="h-4 w-4" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleClinicUserList(clinic.id)}
                      >
                        <UserPlus className="h-4 w-4" /> Listado Usuario
                      </Button>
                      <Button
                        variant="default"
                        size="xs"
                        onClick={() => handleAddUserToClinic(clinic.id)}
                      >
                        <UserPlus className="h-4 w-4" /> Agregar Usuario
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => handleDeleteClinic(clinic.id)}
                      >
                        <Trash2 className="h-4 w-4" /> Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-6 py-4 border-t flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Mostrando {clinics.length} de {total} clínicas
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={limit}
                  onChange={handleLimitChange}
                  className="border rounded px-2 py-1"
                >
                  {[10, 25, 50, 100].map((value) => (
                    <option key={value} value={value}>
                      {value} por página
                    </option>
                  ))}
                </select>
                <Pagination
                  page={page}
                  totalPages={Math.max(1, Math.ceil(total / limit))}
                  onPageChange={handlePageChange}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
        <DialogTrigger asChild>
          <Button variant="outline" onClick={handleCreateClinic}>
            {editingClinicId ? "Editar Clínica" : "Nueva Clínica"}
          </Button>
        </DialogTrigger>
        <DialogContent className="w-125 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClinicId ? "Editar Clínica" : "Nueva Clínica"}
            </DialogTitle>
            <DialogDescription>
              Completa el formulario para crear o editar una clínica
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Form>
              <FormField>
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      name="name"
                      value={formData.name ?? ""}
                      onChange={handleFormChange}
                      required
                      placeholder="Nombre de la clínica"
                    />
                  </FormControl>
                </FormItem>
              </FormField>

              <FormField>
                <FormItem>
                  <FormLabel>RUT</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      name="rut"
                      value={formData.rut ?? ""}
                      onChange={handleFormChange}
                      placeholder="Rol Único Tributario (opcional)"
                    />
                  </FormControl>
                </FormItem>
              </FormField>

              <FormField>
                <FormItem>
                  <FormLabel>Sitio Web</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      name="website"
                      value={formData.website ?? ""}
                      onChange={handleFormChange}
                      placeholder="https://ejemplo.com"
                    />
                  </FormControl>
                </FormItem>
              </FormField>

              <FormField>
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      name="address"
                      value={formData.address ?? ""}
                      onChange={handleFormChange}
                      placeholder="Dirección completa"
                    />
                  </FormControl>
                </FormItem>
              </FormField>

              <FormField>
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      name="phone"
                      value={formData.phone ?? ""}
                      onChange={handleFormChange}
                      placeholder="Número de teléfono"
                    />
                  </FormControl>
                </FormItem>
              </FormField>

              <FormField>
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email ?? ""}
                      onChange={handleFormChange}
                      placeholder="contacto@clinica.com"
                    />
                  </FormControl>
                </FormItem>
              </FormField>

              <FormField>
                <FormItem>
                  <FormLabel>Predeterminada</FormLabel>
                  <FormControl>
                    <Switch
                      name="isDefault"
                      checked={formData.isDefault}
                      onChange={handleFormChange}
                    />
                  </FormControl>
                </FormItem>
              </FormField>

              <FormField>
                <FormItem>
                  <FormLabel>Activa</FormLabel>
                  <FormControl>
                    <Switch
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleFormChange}
                    />
                  </FormControl>
                </FormItem>
              </FormField>
            </Form>

            <Separator className="my-4" />

            <DialogFooter>
              <Button variant="secondary" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="w-20">
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ClinicUsersModal
        open={usersClinic !== null}
        onOpenChange={(open) => { if (!open) setUsersClinic(null); }}
        clinicId={usersClinic?.id ?? null}
        clinicName={usersClinic?.name ?? ""}
      />
    </div>
  );
}
