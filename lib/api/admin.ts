import { get } from '../api-client'

export type DashboardScope = 'clinic' | 'organization'

export interface ClinicMetrics {
  openConsultations: number
  closedConsultationsToday: number
  activeClients: number
  activePets: number
  salesToday: {
    count: number
    total: number
    tax: number
    subtotal: number
  }
}

export interface ClinicWithMetrics {
  id: number
  name: string
  isDefault: boolean
  timezone: string
  metrics: ClinicMetrics
}

export interface DashboardTotals {
  salesTodayTotal: number
  salesTodayTax: number
  salesTodaySubtotal: number
  salesTodayCount: number
  openConsultations: number
  closedConsultationsToday: number
  activeClients: number
  activePets: number
  clinicsCount: number
}

export interface DashboardMetrics {
  scope: DashboardScope
  organization: {
    id: number
    name: string
    timezone: string
  }
  clinics: ClinicWithMetrics[]
  totals: DashboardTotals
  generatedAt: string
}

export interface ClinicListItem extends ClinicWithMetrics {
  address?: string | null
  phone?: string | null
  email?: string | null
  isActive: boolean
  createdAt: string
}

export interface ClinicListResponse {
  scope: DashboardScope
  organization: {
    id: number
    name: string
    timezone: string
  }
  clinics: ClinicListItem[]
  generatedAt: string
}

export interface UserListItem {
  id: number
  username: string
  email: string
  role: 'USER' | 'VET' | 'ADMIN' | 'SUPER_ADMIN'
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  clinicCount: number
}

export interface UserListResponse {
  organization: { id: number; name: string }
  users: UserListItem[]
  generatedAt: string
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await get<{ metrics: DashboardMetrics }>('/admin/dashboard/metrics')
  return res.metrics
}

export async function getAdminClinics(): Promise<ClinicListResponse> {
  return get<ClinicListResponse>('/admin/clinics')
}

export async function getAdminUsers(): Promise<UserListResponse> {
  return get<UserListResponse>('/admin/users')
}
