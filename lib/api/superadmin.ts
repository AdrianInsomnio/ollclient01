import { get, post, put, del } from '../api-client'

  /* -------------------------------------------------
     TIPOS DE DATOS (Plan y Subscription)
     ------------------------------------------------- */
  export interface Plan {
    id: number
    name: string
    description?: string
    price: number
    interval: string
    features: string[]
    isActive: boolean
    organizationId: number
    createdAt: string
    updatedAt: string
  }

  export interface CreatePlanPayload {
    name: string
    description?: string
    price: number
    interval: string
    features: string[]
    organizationId: number
  }
  export type UpdatePlanPayload = Partial<CreatePlanPayload>

  export interface Subscription {
    id: number
    planId: number
    plan: Plan
    organizationId: number
    startDate: string
    endDate?: string | null
    isActive: boolean
    paymentMethod?: string | null
    createdAt: string
    updatedAt: string
  }

  export interface CreateSubscriptionPayload {
    planId: number
    organizationId: number
    startDate: string
    endDate?: string | null
    isActive?: boolean
    paymentMethod?: string | null
  }
  export type UpdateSubscriptionPayload = Partial<CreateSubscriptionPayload>

  /* -------------------------------------------------
     RESPUESTAS DE LA API (envueltas en objetos)
     ------------------------------------------------- */
  interface PlansResponse { plans: Plan[] }
  interface PlanResponse  { plan: Plan }
  interface SubscriptionsResponse { subscriptions: Subscription[] }
  interface SubscriptionResponse { subscription: Subscription }

  /* -------------------------------------------------
     FUNCIONES DE LLAMADA
     ------------------------------------------------- */
  export async function getSuperAdminPlans(): Promise<Plan[]> {
    const resp = await get<PlansResponse>('/superadmin/plans')
    return resp.plans
  }
  export async function getSuperAdminPlan(id: number): Promise<Plan> {
    const resp = await get<PlanResponse>(`/superadmin/plans/${id}`)
    return resp.plan
  }
  export async function createSuperAdminPlan(data: CreatePlanPayload):
  Promise<Plan> {
    const resp = await post<PlanResponse>('/superadmin/plans', data)
    return resp.plan
  }
  export async function updateSuperAdminPlan(id: number, data:
  UpdatePlanPayload): Promise<Plan> {
    const resp = await put<PlanResponse>(`/superadmin/plans/${id}`, data)
    return resp.plan
  }
  export async function deleteSuperAdminPlan(id: number): Promise<void> {
    return del(`/superadmin/plans/${id}`)
  }

  export async function getSuperAdminSubscriptions(): Promise<Subscription[]>
  {
    const resp = await get<SubscriptionsResponse>('/superadmin/subscriptions')
    return resp.subscriptions
  }
  export async function getSuperAdminSubscription(id: number):
  Promise<Subscription> {
    const resp = await get<SubscriptionResponse>(`/superadmin/subscriptions/${id}`)
    return resp.subscription
  }
  export async function createSuperAdminSubscription(data:
  CreateSubscriptionPayload): Promise<Subscription> {
    const resp = await post<SubscriptionResponse>('/superadmin/subscriptions', data)
    return resp.subscription
  }
  export async function updateSuperAdminSubscription(id: number, data:
  UpdateSubscriptionPayload): Promise<Subscription> {
    const resp = await put<SubscriptionResponse>(`/superadmin/subscriptions/${id}`, data)
    return resp.subscription
  }
  export async function deleteSuperAdminSubscription(id: number):
  Promise<void> {
    return del(`/superadmin/subscriptions/${id}`)
  }
  export async function
  getSuperAdminSubscriptionsByOrganization(organizationId: number):
  Promise<Subscription[]> {
    const resp = await get<SubscriptionsResponse>(`/superadmin/subscriptions/organization/${organizationId}`)
    return resp.subscriptions
  }
