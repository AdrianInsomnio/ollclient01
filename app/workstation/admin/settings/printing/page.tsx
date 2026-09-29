"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, FileText, Printer, RefreshCw, Save } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiError } from "@/lib/api-client"
import { createPrintingTemplate, createPrintingTemplateVersion, getPrintingPrinters, getPrintingTargets, getPrintingTemplates, type PrintPaperSize, type PrintTarget, type PrintTemplate } from "@/lib/api/printing"

const sampleItems = [
  { name: "Consulta clínica", quantity: 1, total: 850 },
  { name: "Antiparasitario", quantity: 1, total: 420 },
]

type EditorState = { name: string; templateKey: string; documentType: string; paperSize: PrintPaperSize }

export default function PrintingSettingsPage() {
  const [templates, setTemplates] = useState<PrintTemplate[]>([])
  const [targets, setTargets] = useState<PrintTarget[]>([])
  const [printers, setPrinters] = useState<Array<{ id: number; name: string; paperSize: string; status: string }>>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState>({ name: "Ticket de venta", templateKey: "sale-default", documentType: "SALE", paperSize: "THERMAL_80" })

  const selected = useMemo(() => templates.find((template) => template.id === selectedId) ?? null, [selectedId, templates])
  const activeVersion = selected?.versions?.[0]

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [templateData, targetData, printerData] = await Promise.all([getPrintingTemplates(), getPrintingTargets(), getPrintingPrinters()])
      setTemplates(templateData)
      setTargets(targetData)
      setPrinters(printerData)
      if (templateData[0]) {
        setSelectedId(templateData[0].id)
        setEditor({ name: templateData[0].name, templateKey: templateData[0].templateKey, documentType: templateData[0].documentType, paperSize: templateData[0].versions?.[0]?.paperSize ?? "THERMAL_80" })
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "No se pudo cargar la configuración de impresión")
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  function selectTemplate(template: PrintTemplate) {
    setSelectedId(template.id)
    setEditor({ name: template.name, templateKey: template.templateKey, documentType: template.documentType, paperSize: template.versions?.[0]?.paperSize ?? "THERMAL_80" })
  }

  async function createTemplate() {
    try {
      const created = await createPrintingTemplate({ templateKey: editor.templateKey, name: editor.name, documentType: editor.documentType })
      await createPrintingTemplateVersion({ templateId: created.id, version: 1, status: "DRAFT", paperType: editor.paperSize.startsWith("THERMAL") ? "THERMAL" : "SHEET", paperSize: editor.paperSize, orientation: "PORTRAIT", definition: { elements: ["BUSINESS_LOGO", "DOCUMENT_NUMBER", "ITEMS", "TOTALS", "PAYMENTS"] } })
      toast.success("Template creado como borrador")
      await load()
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : "No se pudo crear el template") }
  }

  return <div className="space-y-5 pb-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs text-muted-foreground">Configuración / Impresión</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Printing Core</h2><p className="mt-1 text-sm text-muted-foreground">Templates, destinos y preview local para documentos de impresión.</p></div>
      <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="size-4" />Actualizar</Button>
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      <StatusCard icon={CheckCircle2} title="Contrato v1" detail="Listo para OLLPrintAgent" variant="success" />
      <StatusCard icon={FileText} title="Preview local" detail="Sin llamadas por cada cambio" variant="info" />
      <StatusCard icon={Printer} title="Destinos activos" detail={`${targets.length} configurados`} variant="neutral" />
    </div>
    {error && <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"><AlertCircle className="size-4" />{error}. Puedes seguir usando el preview local.</div>}
    <Tabs defaultValue="templates" className="space-y-4">
      <TabsList><TabsTrigger value="templates">Templates</TabsTrigger><TabsTrigger value="targets">Destinos e impresoras</TabsTrigger></TabsList>
      <TabsContent value="templates" className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card><CardHeader><CardTitle>Templates</CardTitle><CardDescription>Versiones por documento y papel.</CardDescription></CardHeader><CardContent className="space-y-2">
          {loading ? <p className="text-sm text-muted-foreground">Cargando...</p> : templates.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay templates. Crea el primero desde el editor.</p> : templates.map((template) => <button key={template.id} onClick={() => selectTemplate(template)} className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedId === template.id ? "border-primary bg-primary/5" : "hover:bg-muted/60"}`}><div className="flex items-center justify-between gap-2"><span className="font-medium">{template.name}</span><Badge variant={template.isActive ? "success" : "neutral"}>{template.isActive ? "Activo" : "Inactivo"}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{template.documentType} · {template.versions?.length ?? 0} versión(es)</p></button>)}</CardContent></Card>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]"><Card><CardHeader><CardTitle>Editor base</CardTitle><CardDescription>Los cambios se mantienen en estado local hasta guardar.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Field label="Nombre"><Input value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} /></Field><Field label="Clave"><Input value={editor.templateKey} onChange={(event) => setEditor({ ...editor, templateKey: event.target.value })} /></Field><Field label="Tipo de documento"><Input value={editor.documentType} onChange={(event) => setEditor({ ...editor, documentType: event.target.value })} /></Field><Field label="Papel"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={editor.paperSize} onChange={(event) => setEditor({ ...editor, paperSize: event.target.value as PrintPaperSize })}><option value="THERMAL_58">Térmico 58 mm</option><option value="THERMAL_80">Térmico 80 mm</option><option value="A4">A4</option><option value="LETTER">Carta</option></select></Field><div className="sm:col-span-2 flex justify-end"><Button disabled={Boolean(selected)} onClick={() => void createTemplate()}><Save className="size-4" />{selected ? "Edición de versión pendiente" : "Crear template"}</Button></div></CardContent></Card><ReceiptPreview editor={editor} activeVersion={activeVersion} /></div>
      </TabsContent>
      <TabsContent value="targets"><div className="grid gap-4 md:grid-cols-2">{targets.map((target) => <Card key={target.id}><CardHeader><div className="flex items-center justify-between"><CardTitle>{target.name}</CardTitle><Badge variant={target.printer ? "success" : "warning"}>{target.printer ? "Asignado" : "Sin impresora"}</Badge></div><CardDescription>{target.code}</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground">{target.location?.name ?? "Sin ubicación"} · {target.printer?.name ?? "Configura una impresora"}</CardContent></Card>)}{targets.length === 0 && <Card><CardContent className="pt-6 text-sm text-muted-foreground">No hay Print Targets configurados.</CardContent></Card>}</div><p className="mt-4 text-xs text-muted-foreground">Impresoras detectadas en el backend: {printers.length}. La administración de destinos e impresoras se completará en la siguiente iteración.</p></TabsContent>
    </Tabs>
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div> }
function StatusCard({ icon: Icon, title, detail, variant }: { icon: typeof CheckCircle2; title: string; detail: string; variant: "success" | "info" | "neutral" }) { return <Card size="sm"><CardContent className="flex items-center gap-3"><Icon className="size-5 text-muted-foreground" /><div><p className="font-medium">{title}</p><p className="text-xs text-muted-foreground">{detail}</p></div><Badge className="ml-auto" variant={variant}>OK</Badge></CardContent></Card> }
function ReceiptPreview({ editor, activeVersion }: { editor: EditorState; activeVersion?: PrintTemplate["versions"][number] }) { return <Card className="bg-muted/30"><CardHeader><CardTitle>Preview</CardTitle><CardDescription>{activeVersion ? `Versión ${activeVersion.version} · ${activeVersion.status}` : "Muestra local"}</CardDescription></CardHeader><CardContent><div className="mx-auto max-w-[280px] bg-white p-5 text-[11px] text-slate-800 shadow-sm ring-1 ring-slate-200"><div className="text-center"><div className="font-bold">MI CLÍNICA VETERINARIA</div><div className="mt-1 text-slate-500">{editor.documentType} · #1542</div></div><div className="my-3 border-t border-dashed" />{sampleItems.map((item) => <div key={item.name} className="flex justify-between gap-3 py-0.5"><span>{item.quantity} × {item.name}</span><span>${item.total}</span></div>)}<div className="my-3 border-t border-dashed" /><div className="flex justify-between font-bold"><span>TOTAL</span><span>$1.270</span></div><div className="mt-4 text-center text-slate-500">Gracias por su visita</div></div></CardContent></Card> }
