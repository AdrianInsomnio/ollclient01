import { get, patch, post } from "../api-client"
import { useAuthStore } from "../auth-store"
import type { PrintTemplateDefinition } from "../printing/design-system"

export type PrintPaperType = "THERMAL" | "SHEET"
export type PrintPaperSize = "THERMAL_58" | "THERMAL_80" | "A4" | "LETTER" | "A5" | "LEGAL" | "CUSTOM"
export type PrintOrientation = "PORTRAIT" | "LANDSCAPE"

export interface PrintLocation { id: number; name: string; code: string | null; isActive: boolean }
export interface PrintAgent { id: number; name: string; endpoint: string | null; status: "ONLINE" | "OFFLINE" | "DEGRADED"; location?: PrintLocation | null }
export interface PrinterProfile { id: number; name: string; printerType: string; paperTypes: string[]; capabilities: Record<string, boolean> }
export interface Printer { id: number; name: string; status: string; printerType: string; paperType: PrintPaperType; paperSize: PrintPaperSize; orientation: PrintOrientation; location?: PrintLocation | null; printAgent?: PrintAgent | null; profile?: PrinterProfile | null }
export interface PrintTarget { id: number; code: string; name: string; isActive: boolean; location?: PrintLocation | null; printer?: Printer | null }
export interface PrintTemplateVersion { id: number; version: number; status: "DRAFT" | "ACTIVE" | "ARCHIVED"; paperType: PrintPaperType; paperSize: PrintPaperSize; orientation: PrintOrientation; definition?: PrintTemplateDefinition | string[]; createdAt?: string }
export interface PrintTemplate { id: number; templateKey: string; name: string; documentType: string; isActive: boolean; versions: PrintTemplateVersion[] }
export interface PrintAsset { id: number; name: string; storageKey: string; mimeType: string; width: number | null; height: number | null }
export interface PrintRuleOutput { id: number; name: string; targetId: number; templateKey: string; priority: number; copies: number; isActive: boolean; target?: PrintTarget | null }
export interface PrintRule { id: number; name: string; event: string; priority: number; isActive: boolean; targetId?: number | null; templateKey?: string | null; outputs: PrintRuleOutput[]; createdAt?: string; updatedAt?: string }
export interface PrintJob { id: number; status: string; targetId: number; lastError?: string | null }
export interface PrintBatch { id: number; sourceDocumentType: string; status: string; createdAt: string; jobs: PrintJob[] }

const SHARED_LIST_CACHE_TTL_MS = 15_000

function createPrintingListCache<T>() {
  let scope: string | null = null
  let generation = 0
  let cached: { value: T; expiresAt: number } | null = null
  let inFlight: Promise<T> | null = null

  return {
    get(loader: () => Promise<T>, nextScope: string | null, force = false): Promise<T> {
      if (!nextScope) return loader()
      if (scope !== nextScope) {
        scope = nextScope
        generation += 1
        cached = null
        inFlight = null
      }
      if (inFlight) return inFlight
      if (!force && cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value)

      const requestGeneration = generation
      const request = loader().then((value) => {
        if (generation === requestGeneration) cached = { value, expiresAt: Date.now() + SHARED_LIST_CACHE_TTL_MS }
        return value
      }).finally(() => {
        if (inFlight === request) inFlight = null
      })
      inFlight = request
      return request
    },
    invalidate() {
      generation += 1
      cached = null
      inFlight = null
    },
  }
}

const templatesCache = createPrintingListCache<PrintTemplate[]>()
const rulesCache = createPrintingListCache<PrintRule[]>()

function getPrintingCacheScope() {
  const { tenantId, token, user } = useAuthStore.getState()
  if (!tenantId || !user?.id) return null
  return `${tenantId}:${user.id}:${user.role}:${token ?? "cookie"}`
}

export const getPrintingTemplates = (force = false) =>
	templatesCache.get(() => get<PrintTemplate[]>("/printing/templates/summary"), getPrintingCacheScope(), force)
export const getPrintingTemplateDetails = (id: number) =>
	get<PrintTemplate>(`/printing/templates/${id}`)
export const getPrintingLocations = () => get<PrintLocation[]>("/printing/locations")
export const getPrintingAgents = () => get<PrintAgent[]>("/printing/agents")
export const getPrintingProfiles = () => get<PrinterProfile[]>("/printing/profiles")
export const getPrintingPrinters = () => get<Printer[]>("/printing/printers")
export const getPrintingTargets = () => get<PrintTarget[]>("/printing/targets")
export const getPrintingAssets = () => get<PrintAsset[]>("/printing/assets")
export const getPrintingRules = (force = false) =>
  rulesCache.get(() => get<PrintRule[]>("/printing/rules"), getPrintingCacheScope(), force)

export const createPrintingTemplate = async (data: Pick<PrintTemplate, "templateKey" | "name" | "documentType">) => {
  const template = await post<PrintTemplate>("/printing/templates", data)
  templatesCache.invalidate()
  return template
}

