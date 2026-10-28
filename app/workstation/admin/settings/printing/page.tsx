"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, FileText, LoaderCircle, Printer, RefreshCw, Save, Send, Plus, RotateCcw, History, MapPin, Trash2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { ApiError } from "@/lib/api-client"
import { 
  createPrintingAsset, 
  createPrintingTemplate, 
  createPrintingTemplateVersion, 
  getPrintingAssets, 
  getPrintingPrinters, 
  getPrintingTargets, 
  getPrintingTemplates, 
  deletePrintingTemplate,
  getPrintingLocations,
  sendPrintTest, 
  createPrintingPrinter,
  createPrintingTarget,
  createPrintingLocation,
  deletePrintingLocation,
  listPrintingBatches,
  retryPrintingJob,
  type PrintAsset, 
  type PrintPaperSize, 
  type PrintTarget, 
  type PrintTemplate,
  type PrintTemplateVersion,
  type PrintBatch,
  type PrintRule,
  type PrintRuleInput,
  type PrintOrientation,
  type PrintPaperType,
  type PrintLocation,
  getPrintingRules,
  createPrintingRule,
  deletePrintingRule,
  updatePrintingRule
} from "@/lib/api/printing"
import { 
  PrintElementType, 
  PrintElement, 
  PrintTemplateDefinition, 
  PRINT_FIELDS_REGISTRY,
  type PrintElementProperties,
} from "@/lib/printing/design-system"

const sampleItems = [
  { name: "Consulta clínica", quantity: 1, total: 850 },
  { name: "Antiparasitario", quantity: 1, total: 420 },
]

type EditorState = { 
  name: string; 
  templateKey: string; 
  documentType: string; 
  paperSize: PrintPaperSize;
  definition: PrintTemplateDefinition;
}
type PreviewData = {
  company: { name: string; address: string }
  document: { number: string; date: string }
  customer: { name: string; document: string }
  totals: { subtotal: number; discount: number; tax: number; total: number }
  payments: Array<{ method: string; amount: number }>
}

