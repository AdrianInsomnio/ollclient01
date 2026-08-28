import { get, post, put, del } from "../api-client";

export type DashboardScope = "clinic" | "organization";

export interface ClinicMetrics {
  openConsultations: number;
  closedConsultationsToday: number;
  activeClients: number;
  activePets: number;
  salesToday: {
    count: number;
    total: number;
    tax: number;
    subtotal: number;
  };
}

export interface ClinicWithMetrics {
  id: number;
  name: string;
  isDefault: boolean;
  timezone: string;
  metrics: ClinicMetrics;
}

export interface DashboardTotals {
  salesTodayTotal: number;
  salesTodayTax: number;
  salesTodaySubtotal: number;
  salesTodayCount: number;
  openConsultations: number;
  closedConsultationsToday: number;
  activeClients: number;
  activePets: number;
  clinicsCount: number;
}

export interface DashboardMetrics {
  scope: DashboardScope;
  organization: {
    id: number;
    name: string;
    timezone: string;
  };
  clinics: ClinicWithMetrics[];
  totals: DashboardTotals;
  generatedAt: string;
}

export interface ClinicListItem extends ClinicWithMetrics {
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ClinicListResponse {
  scope: DashboardScope;
  organization: {
    id: number;
    name: string;
  };
  clinics: ClinicListItem[];
  generatedAt: string;
}

export interface UserListItem {
  id: number;
  username: string;
  email: string;
  role: "USER" | "VET" | "ADMIN" | "SUPER_ADMIN";
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  clinicCount: number;
  clinics?: Array<{ id: number; name: string }>;
}

export interface UserListResponse {
  organization: {
    id: number;
    name: string;
  };
  users: UserListItem[];
  generatedAt: string;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  // El backend responde el DashboardMetrics plano, pero toleramos un envoltorio
  // { metrics: DashboardMetrics } por si existiera una version legacy.
  const res = await get<DashboardMetrics | { metrics: DashboardMetrics }>(
    "/admin/dashboard/metrics",
  );
  if (res && typeof res === "object" && "metrics" in res && res.metrics) {
    return res.metrics;
  }
  return res as DashboardMetrics;
}

export async function getAdminClinics(): Promise<ClinicListResponse> {
  return get<ClinicListResponse>("/admin/clinics");
}

export async function getAdminUsers(): Promise<UserListResponse> {
  return get<UserListResponse>("/admin/users");
}

export async function createUser(data: {
  username: string;
  email: string;
  password: string;
  role: "USER" | "VET" | "ADMIN" | "SUPER_ADMIN";
  isActive?: boolean;
}): Promise<{ id: number }> {
  return post<{ id: number }>("/admin/users", data);
}

export async function updateUser(id: number, data: Partial<{
  username: string;
  email: string;
  password: string;
  role: "USER" | "VET" | "ADMIN" | "SUPER_ADMIN";
  isActive: boolean;
}>): Promise<void> {
  return put<void>(`/admin/users/${id}`, data);
}

export async function deleteUser(id: number): Promise<void> {
  return del<void>(`/admin/users/${id}`);
}

export async function updateUserClinics(userId: number, clinicIds: number[]): Promise<void> {
  return put<void>(`/admin/users/${userId}/clinics`, { clinicIds });
}

export async function createClinic(data: {
  name: string;
  rut?: string | null;
  website?: string | null;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  imageVersion?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  organizationId: number;
}): Promise<{ id: number }> {
  return post<{ id: number }>("/superadmin/clinics", data);
}

export async function getClinicsByOrganization(organizationId: number) {
  const response = await get<{ clinics: Array<Record<string, unknown>> }>(
    `/superadmin/clinics/organization/${organizationId}`,
  );
  return response.clinics;
}

export async function updateClinic(id: number, data: Partial<{
  name: string;
  rut?: string | null;
  website?: string | null;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  imageVersion?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  organizationId: number;
}>): Promise<void> {
  return put<void>(`/superadmin/clinics/${id}`, data);
}

export async function deleteClinic(id: number): Promise<void> {
  return del<void>(`/superadmin/clinics/${id}`);
}