export const createPrintingLocation = (data: Pick<PrintLocation, "name" | "code">) =>
  post<PrintLocation>("/printing/locations", data)

export const createPrintingPrinter = (data: { 
  name: string; 
  locationId: number; 
  printAgentId?: number; 
  profileId?: number; 
  printerType: string; 
  paperType: PrintPaperType; 
  paperSize: PrintPaperSize; 
  orientation: PrintOrientation 
}) => post<Printer>("/printing/printers", data)

export const createPrintingTarget = (data: { 
  code: string; 
  name: string; 
  locationId: number; 
  printerId?: number 
}) => post<PrintTarget>("/printing/targets", data)

export const deletePrintingLocation = (id: number) =>
	post<{ id: number; isActive?: boolean }>(`/printing/locations/${id}/delete`, {})

export const deactivatePrintingTemplate = async (id: number) => {
  const result = await post<{ id: number; resource: 'templates'; isActive: false }>(`/printing/config/templates/${id}/deactivate`, {})
  templatesCache.invalidate()
  return result
}

export const deletePrintingTemplate = async (id: number) => {
  const result = await post<{ id: number; deleted: true }>(`/printing/templates/${id}/delete`, {})
  templatesCache.invalidate()
  rulesCache.invalidate()
  return result
}

export type PrintRuleInput = Pick<PrintRule, "name" | "event" | "isActive" | "priority"> & { outputs: Array<Omit<PrintRuleOutput, "id" | "target"> & { id?: number }> }

export const createPrintingRule = async (data: PrintRuleInput | { event: string; targetId: number; templateKey: string; priority?: number }) => {
  const rule = await post<PrintRule>("/printing/rules", data)
  rulesCache.invalidate()
  return rule
}

export const updatePrintingRule = async (id: number, data: Partial<PrintRuleInput> | { event?: string; targetId?: number; templateKey?: string; priority?: number; outputName?: string; copies?: number; outputIsActive?: boolean }) => {
  const rule = await patch<PrintRule>(`/printing/rules/${id}`, data)
  rulesCache.invalidate()
  return rule
}

export const deletePrintingRule = async (id: number) => {
  const result = await post<{ id: number; deleted: boolean }>(`/printing/rules/${id}/delete`, {})
  rulesCache.invalidate()
  return result
}

export const createPrintingTemplateVersion = async (data: Omit<PrintTemplateVersion, "id" | "createdAt"> & { templateId: number }) => {
  const version = await post<PrintTemplateVersion>("/printing/templates/versions", data)
  templatesCache.invalidate()
  return version
}

export const activatePrintingTemplateVersion = async (versionId: number) => {
  const version = await post<PrintTemplateVersion>(`/printing/templates/versions/${versionId}/activate`, {})
  templatesCache.invalidate()
  return version
}

export const deletePrintingTemplateVersion = async (versionId: number) => {
  const result = await post<{ id: number; status: "DELETED" }>(`/printing/templates/versions/${versionId}/delete`, {})
  templatesCache.invalidate()
  return result
}

export const createPrintingAsset = (data: Pick<PrintAsset, "name" | "storageKey" | "mimeType" | "width" | "height">) =>
  post<PrintAsset>("/printing/assets", data)

export const listPrintingBatches = (take: number = 50, skip: number = 0) =>
	get<PrintBatch[]>(`/printing/batches?take=${take}&skip=${skip}`)

export const retryPrintingJob = (jobId: number) => 
	post<PrintJob>(`/printing/jobs/${jobId}/retry`, {})





export interface PrintTestResult {
  success: boolean
  test: boolean
  bytes: number
  contractVersion: number
}

function isLocalPrintAgent(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "")
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) return true

  const octets = host.split(".").map(Number)
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false
  return octets[0] === 10 || octets[0] === 127 || octets[0] === 192 && octets[1] === 168 || octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31
}

export async function sendPrintTest(agentUrl: string, apiKey: string, paperSize: PrintPaperSize): Promise<PrintTestResult> {
  let url: URL
  try {
    url = new URL(agentUrl)
  } catch {
    throw new Error("Ingresa una URL válida para OLLPrintAgent")
  }
  if (!['http:', 'https:'].includes(url.protocol) || !isLocalPrintAgent(url.hostname)) {
    throw new Error("Por seguridad, el Agent debe estar en localhost o en una dirección privada de la red")
  }
  if (!apiKey.trim()) throw new Error("Ingresa la API key del Agent")

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(new URL("/api/print/test", url.origin), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey.trim() },
      body: JSON.stringify({ paperSize }),
      cache: "no-store",
      signal: controller.signal,
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.message || payload.error || `OLLPrintAgent respondió HTTP ${response.status}`)
    return payload as PrintTestResult
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("OLLPrintAgent no respondió en 15 segundos")
    if (error instanceof TypeError) throw new Error("No se pudo conectar con OLLPrintAgent. Revisa URL, CORS y que el Agent esté ejecutándose")
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}
