import { get, patch, post } from "../api-client"
import type { PrintTemplateDefinition } from "../printing/design-system"

export type PrintPaperType = "THERMAL" | "SHEET"
export type PrintPaperSize = "THERMAL_58" | "THERMAL_80" | "A4" | "LETTER" | "A5" | "LEGAL" | "CUSTOM"
export type PrintOrientation = "PORTRAIT" | "LANDSCAPE"

export interface PrintLocation { id: number; name: string; code: string | null; isActive: boolean }
export interface PrintAgent { id: number; name: string; endpoint: string | null; status: "ONLINE" | "OFFLINE" | "DEGRADED"; location?: PrintLocation | null }
export interface PrinterProfile { id: number; name: string; printerType: string; paperTypes: string[]; capabilities: Record<string, boolean> }
export interface Printer { id: number; name: string; status: string; printerType: string; paperType: PrintPaperType; paperSize: PrintPaperSize; orientation: PrintOrientation; location?: PrintLocation | null; printAgent?: PrintAgent | null; profile?: PrinterProfile | null }
export interface PrintTarget { id: number; code: string; name: string; location?: PrintLocation | null; printer?: Printer | null }
export interface PrintTemplateVersion { id: number; version: number; status: "DRAFT" | "ACTIVE" | "ARCHIVED"; paperType: PrintPaperType; paperSize: PrintPaperSize; orientation: PrintOrientation; definition: PrintTemplateDefinition | string[]; createdAt?: string }
export interface PrintTemplate { id: number; templateKey: string; name: string; documentType: string; isActive: boolean; versions: PrintTemplateVersion[] }
export interface PrintAsset { id: number; name: string; storageKey: string; mimeType: string; width: number | null; height: number | null }
export interface PrintRule { id: number; event: string; targetId: number; templateKey: string; priority: number; isActive: boolean }
export interface PrintJob { id: number; status: string; targetId: number; lastError?: string | null }
export interface PrintBatch { id: number; sourceDocumentType: string; status: string; createdAt: string; jobs: PrintJob[] }

export const getPrintingTemplates = () => get<PrintTemplate[]>("/printing/templates")
export const getPrintingLocations = () => get<PrintLocation[]>("/printing/locations")
export const getPrintingAgents = () => get<PrintAgent[]>("/printing/agents")
export const getPrintingProfiles = () => get<PrinterProfile[]>("/printing/profiles")
export const getPrintingPrinters = () => get<Printer[]>("/printing/printers")
export const getPrintingTargets = () => get<PrintTarget[]>("/printing/targets")
export const getPrintingAssets = () => get<PrintAsset[]>("/printing/assets")
export const getPrintingRules = () => get<PrintRule[]>("/printing/rules")

export const createPrintingTemplate = (data: Pick<PrintTemplate, "templateKey" | "name" | "documentType">) =>
  post<PrintTemplate>("/printing/templates", data)

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

export const deactivatePrintingTemplate = (id: number) =>
  post<{ id: number; resource: 'templates'; isActive: false }>(`/printing/config/templates/${id}/deactivate`, {})

export const deletePrintingTemplate = (id: number) =>
  post<{ id: number; deleted: true }>(`/printing/templates/${id}/delete`, {})

export const createPrintingRule = (data: { event: string; targetId: number; templateKey: string; priority?: number }) =>
	post<PrintRule>("/printing/rules", data)

export const updatePrintingRule = (id: number, data: { event: string; targetId: number; templateKey: string; priority: number }) =>
  patch<PrintRule>(`/printing/rules/${id}`, data)

export const deletePrintingRule = (id: number) =>
	post<{ id: number; deleted: boolean }>(`/printing/rules/${id}/delete`, {})

export const createPrintingTemplateVersion = (data: Omit<PrintTemplateVersion, "id" | "createdAt"> & { templateId: number }) =>
  post<PrintTemplateVersion>("/printing/templates/versions", data)

export const activatePrintingTemplateVersion = (versionId: number) =>
  post<PrintTemplateVersion>(`/printing/templates/versions/${versionId}/activate`, {})

export const deletePrintingTemplateVersion = (versionId: number) =>
  post<{ id: number; status: "DELETED" }>(`/printing/templates/versions/${versionId}/delete`, {})

export const createPrintingAsset = (data: Pick<PrintAsset, "name" | "storageKey" | "mimeType" | "width" | "height">) =>
  post<PrintAsset>("/printing/assets", data)

export const listPrintingBatches = (take: number = 50) => 
	get<PrintBatch[]>(`/printing/batches?take=${take}`)

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
