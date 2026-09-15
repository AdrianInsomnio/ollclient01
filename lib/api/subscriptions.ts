import { get } from '../api-client'
import { patch as patchRequest, post } from '../api-client'

export type MedicalPlan = {
  id: number
  name: string
  description?: string | null
  price: number
  benefits: unknown
  periodicity: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL'
  maxPets: number
  status: 'ACTIVE' | 'INACTIVE'
  applyLateFee: boolean
  lateFeeType: 'NONE' | 'FIXED' | 'PERCENTAGE'
  lateFeeValue: number
}

export async function getMedicalPlans(includeInactive = true) {
  const response = await get<{ plans: MedicalPlan[] }>(`/veterinary-plans?includeInactive=${includeInactive}`)
  return response.plans
}

export async function createMedicalPlan(data: Omit<MedicalPlan, 'id' | 'status'>) {
  const response = await post<{ plan: MedicalPlan }>('/veterinary-plans', data)
  return response.plan
}

export async function updateMedicalPlan(id: number, data: Partial<Omit<MedicalPlan, 'id' | 'status'>>) {
  const response = await patchRequest<{ plan: MedicalPlan }>(`/veterinary-plans/${id}`, data)
  return response.plan
}

export async function setMedicalPlanStatus(id: number, status: MedicalPlan['status']) {
  const response = await patchRequest<{ plan: MedicalPlan }>(`/veterinary-plans/${id}/status`, { status })
  return response.plan
}

export type SubscriptionInstallment = {
  id: number
  periodStart: string
  periodEnd: string
  dueDate: string
  amount: number
  lateFee: number
  totalAmount: number
  status: 'PENDING' | 'PAID' | 'CANCELLED'
  paidAt?: string | null
  saleId?: number | null
}

export type ClientSubscriptionSummary = {
  clientId: number
  subscription: {
    id: number
    status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED'
    contractedPrice: number
    periodicity: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL'
    nextDueDate?: string | null
    suspensionReason?: string | null
    medicalPlan: { id: number; name: string; description?: string | null }
    pets: Array<{ pet: { id: number; name: string; species: string } }>
  } | null
  installments: SubscriptionInstallment[]
  nextDueDate?: string | null
}

export async function getClientSubscriptionSummary(clientId: string | number) {
  const response = await get<{ summary: ClientSubscriptionSummary }>(
    `/clients/${clientId}/subscription-summary`,
  )
  return response.summary
}

export async function getClientInstallments(
  clientId: string | number,
  status: 'PENDING' | 'PAID' | 'CANCELLED' = 'PENDING',
) {
  const response = await get<{ installments: SubscriptionInstallment[] }>(
    `/subscription-installments/client/${clientId}?status=${status}`,
  )
  return response.installments
}

export type MonthlySubscriptionSummary = {
  month: string
  expectedCount: number
  expectedAmount: number
  collectedCount: number
  collectedAmount: number
  pendingCount: number
  pendingAmount: number
  overdueCount: number
  overdueAmount: number
  collectionPercentage: number
  activeSubscriptions: number
  suspendedSubscriptions: number
  expiredSubscriptions: number
  cancelledSubscriptions: number
}

export async function getMonthlySubscriptionSummary(month: string, clinicId?: number) {
  const query = new URLSearchParams({ month })
  if (clinicId) query.set('clinicId', String(clinicId))
  const response = await get<{ summary: MonthlySubscriptionSummary }>(
    `/subscription-installments/admin/monthly-summary?${query.toString()}`,
  )
  return response.summary
}

export async function createVeterinarySubscription(data: {
  clientId: number
  medicalPlanId: number
  petIds: number[]
  startDate?: string
}) {
  const response = await post<{ subscription: ClientSubscriptionSummary['subscription'] }>(
    '/veterinary-subscriptions',
    data,
  )
  return response.subscription
}

export async function generateSubscriptionInstallments(subscriptionId: number, count: number) {
  const response = await post<{ installments: SubscriptionInstallment[] }>(
    `/subscription-installments/subscription/${subscriptionId}/generate`,
    { count },
  )
  return response.installments
}