export default function PrintingSettingsPage() {
  const [templates, setTemplates] = useState<PrintTemplate[]>([])
  const [targets, setTargets] = useState<PrintTarget[]>([])
  const [printers, setPrinters] = useState<Array<{ id: number; name: string; paperSize: string; status: string }>>([])
  const [locations, setLocations] = useState<PrintLocation[]>([])
  const [rules, setRules] = useState<PrintRule[]>([])
  const [assets, setAssets] = useState<PrintAsset[]>([])
  const [batches, setBatches] = useState<PrintBatch[]>([])
  const [agentUrl, setAgentUrl] = useState("http://localhost:3333")
  const [agentApiKey, setAgentApiKey] = useState("")
  const [testPaperSize, setTestPaperSize] = useState<PrintPaperSize>("THERMAL_80")
  const [testingPrint, setTestingPrint] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [editor, setEditor] = useState<EditorState>({ 
    name: "Ticket de venta", 
    templateKey: "sale-default", 
    documentType: "SALE", 
    paperSize: "THERMAL_80",
    definition: {
      globalSettings: { defaultAlignment: 'left' },
      elements: [
        { id: '1', type: 'LOGO', properties: { alignment: 'center' } },
        { id: '2', type: 'TEXT', fieldKey: 'document.number', label: 'Venta Nº', properties: { alignment: 'center', fontWeight: 'bold' } },
        { id: '3', type: 'SEPARATOR', properties: {} },
        { id: '4', type: 'ITEM_LIST', properties: {} },
        { id: '5', type: 'SEPARATOR', properties: {} },
        { id: '6', type: 'TOTALS', properties: { alignment: 'right' } },
      ]
    }
  })

  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false)
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PrintRule | null>(null)
  const [savingRule, setSavingRule] = useState(false)
  const [activeTab, setActiveTab] = useState("rules")
  const loadInFlight = useRef<Promise<void> | null>(null)

  const selected = useMemo(() => templates.find((template) => template.id === selectedId) ?? null, [selectedId, templates])
  const activeVersion = selected?.versions?.[0]
  const activeTargets = targets.filter((target) => target.isActive)
  const onlineTargets = activeTargets.filter((target) => target.printer?.printAgent?.status === "ONLINE").length
  const isConnectedEvent = (event: string) => event === "SALE" || event === "CANCELLATION"

  function load() {
    if (loadInFlight.current) return loadInFlight.current

    const request = (async () => {
      setLoading(true)
      setError(null)
      const failedResources: string[] = []
      const loadData = async <T,>(fn: () => Promise<T>, setter: (data: T) => void, resourceName: string) => {
        try {
          setter(await fn())
        } catch (cause) {
          const message = cause instanceof ApiError ? cause.message : "Error de red"
          failedResources.push(`${resourceName}: ${message}`)
          console.error(`Error cargando ${resourceName}:`, cause)
        }
      }

      await Promise.all([
        loadData(getPrintingTemplates, setTemplates, "Templates"),
        loadData(getPrintingTargets, setTargets, "Targets"),
        loadData(getPrintingPrinters, setPrinters, "Printers"),
        loadData(getPrintingAssets, setAssets, "Assets"),
        loadData(() => listPrintingBatches(50), setBatches, "Batches"),
        loadData(getPrintingLocations, setLocations, "Locations"),
        loadData(getPrintingRules, setRules, "Rules"),
      ])
      if (failedResources.length) setError(`No se pudo cargar ${failedResources.join("; ")}`)
    })()

    loadInFlight.current = request.finally(() => {
      setLoading(false)
      loadInFlight.current = null
    })
    return loadInFlight.current
  }

  useEffect(() => { void load() }, [])

  const openLocationModal = () => setIsLocationModalOpen(true);
  const openPrinterModal = () => setIsPrinterModalOpen(true);
  const openTargetModal = () => setIsTargetModalOpen(true);
  const openRuleModal = (rule?: PrintRule) => { setEditingRule(rule ?? null); setIsRuleModalOpen(true); };

  function selectTemplate(template: PrintTemplate) { setSelectedId(template.id) }

    async function createTemplate() {
    try {
      const templateKey = editor.templateKey.trim()
      const latestTemplates = await getPrintingTemplates()
      setTemplates(latestTemplates)
      const existing = latestTemplates.find((template) => template.templateKey === templateKey)
      const created = existing ?? await createPrintingTemplate({ templateKey, name: editor.name, documentType: editor.documentType })
      const nextVersion = Math.max(0, ...(existing?.versions ?? []).map((version) => version.version)) + 1
      await createPrintingTemplateVersion({ 
        templateId: created.id, 
        version: nextVersion,
        status: "DRAFT", 
        paperType: editor.paperSize.startsWith("THERMAL") ? "THERMAL" : "SHEET", 
        paperSize: editor.paperSize, 
        orientation: "PORTRAIT", 
        definition: editor.definition 
      })
      setSelectedId(created.id)
      toast.success(existing ? `Se guardó la versión ${nextVersion} de la plantilla existente` : "Template creado con éxito")
      await load()
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : "No se pudo crear el template") }
  }

  async function handleSaveVersion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (!selected) return
    try {
      await createPrintingTemplateVersion({
        templateId: selected.id,
        version: Number(form.get("version")),
        status: String(form.get("status")) as PrintTemplateVersion["status"],
        paperType: editor.paperSize.startsWith("THERMAL") ? "THERMAL" : "SHEET",
        paperSize: editor.paperSize,
        orientation: String(form.get("orientation") || "PORTRAIT") as PrintOrientation,
        definition: editor.definition
      })
      toast.success("Nueva versión guardada")
      setIsVersionModalOpen(false)
      await load()
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : "Error al guardar versión") }
  }

  async function createAsset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await createPrintingAsset({ name: String(form.get("assetName") || ""), storageKey: String(form.get("storageKey") || ""), mimeType: "image/png", width: null, height: null })
      toast.success("Asset registrado")
      event.currentTarget.reset()
      await load()
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : "No se pudo registrar el asset") }
  }

  async function runPrintTest() {
    setTestingPrint(true)
    try {
      const result = await sendPrintTest(agentUrl, agentApiKey, testPaperSize)
      toast.success(`Prueba enviada al Agent · ${result.bytes} bytes`)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo enviar la prueba")
    } finally { setTestingPrint(false) }
  }

  async function handleDeleteTemplate(template: PrintTemplate) {
    if (!window.confirm(`¿Eliminar permanentemente la plantilla "${template.name}" y todas sus versiones? También se eliminarán sus reglas de impresión.`)) return
    try {
      await deletePrintingTemplate(template.id)
      if (selectedId === template.id) setSelectedId(null)
      toast.success("Plantilla eliminada")
      await load()
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : "Error al eliminar plantilla") }
  }

  const addElement = (type: PrintElementType, fieldKey?: string) => {
    const newElement: PrintElement = {
      id: Math.random().toString(36).substring(7),
      type,
      fieldKey,
      label: fieldKey ? PRINT_FIELDS_REGISTRY[fieldKey]?.label || fieldKey : (type === 'TEXT' ? 'Campo de texto' : type),
      properties: { alignment: 'left' }
    }

    setEditor({ ...editor, definition: { ...editor.definition, elements: [...editor.definition.elements, newElement] } })
    setSelectedElementId(newElement.id)
  }

  const removeElement = (id: string) => {
    setEditor({ ...editor, definition: { ...editor.definition, elements: editor.definition.elements.filter(el => el.id !== id) } })
    if (selectedElementId === id) setSelectedElementId(null)
  }

  const updateElementProperties = (id: string, props: Partial<PrintElementProperties>) => {
    setEditor({ 
      ...editor, 
      definition: { 
        ...editor.definition, 
        elements: editor.definition.elements.map(el => el.id === id ? { ...el, properties: { ...el.properties, ...props } } : el) 
      } 
    })
  }

  const updateElementField = (id: string, fieldKey: string) => {
    const field = PRINT_FIELDS_REGISTRY[fieldKey];
    setEditor({ 
      ...editor, 
      definition: { 
        ...editor.definition, 
        elements: editor.definition.elements.map(el => el.id === id ? { ...el, fieldKey, label: field?.label || fieldKey } : el) 
      } 
    })
  }

  const moveElement = (index: number, direction: 'up' | 'down') => {
    const elements = [...editor.definition.elements]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= elements.length) return
    [elements[index], elements[newIndex]] = [elements[newIndex], elements[index]]
    setEditor({ ...editor, definition: { ...editor.definition, elements } })
  }

  async function handleCreateLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await createPrintingLocation({
        name: String(form.get("name") || ""),
        code: String(form.get("code") || ""),
      })
      toast.success("Ubicación creada")
      event.currentTarget.reset()
      await load()
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : "Error al crear ubicación") }
  }

  async function handleDeleteLocation(id: number) {
    try {
      await deletePrintingLocation(id)
      toast.success("Ubicación eliminada")
      await load()
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : "Error al eliminar ubicación") }
  }

  async function handleCreatePrinter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await createPrintingPrinter({
        name: String(form.get("name") || ""),
        locationId: Number(form.get("locationId")),
        ...(form.get("agentId") ? { printAgentId: Number(form.get("agentId")) } : {}),
        ...(form.get("profileId") ? { profileId: Number(form.get("profileId")) } : {}),
        printerType: String(form.get("type")),
        paperType: String(form.get("paperType")) as PrintPaperType,
        paperSize: String(form.get("paperSize")) as PrintPaperSize,
        orientation: String(form.get("orientation") || "PORTRAIT") as PrintOrientation
      })
      toast.success("Impresora registrada")
      setIsPrinterModalOpen(false)
      await load()
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : "Error al registrar impresora") }
  }

  async function handleCreateTarget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await createPrintingTarget({
        code: String(form.get("code") || ""),
        name: String(form.get("name") || ""),
        locationId: Number(form.get("locationId")),
        ...(form.get("printerId") ? { printerId: Number(form.get("printerId")) } : {})
      })
      toast.success("Destino creado")
      setIsTargetModalOpen(false)
      await load()
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : "Error al crear destino") }
  }

  async function handleSaveRule(payload: PrintRuleInput) {
    setSavingRule(true)
    try {
      if (editingRule) {
        await updatePrintingRule(editingRule.id, payload)
        toast.success("Regla de impresión actualizada")
      } else {
        await createPrintingRule(payload)
        toast.success("Regla de impresión creada")
      }
      setIsRuleModalOpen(false)
      setEditingRule(null)
      await load()
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : "Error al guardar regla")
      throw cause
    } finally { setSavingRule(false) }
  }

  async function handleToggleRule(rule: PrintRule) {
    try {
      await updatePrintingRule(rule.id, { isActive: !rule.isActive })
      toast.success(rule.isActive ? "Regla desactivada" : "Regla activada")
      await load()
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : "No se pudo cambiar el estado de la regla") }
  }

  async function handleDeleteRule(id: number) {
    if (!window.confirm("¿Eliminar esta regla y todas sus salidas? Los trabajos ya registrados conservarán su contrato de impresión.")) return
    try {
      await deletePrintingRule(id)
      toast.success("Regla eliminada")
      await load()
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : "Error al eliminar regla") }
  }

  async function handleRetryJob(jobId: number) {
    try {
      await retryPrintingJob(jobId)
      toast.success("Reintento solicitado")
      await load()
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : "Error al reintentar trabajo") }
  }

  return <div className="space-y-5 pb-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs text-muted-foreground">Configuración / Hardware y periféricos / Reglas de salida</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Printing Core</h2><p className="mt-1 text-sm text-muted-foreground">Configura eventos, documentos de salida, plantillas y destinos físicos.</p></div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Actualizar estado</Button>
        <Button variant="outline" onClick={() => setActiveTab("targets")}>Configuración de impresoras</Button>
      </div>
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      <StatusCard icon={CheckCircle2} title="Contrato v1" detail="Contrato de salida implementado para OLLPrintAgent" status="Disponible" variant="success" />
      <StatusCard icon={FileText} title="Preview local" detail="Vista previa local, sin enviar trabajos" status="Local" variant="info" />
      <StatusCard icon={Printer} title="Destinos físicos" detail={`${activeTargets.length} activos · ${onlineTargets} con estado de agente ONLINE registrado`} status={activeTargets.length ? `${onlineTargets}/${activeTargets.length}` : "Sin destinos"} variant={onlineTargets ? "success" : "neutral"} />
    </div>
    {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"><AlertCircle className="size-4" />{error}</div>}
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="max-w-full overflow-x-auto"><TabsTrigger value="rules">Reglas de Impresión</TabsTrigger><TabsTrigger value="templates">Templates</TabsTrigger><TabsTrigger value="targets">Destinos físicos</TabsTrigger><TabsTrigger value="assets">Assets</TabsTrigger><TabsTrigger value="history">Historial de salidas</TabsTrigger></TabsList>
      
      <TabsContent value="rules" className="space-y-5">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
            <div><CardTitle>Constructor de reglas</CardTitle><CardDescription>Define el evento y sus documentos de salida multipunto.</CardDescription></div>
            <Button onClick={() => openRuleModal()}><Plus className="size-4" />Nueva regla</Button>
          </CardHeader>
          <CardContent className="pt-4 text-sm text-muted-foreground">Eventos conectados: <Badge variant="outline">SALE · Impresión de venta</Badge> <Badge variant="outline">CANCELLATION · Cancelación de venta</Badge>. Cada regla puede contener varias salidas, cada una con plantilla, destino, orden y copias.</CardContent>
        </Card>
        <div className="grid gap-3">
          {rules.length === 0 ? <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No hay reglas guardadas. Crea una regla con al menos una salida para comenzar.</CardContent></Card> : rules.map((rule) => (
            <Card key={rule.id} className="overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <Checkbox checked={rule.isActive} onCheckedChange={() => void handleToggleRule(rule)} aria-label={`${rule.isActive ? "Desactivar" : "Activar"} regla ${rule.name}`} className="mt-1" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{rule.name || rule.event}</h3><Badge variant={isConnectedEvent(rule.event) ? "outline" : "warning"}>{rule.event === "SALE" ? "Impresión de venta" : rule.event === "CANCELLATION" ? "Cancelación de venta" : `Sin disparador · ${rule.event}`}</Badge><Badge variant={rule.isActive && isConnectedEvent(rule.event) ? "success" : rule.isActive ? "warning" : "neutral"}>{rule.isActive && !isConnectedEvent(rule.event) ? "Sin disparador" : rule.isActive ? "Activa" : "Inactiva"}</Badge></div>
                      <p className="mt-1 text-xs text-muted-foreground">{rule.outputs.length} {rule.outputs.length === 1 ? "documento de salida" : "documentos de salida"}{rule.updatedAt ? ` · Actualizada ${new Date(rule.updatedAt).toLocaleString()}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 pl-7 sm:pl-0">
                    <Button variant="outline" size="sm" onClick={() => openRuleModal(rule)}><Pencil className="size-4" />Editar regla</Button>
                    <Button variant="ghost" size="icon" aria-label={`Eliminar regla ${rule.name}`} onClick={() => void handleDeleteRule(rule.id)}><Trash2 className="size-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 border-t pt-3">
                  {rule.outputs.map((output) => {
                    const template = templates.find((item) => item.templateKey === output.templateKey)
                    const version = template?.versions.find((item) => item.status === "ACTIVE")
                    const target = targets.find((item) => item.id === output.targetId)
                    const printer = target?.printer
                    const agentStatus = printer?.printAgent?.status
                    return <div key={output.id} className="grid gap-3 rounded-lg border bg-muted/10 p-3 text-sm sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0"><p className="truncate font-medium">{output.name}</p><p className="truncate text-xs text-muted-foreground">{template?.name || `Plantilla no encontrada (${output.templateKey})`} · {version ? `${version.paperSize} · v${version.version}` : "Sin versión activa"}</p></div>
                      <div className="min-w-0"><p className="truncate">{target?.name || `Destino ${output.targetId}`}</p><p className="truncate text-xs text-muted-foreground">{printer?.name || "Sin impresora"}{target?.location?.name ? ` · ${target.location.name}` : ""}</p></div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>Orden {output.priority}</span><span>{output.copies} {output.copies === 1 ? "copia" : "copias"}</span><span>{agentStatus ? `Agent ${agentStatus} (estado registrado)` : "Estado no disponible"}</span>{!output.isActive && <Badge variant="neutral">Salida inactiva</Badge>}</div>
                      <div className="flex justify-end">{template && <Button asChild variant="outline" size="sm"><Link href={`/workstation/admin/settings/printStudio?templateId=${template.id}`}>Editar template</Link></Button>}</div>
                    </div>
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <RuleBuilderDialog key={`${editingRule?.id ?? "new"}-${isRuleModalOpen}`} open={isRuleModalOpen} rule={editingRule} templates={templates} targets={targets} saving={savingRule} onOpenChange={(open) => { setIsRuleModalOpen(open); if (!open) setEditingRule(null); }} onSave={handleSaveRule} onOpenTargets={() => setActiveTab("targets")} />
      </TabsContent>
      
      <TabsContent value="templates" className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card><CardHeader><CardTitle>Templates</CardTitle><CardDescription>Versiones por documento y papel.</CardDescription><a className="text-sm underline" href="/workstation/admin/settings/printStudio">Abrir Print Studio para crear o editar plantillas</a></CardHeader><CardContent className="space-y-2">
          {loading ? <p className="text-sm text-muted-foreground">Cargando...</p> : templates.length === 0 ? <p className="text-sm text-muted-foreground">Todav�a no hay templates. Crea el primero desde el editor.</p> : templates.map((template) => <div key={template.id} className={`w-full rounded-lg border p-3 transition-colors ${selectedId === template.id ? "border-primary bg-primary/5" : "hover:bg-muted/60"}`}><div className="flex items-center justify-between gap-2"><button onClick={() => selectTemplate(template)} className="min-w-0 flex-1 text-left"><span className="font-medium">{template.name}</span><p className="mt-1 text-xs text-muted-foreground">{template.documentType} � {template.versions?.length ?? 0} versi�n(es)</p></button><div className="flex shrink-0 items-center gap-2"><Badge variant={template.isActive ? "success" : "neutral"}>{template.isActive ? "Activo" : "Inactivo"}</Badge><Button type="button" variant="ghost" size="icon" aria-label={`Eliminar plantilla ${template.name}`} title="Eliminar plantilla" disabled={!template.isActive} onClick={() => void handleDeleteTemplate(template)}><Trash2 className="size-4 text-destructive" /></Button></div></div></div>)}
        </CardContent></Card>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]"><Card><CardHeader><CardTitle>Editor base</CardTitle><CardDescription>Los cambios se mantienen en estado local hasta guardar.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Field label="Nombre"><Input value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} /></Field><Field label="Clave"><Input value={editor.templateKey} onChange={(event) => setEditor({ ...editor, templateKey: event.target.value })} /></Field><Field label="Tipo de documento"><Input value={editor.documentType} onChange={(event) => setEditor({ ...editor, documentType: event.target.value })} /></Field><Field label="Papel"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={editor.paperSize} onChange={(event) => setEditor({ ...editor, paperSize: event.target.value as PrintPaperSize })}><option value="THERMAL_58">Térmico 58 mm</option><option value="THERMAL_80">Térmico 80 mm</option><option value="A4">A4</option><option value="LETTER">Carta</option></select></Field><div className="sm:col-span-2 flex justify-end"><Button disabled={loading} onClick={() => selected ? setIsVersionModalOpen(true) : void createTemplate()}><Save className="size-4" />{selected ? "Guardar Nueva Versión" : "Crear template"}</Button></div></CardContent></Card><ReceiptPreview editor={editor} activeVersion={activeVersion} /></div >
      </TabsContent>
      
      <TabsContent value="targets" className="space-y-5">
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={openLocationModal}><MapPin className="size-4 mr-2" />Ubicación</Button>
          <Button variant="outline" onClick={openPrinterModal}><Plus className="size-4 mr-2" />Impresora</Button>
          <Button onClick={openTargetModal}><Plus className="size-4 mr-2" />Destino</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">{targets.map((target) => <Card key={target.id}><CardHeader><div className="flex items-center justify-between"><CardTitle>{target.name}</CardTitle><Badge variant={target.printer ? "success" : "warning"}>{target.printer ? "Asignado" : "Sin impresora"}</Badge></div><CardDescription>{target.code}</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground">{target.location?.name ?? "Sin ubicación"} · {target.printer?.name ?? "Configura una impresora"}</CardContent></Card>)}{targets.length === 0 && <Card><CardContent className="pt-6 text-sm text-muted-foreground">No hay Print Targets configurados.</CardContent></Card>}</div >
        
        <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Gestionar Ubicaciones</DialogTitle><DialogDescription>Administra los lugares físicos de la clínica donde se encuentran las impresoras.</DialogDescription></DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Añadir Nueva Ubicación</h4>
                <form onSubmit={handleCreateLocation} className="grid gap-3">
                  <Field label="Nombre"><Input name="name" placeholder="Ej: Recepción" required /></Field>
                  <Field label="Código"><Input name="code" placeholder="Ej: REC_01" /></Field>
                  <Button type="submit" size="sm" className="w-full"><Save className="size-4 mr-2" />Guardar Ubicación</Button>
                </form>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Ubicaciones Existentes</h4>
                <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                  {locations.length === 0 ? (
                    <p className="p-3 text-xs text-center text-muted-foreground">No hay ubicaciones creadas.</p>
                  ) : (
                    locations.map(loc => (
                      <div key={loc.id} className="flex items-center justify-between p-2 text-sm">
                        <div>
                          <span className="font-medium">{loc.name}</span>
                          {loc.code && <span className="ml-2 text-xs text-muted-foreground">({loc.code})</span>}
                        </div>
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => void handleDeleteLocation(loc.id)}><Trash2 className="size-3 text-destructive" /></Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isPrinterModalOpen} onOpenChange={setIsPrinterModalOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Impresora</DialogTitle><DialogDescription>Añade un dispositivo físico al sistema.</DialogDescription></DialogHeader>
            <form onSubmit={handleCreatePrinter} className="grid gap-4 py-4">
              <Field label="Nombre"><Input name="name" placeholder="Impresora Recepción" required /></Field>
              <Field label="Ubicación"><select name="locationId" className="h-9 rounded-md border bg-background px-3 text-sm" required>
                <option value="">Seleccione una ubicación...</option>
                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>)}
              </select></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Papel"><select name="paperType" className="h-9 rounded-md border bg-background px-3 text-sm"><option value="THERMAL">Térmico</option><option value="SHEET">Hoja</option></select></Field>
                <Field label="Tamaño"><select name="paperSize" className="h-9 rounded-md border bg-background px-3 text-sm"><option value="THERMAL_80">80 mm</option><option value="THERMAL_58">58 mm</option><option value="A4">A4</option><option value="LETTER">Carta</option></select></Field>
              </div>
              <Field label="Tipo"><select name="type" className="h-9 rounded-md border bg-background px-3 text-sm"><option value="THERMAL">Térmica</option><option value="SHEET">Láser/Inyección</option><option value="OTHER">Otra</option></select></Field>
              <Field label="Agente (ID - Opcional)"><Input name="agentId" type="number" /></Field>
              <Field label="Perfil (ID - Opcional)"><Input name="profileId" type="number" /></Field>
              <DialogFooter><Button type="submit"><Save className="size-4 mr-2" />Guardar Impresora</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isTargetModalOpen} onOpenChange={setIsTargetModalOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear Destino Lógico</DialogTitle><DialogDescription>Asigna un nombre y código a un punto de impresión.</DialogDescription></DialogHeader>
            <form onSubmit={handleCreateTarget} className="grid gap-4 py-4">
              <Field label="Nombre"><Input name="name" placeholder="Caja Principal" required /></Field>
              <Field label="Código"><Input name="code" placeholder="CASHIER_01" required /></Field>
              <Field label="Ubicación"><select name="locationId" className="h-9 rounded-md border bg-background px-3 text-sm" required>
                <option value="">Seleccione una ubicación...</option>
                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
              </select></Field>
              <Field label="Impresora"><select name="printerId" className="h-9 rounded-md border bg-background px-3 text-sm">
                <option value="">Opcional: Seleccione impresora...</option>
                {printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></Field>
              <DialogFooter><Button type="submit"><Save className="size-4 mr-2" />Crear Destino</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <p className="text-xs text-muted-foreground">Impresoras detectadas en el backend: {printers.length}. Ahora puedes gestionar la asignación de destinos e impresoras.</p>
        <Card><CardHeader><CardTitle>Probar OLLPrintAgent</CardTitle><CardDescription>Envía un ticket de prueba directamente a la impresora configurada en el Agent.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><Field label="URL del Agent"><Input type="url" value={agentUrl} onChange={(event) => setAgentUrl(event.target.value)} placeholder="http://localhost:3333" autoComplete="url" /></Field><Field label="API key del Agent"><Input type="password" value={agentApiKey} onChange={(event) => setAgentApiKey(event.target.value)} placeholder="Se usa solo durante esta sesión" autoComplete="new-password" /></Field><Field label="Papel de prueba"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={testPaperSize} onChange={(event) => setTestPaperSize(event.target.value as PrintPaperSize)}><option value="THERMAL_58">Térmico 58 mm</option><option value="THERMAL_80">Térmico 80 mm</option></select></Field><div className="flex items-end"><Button onClick={() => void runPrintTest()} disabled={testingPrint || !agentApiKey.trim()}>{testingPrint ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{testingPrint ? "Enviando..." : "Imprimir prueba"}</Button></div ><p className="text-xs text-muted-foreground md:col-span-2">La API key no se guarda en el navegador. La acción imprime una página física; el Agent debe estar encendido y accesible desde este equipo.</p></CardContent></Card>
      </TabsContent>
      <TabsContent value="assets" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"><Card><CardHeader><CardTitle>Assets registrados</CardTitle><CardDescription>El template referencia el asset por clave; la imagen no se guarda dentro del JSON.</CardDescription></CardHeader><CardContent className="space-y-2">{assets.length === 0 ? <p className="text-sm text-muted-foreground">No hay assets registrados.</p> : assets.map((asset) => <div key={asset.id} className="flex items-center justify-between rounded-lg border px-3 py-2"><div><p className="font-medium">{asset.name}</p><p className="text-xs text-muted-foreground">{asset.storageKey} · {asset.mimeType}</p></div><Badge variant="neutral">#{asset.id}</Badge></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Registrar asset</CardTitle><CardDescription>El almacenamiento físico se resuelve fuera del template.</CardDescription></CardHeader><CardContent><form className="grid gap-4" onSubmit={createAsset}><Field label="Nombre"><Input name="assetName" placeholder="Logo principal" required /></Field><Field label="Storage key"><Input name="storageKey" placeholder="business/logo-main.png" required /></Field><Button type="submit"><Save className="size-4" />Registrar asset</Button></form></CardContent></Card></TabsContent>
      <TabsContent value="history" className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Historial de Impresiones</h3>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className="size-3 mr-2" />Actualizar</Button>
        </div>
        <div className="grid gap-4">
          {loading ? <p className="text-sm text-muted-foreground">Cargando historial...</p> : batches.length === 0 ? <p className="text-sm text-muted-foreground">No hay registros de impresión.</p> : batches.map((batch) => (
            <Card key={batch.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Batch #{batch.id} - {batch.sourceDocumentType}</span>
                    <Badge variant={batch.status === "COMPLETED" ? "success" : batch.status === "FAILED" ? "destructive" : "neutral"}>{batch.status}</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(batch.createdAt).toLocaleString()}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
          {batch.jobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-3 text-sm">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-[10px]">{job.status}</Badge>
                        <span className="text-muted-foreground">Target: {job.targetId}</span>
                        {job.lastError && <span className="text-destructive text-[10px] truncate max-w-50" title={job.lastError}>{job.lastError}</span>}
                      </div>
                      {job.status === "FAILED" && (
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-primary" onClick={() => void handleRetryJob(job.id)}>
                          <RotateCcw className="size-3 mr-1" /> Reintentar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>

    <Dialog open={isVersionModalOpen} onOpenChange={setIsVersionModalOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Guardar Nueva Versión</DialogTitle><DialogDescription>Crea una versión inmutable del template para auditoría y reimpresión.</DialogDescription></DialogHeader>
        <form onSubmit={handleSaveVersion} className="grid gap-4 py-4">
          <Field label="Versión"><Input name="version" type="number" defaultValue={selected?.versions?.length ? selected.versions.length + 1 : 1} required /></Field>
          <Field label="Estado"><select name="status" className="h-9 rounded-md border bg-background px-3 text-sm"><option value="DRAFT">Borrador</option><option value="ACTIVE">Activo</option><option value="ARCHIVED">Archivado</option></select></Field>
          <Field label="Orientación"><select name="orientation" className="h-9 rounded-md border bg-background px-3 text-sm"><option value="PORTRAIT">Vertical</option><option value="LANDSCAPE">Horizontal</option></select></Field>
          <DialogFooter><Button type="submit"><Save className="size-4 mr-2" />Guardar Versión</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
}

type RuleOutputDraft = { key: string; id?: number; name: string; targetId: string; templateKey: string; priority: number; copies: number; isActive: boolean }

function RuleBuilderDialog({
  open, rule, templates, targets, saving, onOpenChange, onSave, onOpenTargets,
}: {
  open: boolean
  rule: PrintRule | null
  templates: PrintTemplate[]
  targets: PrintTarget[]
  saving: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: PrintRuleInput) => Promise<void>
  onOpenTargets: () => void
}) {
  const [name, setName] = useState(() => rule?.name || "")
  const [event, setEvent] = useState(() => rule?.event || "SALE")
  const [isActive, setIsActive] = useState(() => rule?.isActive ?? true)
  const [outputs, setOutputs] = useState<RuleOutputDraft[]>(() => rule?.outputs?.length ? rule.outputs.map((output) => ({
    key: `output-${output.id}`, id: output.id, name: output.name, targetId: String(output.targetId),
    templateKey: output.templateKey, priority: output.priority, copies: output.copies, isActive: output.isActive,
  })) : [{ key: `new-${Date.now()}`, name: "", targetId: "", templateKey: "", priority: 0, copies: 1, isActive: true }])
  const supportedEvents = ["SALE", "CANCELLATION"]

  const updateOutput = (key: string, change: Partial<RuleOutputDraft>) => {
    setOutputs((current) => current.map((output) => output.key === key ? { ...output, ...change } : output))
  }

  const activeEvent = supportedEvents.includes(event)
  const hasInvalidActiveOutput = isActive && outputs.some((output) => {
    if (!output.isActive) return false
    const template = templates.find((item) => item.templateKey === output.templateKey)
    const version = template?.versions.find((item) => item.status === "ACTIVE")
    const target = targets.find((item) => item.id === Number(output.targetId))
    return !version || !target?.printer || version.paperType !== target.printer.paperType || version.paperSize !== target.printer.paperSize
  })
  const canSave = Boolean(name.trim() && outputs.length && outputs.every((output) => output.name.trim() && output.targetId && output.templateKey && output.copies >= 1 && output.copies <= 5) && (activeEvent || !isActive) && !hasInvalidActiveOutput && !saving)

  const submit = (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault()
    if (!canSave) return
    const input: PrintRuleInput = {
      name: name.trim(),
      event,
      isActive,
      priority: Math.min(...outputs.map((output) => output.priority)),
      outputs: outputs.map((output) => ({
        ...(output.id ? { id: output.id } : {}),
        name: output.name.trim(),
        targetId: Number(output.targetId),
        templateKey: output.templateKey,
        priority: Number(output.priority),
        copies: Number(output.copies),
        isActive: output.isActive,
      })),
    }
    void onSave(input).catch(() => undefined)
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
      <DialogHeader><DialogTitle>{rule ? "Editar regla de impresión" : "Nueva regla de impresión"}</DialogTitle><DialogDescription>El evento agrupa los documentos. Cada salida controla su propia plantilla, destino, orden y cantidad de copias.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre descriptivo"><Input value={name} onChange={(event) => setName(event.target.value)} maxLength={191} placeholder="Venta · caja y preparación" required /></Field>
          <Field label="Evento disparador"><select value={event} onChange={(e) => setEvent(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" required>
            <option value="SALE">Impresión de venta (SALE)</option><option value="CANCELLATION">Cancelación de venta (CANCELLATION)</option>
            {rule && !supportedEvents.includes(rule.event) && <option value={rule.event}>{rule.event} · sin disparador conectado</option>}
          </select></Field>
        </div>
        {rule && !activeEvent && isActive && <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Este evento existe en datos anteriores, pero no hay un flujo de negocio conectado. Desactiva la regla para guardar sus cambios.</p>}
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />Regla activa</label>

        <section className="grid gap-3 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">Documentos de salida</h3><p className="text-xs text-muted-foreground">Cada salida representa un documento dirigido a un destino.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setOutputs((current) => [...current, { key: `new-${Date.now()}-${current.length}`, name: "", targetId: "", templateKey: "", priority: current.length, copies: 1, isActive: true }])}><Plus className="size-4" />Añadir salida</Button></div>
          {!targets.length && <p className="rounded-md border p-3 text-sm text-muted-foreground">No hay destinos activos disponibles. <Button type="button" variant="link" className="h-auto p-0" onClick={onOpenTargets}>Configurar destinos</Button></p>}
          {outputs.map((output, index) => {
            const template = templates.find((item) => item.templateKey === output.templateKey)
            const version = template?.versions.find((item) => item.status === "ACTIVE")
            const target = targets.find((item) => item.id === Number(output.targetId))
            const printer = target?.printer
            const incompatible = Boolean(version && printer && (version.paperType !== printer.paperType || version.paperSize !== printer.paperSize))
            const missingPrinter = Boolean(target && !printer)
            return <div key={output.key} className="grid gap-3 rounded-xl border p-4">
              <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold">Salida {index + 1}</h4><Button type="button" variant="ghost" size="icon" aria-label={`Quitar salida ${index + 1}`} disabled={outputs.length === 1} onClick={() => setOutputs((current) => current.filter((item) => item.key !== output.key))}><Trash2 className="size-4 text-destructive" /></Button></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre del documento"><Input value={output.name} onChange={(e) => updateOutput(output.key, { name: e.target.value })} maxLength={191} placeholder="Ticket POS" required /></Field>
                <Field label="Plantilla"><select value={output.templateKey} onChange={(e) => updateOutput(output.key, { templateKey: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm" required><option value="">Seleccionar plantilla</option>{templates.map((item) => {
                  const active = item.versions.find((itemVersion) => itemVersion.status === "ACTIVE")
                  return <option key={item.id} value={item.templateKey}>{item.name} · {active ? `${active.paperSize} v${active.version}` : "sin versión activa"}</option>
                })}</select></Field>
                <Field label="Destino físico"><select value={output.targetId} onChange={(e) => updateOutput(output.key, { targetId: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm" required><option value="">Seleccionar destino</option>{targets.map((item) => <option key={item.id} value={item.id} disabled={!item.isActive}>{item.name} · {item.location?.name || item.code}{item.isActive ? "" : " · inactivo"}</option>)}</select></Field>
                <div className="grid grid-cols-2 gap-3"><Field label="Orden"><Input type="number" min={0} value={output.priority} onChange={(e) => updateOutput(output.key, { priority: Number(e.target.value) })} /></Field><Field label="Copias (1–5)"><Input type="number" min={1} max={5} value={output.copies} onChange={(e) => updateOutput(output.key, { copies: Number(e.target.value) })} /></Field></div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
                <label className="flex items-center gap-2"><Checkbox checked={output.isActive} onCheckedChange={(checked) => updateOutput(output.key, { isActive: checked === true })} />Salida activa</label>
                <span>{printer ? `${printer.name} · ${printer.paperSize} · Agent ${printer.printAgent?.status || "sin estado"}` : "Sin impresora física asignada"}</span>
                {template && <Button asChild variant="link" className="h-auto p-0"><Link href={`/workstation/admin/settings/printStudio?templateId=${template.id}`}>Editar diseño en Print Studio</Link></Button>}
              </div>
              {output.isActive && isActive && !version && <p className="text-xs text-destructive">La plantilla necesita una versión activa para una salida activa.</p>}
              {output.isActive && isActive && missingPrinter && <p className="text-xs text-destructive">El destino necesita una impresora física asignada.</p>}
              {output.isActive && isActive && incompatible && <p className="text-xs text-destructive">El formato {version?.paperSize} de la plantilla no coincide con el papel {printer?.paperSize} de la impresora.</p>}
              {output.isActive && isActive && target && !printer && <p className="text-xs text-destructive">Asigna una impresora al destino antes de activar esta salida.</p>}
            </div>
          })}
        </section>
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={!canSave}><Save className="size-4" />{saving ? "Guardando…" : rule ? "Guardar cambios" : "Guardar regla"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div> }
function StatusCard({ icon: Icon, title, detail, status, variant }: { icon: typeof CheckCircle2, title: string, detail: string, status: string, variant: "success" | "info" | "neutral" }) { return <Card size="sm"><CardContent className="flex items-center gap-3"><Icon className="size-5 text-muted-foreground" /><div><p className="font-medium">{title}</p><p className="text-xs text-muted-foreground">{detail}</p></div><Badge className="ml-auto" variant={variant}>{status}</Badge></CardContent></Card> }
function ReceiptPreview({ editor, activeVersion }: { editor: EditorState; activeVersion?: PrintTemplateVersion }) {
  const mockData: PreviewData = {
    company: { name: "Clínica Veterinaria", address: "Calle Falsa 123" },
    document: { number: "1542", date: "2026-10-06" },
    customer: { name: "Juan Pérez", document: "12345678" },
    totals: { subtotal: 1270, discount: 0, tax: 100, total: 1370 },
    payments: [{ method: "CASH", amount: 1370 }]
  };

  const evaluateCondition = (condition: string | undefined, data: PreviewData) => {
    if (!condition) return true;
    try {
      // Implementación simple de evaluación de condiciones (ej: 'totals.discount > 0')
      const [path, operator, value] = condition.split(' ');
      const getValue = (obj: PreviewData, valuePath: string): string | number | boolean | undefined => {
        const result = valuePath.split('.').reduce<unknown>((acc, part) => {
          return typeof acc === 'object' && acc !== null
            ? (acc as Record<string, unknown>)[part]
            : undefined
        }, obj)
        return typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean' ? result : undefined
      };
      
      const actualValue = getValue(data, path);
      const targetValue = parseFloat(value);

      switch (operator) {
        case '>': return typeof actualValue === 'number' && actualValue > targetValue;
        case '<': return typeof actualValue === 'number' && actualValue < targetValue;
        case '==': return String(actualValue) === value;
        case '!=': return String(actualValue) !== value;
        default: return true;
      }
    } catch (e) {
      console.error("Error evaluando condición:", condition, e);
      return true;
    }
  };

  const renderElement = (el: PrintElement): React.ReactNode => {
    if (!evaluateCondition(el.properties?.visibleIf, mockData)) return null;

    const style: React.CSSProperties = {
      textAlign: el.properties?.alignment || 'left',
      fontSize: el.properties?.fontSize === 'xs' ? '9px' : el.properties?.fontSize === 'sm' ? '10px' : el.properties?.fontSize === 'md' ? '12px' : '14px',
      fontWeight: el.properties?.fontWeight || 'normal',
      marginTop: el.properties?.marginTop ? `${el.properties.marginTop}px` : '0',
      marginBottom: el.properties?.marginBottom ? `${el.properties.marginBottom}px` : '0',
    };

    switch (el.type) {
      case 'COLUMN_GROUP':
        return (
          <div style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: '4px' }}>
            {el.children?.map((child) => (
              <div 
                key={child.id} 
                style={{ 
                  flex: child.properties?.width ? `0 0 ${child.properties.width}` : '1',
                  textAlign: child.properties?.alignment || 'left'
                }}
              >
                {renderElement(child)}
              </div>
            ))}
          </div>
        );
      case 'LOGO':
        return <div style={{ ...style, textAlign: 'center' }} className="py-2"><div className="mx-auto bg-slate-200 w-32 h-16 flex items-center justify-center text-[10px] text-slate-400">LOGO</div></div>;
      case 'TEXT':
        return <div style={style} className="py-0.5">{el.label || 'Campo de texto'}</div>;
      case 'SEPARATOR':
        return <div className="my-2 border-t border-dashed w-full" />;
      case 'ITEM_LIST':
        return (
          <div className="space-y-1 py-2">
            {sampleItems.map((item, i) => (
              <div key={i} className="flex justify-between gap-3 text-[10px]">
                <span>{item.quantity} x {item.name}</span>
                <span>${item.total}</span>
              </div>
            ))}
          </div>
        );
      case 'TOTALS':
        return <div style={style} className="flex justify-between font-bold py-1 border-t border-slate-100"><span>TOTAL</span><span>$1.270</span></div>;
      default:
        return <div style={style} className="py-0.5 text-slate-400 italic">{el.type}</div>;
    }
  };

  const elements = useMemo(() => {
    if (!activeVersion?.definition) return [];
    
    // Backward compatibility: if definition is just an array of strings
    if (Array.isArray(activeVersion.definition)) {
      return activeVersion.definition.map((type, i) => {
        const elementType: PrintElement['type'] = type === 'BUSINESS_LOGO' ? 'LOGO' : type === 'DOCUMENT_NUMBER' ? 'TEXT' : type === 'ITEMS' ? 'ITEM_LIST' : type === 'TOTALS' ? 'TOTALS' : 'TEXT'
        return { id: `legacy-${i}`, type: elementType, properties: { alignment: 'left' as const }, label: type }
      })
    }
    
    // New structured definition
      return activeVersion.definition.elements || [];
  }, [activeVersion]);

  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle>Preview</CardTitle>
        <CardDescription>{activeVersion ? `Versión ${activeVersion.version} · ${activeVersion.status}` : "Muestra local"}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`mx-auto bg-white p-5 text-[11px] text-slate-800 shadow-sm ring-1 ring-slate-200 ${editor.paperSize === "A4" || editor.paperSize === "LETTER" ? "max-w-125" : "max-w-70"}`}>
          {elements.length > 0 ? (
            elements.map((el) => <div key={el.id}>{renderElement(el)}</div>)
          ) : (
            <div className="text-center text-slate-400 py-10 italic">Sin elementos definidos en el template</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
