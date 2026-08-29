import { get, patch, post } from "../api-client";

export type CashShiftStatus = "OPEN" | "CLOSED" | "CANCELLED";
export type CashMovementType = "CASH_IN" | "CASH_OUT" | "ADJUSTMENT";

export interface CashRegister { id: number; name: string; code?: string | null }
export interface CashUser { id: number; username: string; email?: string | null }
export interface CashShift {
  id: number; status: CashShiftStatus; openedAt: string; closedAt?: string | null;
  openingAmount: number | string; expectedAmount?: number | string | null;
  countedAmount?: number | string | null; difference?: number | string | null;
  cashRegister: CashRegister; user: CashUser;
}
export interface CashMovement {
  id: number; type: CashMovementType; amount: number | string; reason?: string | null;
  notes?: string | null; createdAt: string; user: CashUser;
  cashShift: { id: number; cashRegister: CashRegister };
}
export interface CashSale { id: number; total: number | string; status: string; paymentMethod?: string | null; createdAt: string }
export interface CashFilters {
  dateFrom?: string; dateTo?: string; status?: string; cashRegisterId?: number;
  userId?: number; hasDifference?: boolean; cashShiftId?: number; type?: CashMovementType;
  page?: number; pageSize?: number;
}
export interface Paginated<T> { items: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }
export interface CashSummary {
  period: { from: string | null; to: string | null };
  sales: { count: number; total: string };
  payments: { cash: string; debitCard: string; creditCard: string; bankTransfer: string };
  movements: { cashIn: string; cashOut: string };
  shifts: { open: number; closed: number; withDifference: number };
}

export interface CashShiftDetail extends CashShift {
  clinic: { id: number; name: string };
  payments: Array<{ id: string; method: string; amount: number | string; paidAt: string; fiscalDocument?: unknown }>;
  paymentSummary: Record<string, string>;
  sales: CashSale[];
  movements: Array<CashMovement>;
}

const queryString = (filters: CashFilters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params.toString();
};

export const getCashSummary = (filters: CashFilters) => get<CashSummary>(`/cash/admin/summary?${queryString(filters)}`);
export const getCashShifts = (filters: CashFilters) => get<Paginated<CashShift>>(`/cash/admin/shifts?${queryString(filters)}`);
export const getCashShift = (id: number) => get<CashShiftDetail>(`/cash/admin/shifts/${id}`);
export const getCashMovements = (filters: CashFilters) => get<Paginated<CashMovement>>(`/cash/admin/movements?${queryString(filters)}`);
export const createCashAdjustment = (id: number, data: { amount: string; reason: string; notes?: string }) => post<CashMovement>(`/cash/admin/shifts/${id}/adjustment`, data);
export const getCashRegisters = () => get<{ success?: boolean; data: CashRegister[] }>("/cash").then((response) => response.data ?? []);

export interface AdminCashRegister extends CashRegister {
  isActive: boolean;
  clinicId: number;
  createdAt: string;
  updatedAt: string;
  shifts: Array<{ id: number; status: string; openedAt: string; closedAt?: string | null; user?: CashUser | null }>;
  clinic?: { id: number; name: string };
}

export const getAdminCashRegisters = (status?: "active" | "disabled" | "all") => get<{ success: boolean; data: AdminCashRegister[] }>(`/cash/admin/registers${status ? `?status=${status}` : ""}`).then((response) => response.data);
export const getAdminCashRegister = (id: number) => get<{ success: boolean; data: AdminCashRegister }>(`/cash/admin/registers/${id}`).then((response) => response.data);
export const createAdminCashRegister = (data: { name: string; code?: string }) => post<{ success: boolean; data: AdminCashRegister }>("/cash/admin/registers", data).then((response) => response.data);
export const updateAdminCashRegister = (id: number, data: { name: string; code?: string }) => patch<{ success: boolean; data: AdminCashRegister }>(`/cash/admin/registers/${id}`, data).then((response) => response.data);
export const updateAdminCashRegisterStatus = (id: number, isActive: boolean) => patch<{ success: boolean; data: AdminCashRegister }>(`/cash/admin/registers/${id}/status`, { isActive }).then((response) => response.data);
