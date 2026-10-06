"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, FileText, LoaderCircle, Printer, RefreshCw, Save, Send, Plus, RotateCcw, History, MapPin, Trash2, Settings2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  type PrintLocation,
  getPrintingRules,
  createPrintingRule,
  deletePrintingRule
} from "@/lib/api/printing"
import { 
  PrintElementType, 
  PrintElement, 
  PrintTemplateDefinition, 
  PRINT_FIELDS_REGISTRY 
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
type RuleState = { event: string; targetId: string; templateKey: string; priority: number }

export default function PrintingSettingsPage() {
  const [templates, setTemplates] = useState<PrintTemplate[]>([])
  const [targets, setTargets] = useState<PrintTarget[]>([])
  const [printers, setPrinters] = useState<Array<{ id: number; name: string; paperSize: string; status: string }>>([])
  const [locations, setLocations] = useState<PrintLocation[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [assets, setAssets] = useState<PrintAsset[]>([])
  const [batches, setBatches] = useState<any[]>([])
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

  const selected = useMemo(() => templates.find((template) => template.id === selectedId) ?? null, [selectedId, templates])
  const activeVersion = selected?.versions?.[0]

  async function load() {
    setLoading(true)
    setError(null)
    try {
      // Cargamos cada recurso de forma independiente para que el fallo de uno no bloquequee a los demás
      const loadData = async <T>(fn: () => Promise<T>, setter: (data: T) => void) => {
        try {
          const data = await fn();
          setter(data);
        } catch (e) {
          console.error(`Error cargando recurso:`, e);
        }
      };

      await Promise.all([
        loadData(getPrintingTemplates, setTemplates),
        loadData(getPrintingTargets, setTargets),
        loadData(getPrintingPrinters, setPrinters),
        loadData(getPrintingAssets, setAssets),
        loadData(() => listPrintingBatches(50), setBatches),
        loadData(getPrintingLocations, setLocations),
        loadData(() => getPrintingRules?.() || Promise.resolve([]), setRules),
      ]);

      // Lógica de selección inicial de template
      // Nota: Usamos una pequeña espera o comprobamos el estado actual ya que setTemplates es asíncrono
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "No se pudo cargar la configuración de impresión")
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const openLocationModal = async () => { await load(); setIsLocationModalOpen(true); };
  const openPrinterModal = async () => { await load(); setIsPrinterModalOpen(true); };
  const openTargetModal = async () => { await load(); setIsTargetModalOpen(true); };
  const openRuleModal = async () => { await load(); setIsRuleModalOpen(true); };

  function selectTemplate(template: PrintTemplate) {
    setSelectedId(template.id)
    const version = template.versions?.[0]
    const definition = version?.definition
    
    let finalDefinition: PrintTemplateDefinition = {
      globalSettings: { defaultAlignment: 'left' },
      elements: []
    }

    if (Array.isArray(definition)) {
      finalDefinition.elements = definition.map((type: string, i: number) => ({
        id: `legacy-${i}`,
        type: type === 'BUSINESS_LOGO' ? 'LOGO' : type === 'DOCUMENT_NUMBER' ? 'TEXT' : type === 'ITEMS' ? 'ITEM_LIST' : type === 'TOTALS' ? 'TOTALS' : 'TEXT',
        properties: { alignment: 'left' },
        label: type
      }))
    } else if (definition?.elements) {
      finalDefinition.elements = definition.elements
      finalDefinition.globalSettings = definition.globalSettings || { defaultAlignment: 'left' }
    }

    setEditor({ 
      name: template.name, 
      templateKey: template.templateKey, 
      documentType: template.documentType, 
      paperSize: version?.paperSize ?? "THERMAL_80",
      definition: finalDefinition
    })
  }

  async function createTemplate() {
    try {
      const created = await createPrintingTemplate({ templateKey: editor.templateKey, name: editor.name, documentType: editor.documentType })
      await createPrintingTemplateVersion({ 
        templateId: created.id, 
        version: 1, 
        status: "DRAFT", 
        paperType: editor.paperSize.startsWith("THERMAL") ? "THERMAL" : "SHEET", 
        paperSize: editor.paperSize, 
        orientation: "PORTRAIT", 
        definition: editor.definition 
      })
      toast.success("Template creado con éxito")
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
        status: String(form.get("status")),
        paperType: editor.paperSize.startsWith("THERMAL") ? "THERMAL" : "SHEET",
        paperSize: editor.paperSize,
        orientation: String(form.get("orientation") || "PORTRAIT"),
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
        printAgentId: form.get("agentId") ? Number(form.get("agentId")) : null,
        profileId: form.get("profileId") ? Number(form.get("profileId")) : null,
        printerType: String(form.get("type")),
        paperType: String(form.get("paperType")),
        paperSize: String(form.get("paperSize")),
        orientation: String(form.get("orientation") || "PORTRAIT")
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
        printerId: form.get("printerId") ? Number(form.get("printerId")) : null
      })
      toast.success("Destino creado")
      setIsTargetModalOpen(false)
      await load()
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : "Error al crear destino") }
  }

  async function handleCreateRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await createPrintingRule({
        event: String(form.get("event")),
        targetId: Number(//Sustituyendo la lógica de targetId para asegurar que sea un número
          form.get("targetId") || 0
        ),
        templateKey: String(form.get("templateKey")),
        priority: Number(form.get("priority") || 0)
      })
      toast.success("Regla de impresión creada")
      setIsRuleModalOpen(false)
      await load()
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : "Error al crear regla") }
  }

  async function handleDeleteRule(id: number) {
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
      <div><p className="text-xs text-muted-foreground">Configuración / Impresión</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Printing Core</h2><p className="mt-1 text-sm text-muted-foreground">Templates, reglas y preview local para documentos de impresión.</p></div >
      <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="size-4" />Actualizar</Button>
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      <StatusCard icon={CheckCircle2} title="Contrato v1" detail="Listo para OLLPrintAgent" variant="success" />
      <StatusCard icon={FileText} title="Preview local" detail="Sin llamadas por cada cambio" variant="info" />
      <StatusCard icon={Printer} title="Destinos activos" detail={`${targets.length} configurados`} variant="neutral" />
    </div>
    {error && <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"><AlertCircle className="size-4" />{error}. Puedes seguir usando el preview local.</div>}
    <Tabs defaultValue="rules" className="space-y-4">
      <TabsList><TabsTrigger value="rules">Reglas de Impresión</TabsTrigger><TabsTrigger value="templates">Templates</TabsTrigger><TabsTrigger value="targets">Infraestructura</TabsTrigger><TabsTrigger value="assets">Assets</TabsTrigger><TabsTrigger value="history">Historial</TabsTrigger></TabsList>
      
      <TabsContent value="rules" className="space-y-5">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Reglas de Eventos</h3>
            <p className="text-sm text-muted-foreground">Define qué se imprime cuando ocurre un evento (ej: SALE).</p>
          </div>
          <Button onClick={openRuleModal}><Plus className="size-4 mr-2" />Nueva Regla</Button>
        </div>
        <div className="grid gap-3">
          {rules.length === 0 ? <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No hay reglas configuradas. Crea una para empezar a imprimir.</CardContent></Card> : rules.map((rule) => (
            <Card key={rule.id} className="overflow-hidden">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-2 rounded-lg"><Settings2 className="size-4 text-primary" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{rule.event}</span>
                      <Badge variant="outline" className="text-[10px]">{rule.priority === 0 ? "Default" : `Prioridad ${rule.priority}`}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Destino: {targets.find(t => t.id === rule.targetId)?.name || rule.targetId} · Template: {rule.templateKey}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={rule.isActive ? "success" : "neutral"}>{rule.isActive ? "Activa" : "Inactiva"}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => void handleDeleteRule(rule.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva Regla de Impresión</DialogTitle><DialogDescription>Define un destino y diseño para un evento específico.</DialogDescription></DialogHeader>
            <form onSubmit={handleCreateRule} className="grid gap-4 py-4">
              <Field label="Evento (Trigger)"><select name="event" className="h-9 rounded-md border bg-background px-3 text-sm" required><option value="SALE">SALE (Venta)</option><option value="PRESCRIPTION">PRESCRIPTION (Receta)</option><option value="INVOICE">INVOICE (Factura)</option></select></Field>
              <Field label="Destino"><select name="targetId" className="h-9 rounded-md border bg-background px-3 text-sm" required>
                <option value="">Seleccione destino...</option>
                {targets.map(t => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
              </select></Field>
              <Field label="Template"><select name="templateKey" className="h-9 rounded-md border bg-background px-3 text-sm" required>
                <option value="">Seleccione template...</option>
                {templates.map(t => <option key={t.id} value={t.templateKey}>{t.name}</option>)}
              </select></Field>
              <Field label="Prioridad"><Input name="priority" type="number" defaultValue={0} /></Field>
              <DialogFooter><Button type="submit"><Save className="size-4 mr-2" />Guardar Regla</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </TabsContent>
      
      <TabsContent value="templates" className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card><CardHeader><CardTitle>Templates</CardTitle><CardDescription>Versiones por documento y papel.</CardDescription></CardHeader><CardContent className="space-y-2">
          {loading ? <p className="text-sm text-muted-foreground">Cargando...</p> : templates.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay templates. Crea el primero desde el editor.</p> : templates.map((template) => <button key={template.id} onClick={() => selectTemplate(template)} className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedId === template.id ? "border-primary bg-primary/5" : "hover:bg-muted/60"}`}><div className="flex items-center justify-between gap-2"><span className="font-medium">{template.name}</span><Badge variant={template.isActive ? "success" : "neutral"}>{template.isActive ? "Activo" : "Inactivo"}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{template.documentType} · {template.versions?.length ?? 0} versión(es)</p></button>)}</CardContent></Card>
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
                  {batch.jobs.map((job: any) => (
                    <div key={job.id} className="flex items-center justify-between p-3 text-sm">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-[10px]">{job.status}</Badge>
                        <span className="text-muted-foreground">Target: {job.targetId}</span>
                        {job.lastError && <span className="text-destructive text-[10px] truncate max-w-[200px]" title={job.lastError}>{job.lastError}</span>}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div> }
function StatusCard({ icon: Icon, title, detail, variant }: { icon: typeof CheckCircle2, title: string, detail: string, variant: "success" | "info" | "neutral" }) { return <Card size="sm"><CardContent className="flex items-center gap-3"><Icon className="size-5 text-muted-foreground" /><div><p className="font-medium">{title}</p><p className="text-xs text-muted-foreground">{detail}</p></div><Badge className="ml-auto" variant={variant}>OK</Badge></CardContent></Card> }
function ReceiptPreview({ editor, activeVersion }: { editor: EditorState; activeVersion?: any }) {
  const mockData = {
    company: { name: "Clínica Veterinaria", address: "Calle Falsa 123" },
    document: { number: "1542", date: "2026-10-06" },
    customer: { name: "Juan Pérez", document: "12345678" },
    totals: { subtotal: 1270, discount: 0, tax: 100, total: 1370 },
    payments: [{ method: "CASH", amount: 1370 }]
  };

  const evaluateCondition = (condition: string | undefined, data: any) => {
    if (!condition) return true;
    try {
      // Implementación simple de evaluación de condiciones (ej: 'totals.discount > 0')
      const [path, operator, value] = condition.split(' ');
      const getValue = (obj: any, path: string) => {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
      };
      
      const actualValue = getValue(data, path);
      const targetValue = parseFloat(value);

      switch (operator) {
        case '>': return actualValue > targetValue;
        case '<': return actualValue < targetValue;
        case '==': return actualValue == targetValue;
        case '!=': return actualValue != targetValue;
        default: return true;
      }
    } catch (e) {
      console.error("Error evaluando condición:", condition, e);
      return true;
    }
  };

  const renderElement = (el: any) => {
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
            {el.children?.map((child: any) => (
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
      return activeVersion.definition.map((type: string, i: number) => ({
        id: `legacy-${i}`,
        type: type === 'BUSINESS_LOGO' ? 'LOGO' : type === 'DOCUMENT_NUMBER' ? 'TEXT' : type === 'ITEMS' ? 'ITEM_LIST' : type === 'TOTALS' ? 'TOTALS' : 'TEXT',
        properties: { alignment: 'left' },
        label: type
      }));
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
        <div className={`mx-auto bg-white p-5 text-[11px] text-slate-800 shadow-sm ring-1 ring-slate-200 ${editor.paperSize === "A4" || editor.paperSize === "LETTER" ? "max-w-[500px]" : "max-w-[280px]"}`}>
          {elements.length > 0 ? (
            elements.map((el: any) => <div key={el.id}>{renderElement(el)}</div>)
          ) : (
            <div className="text-center text-slate-400 py-10 italic">Sin elementos definidos en el template</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
