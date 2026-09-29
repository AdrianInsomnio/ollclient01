import { get, post } from "../api-client"

export type PrintPaperType = "THERMAL" | "SHEET"
export type PrintPaperSize = "THERMAL_58" | "THERMAL_80" | "A4" | "LETTER" | "A5" | "LEGAL" | "CUSTOM"
export type PrintOrientation = "PORTRAIT" | "LANDSCAPE"

export interface PrintLocation { id: number; name: string; code: string | null; isActive: boolean }
export interface PrintAgent { id: number; name: string; endpoint: string | null; status: "ONLINE" | "OFFLINE" | "DEGRADED"; location?: PrintLocation | null }
export interface PrinterProfile { id: number; name: string; printerType: string; paperTypes: string[]; capabilities: Record<string, boolean> }
export interface Printer { id: number; name: string; status: string; printerType: string; paperType: PrintPaperType; paperSize: PrintPaperSize; orientation: PrintOrientation; location?: PrintLocation | null; printAgent?: PrintAgent | null; profile?: PrinterProfile | null }
export interface PrintTarget { id: number; code: string; name: string; location?: PrintLocation | null; printer?: Printer | null }
export interface PrintTemplateVersion { id: number; version: number; status: "DRAFT" | "ACTIVE" | "ARCHIVED"; paperType: PrintPaperType; paperSize: PrintPaperSize; orientation: PrintOrientation; definition: Record<string, unknown>; createdAt?: string }
export interface PrintTemplate { id: number; templateKey: string; name: string; documentType: string; isActive: boolean; versions: PrintTemplateVersion[] }
export interface PrintAsset { id: number; name: string; storageKey: string; mimeType: string; width: number | null; height: number | null }

export const getPrintingTemplates = () => get<PrintTemplate[]>("/printing/templates")
export const getPrintingLocations = () => get<PrintLocation[]>("/printing/locations")
export const getPrintingAgents = () => get<PrintAgent[]>("/printing/agents")
export const getPrintingProfiles = () => get<PrinterProfile[]>("/printing/profiles")
export const getPrintingPrinters = () => get<Printer[]>("/printing/printers")
export const getPrintingTargets = () => get<PrintTarget[]>("/printing/targets")
export const getPrintingAssets = () => get<PrintAsset[]>("/printing/assets")

export const createPrintingTemplate = (data: Pick<PrintTemplate, "templateKey" | "name" | "documentType">) =>
  post<PrintTemplate>("/printing/templates", data)

export const createPrintingTemplateVersion = (data: Omit<PrintTemplateVersion, "id" | "createdAt"> & { templateId: number }) =>
  post<PrintTemplateVersion>("/printing/templates/versions", data)
