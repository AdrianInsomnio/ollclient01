"use client"

import { useState } from "react"
import {
  ClipboardList,
  FileText,
  Pill,
  Stethoscope,
  Syringe,
} from "lucide-react"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ConsultationForm } from "./consultation-form"
import type { ConsultationFormProps } from "./consultation-form"
import { ClinicalListTab } from "./clinical-list-tab"
import type { ClinicalEntry } from "./clinical-list-tab"
import { FilesTab } from "./files-tab"

type TabKey = "consulta" | "diagnosticos" | "tratamientos" | "recetas" | "archivos"

const TAB_KEYS: readonly TabKey[] = [
  "consulta",
  "diagnosticos",
  "tratamientos",
  "recetas",
  "archivos",
]

export interface ConsultationTabsProps {
  consultationId: string
  form: ConsultationFormProps
  diagnoses: readonly ClinicalEntry[]
  treatments: readonly ClinicalEntry[]
  prescriptions: readonly ClinicalEntry[]
  onAddDiagnosis: (description: string) => Promise<void> | void
  onAddTreatment: (description: string) => Promise<void> | void
  onAddPrescription: (description: string) => Promise<void> | void
}

export function ConsultationTabs(props: ConsultationTabsProps) {
  const {
    consultationId,
    form,
    diagnoses,
    treatments,
    prescriptions,
    onAddDiagnosis,
    onAddTreatment,
    onAddPrescription,
  } = props

  const [active, setActive] = useState<TabKey>("consulta")

  return (
    <Tabs
      value={active}
      onValueChange={(value) => setActive(TAB_KEYS.includes(value as TabKey) ? (value as TabKey) : "consulta")}
      className="flex flex-col gap-3"
    >
      <div className="bg-background sticky top-0 z-10 -mx-1 px-1">
        <TabsList className="bg-muted text-muted-foreground inline-flex h-8 w-full items-center justify-start rounded-lg p-0.75 sm:w-auto">
          <TabsTrigger value="consulta">
            <ClipboardList className="size-3.5" />
            Consulta
          </TabsTrigger>
          <TabsTrigger value="diagnosticos">
            <Stethoscope className="size-3.5" />
            Diagnosticos
          </TabsTrigger>
          <TabsTrigger value="tratamientos">
            <Syringe className="size-3.5" />
            Tratamientos
          </TabsTrigger>
          <TabsTrigger value="recetas">
            <Pill className="size-3.5" />
            Recetas
          </TabsTrigger>
          <TabsTrigger value="archivos">
            <FileText className="size-3.5" />
            Archivos
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="consulta" className="mt-0">
        <ConsultationForm {...form} />
      </TabsContent>
      <TabsContent value="diagnosticos" className="mt-0">
        <ClinicalListTab
          title="Diagnosticos"
          dialogDescription="Anada un nuevo diagnostico para esta consulta."
          fieldLabel="Descripcion del diagnostico"
          items={diagnoses}
          onAdd={onAddDiagnosis}
        />
      </TabsContent>
      <TabsContent value="tratamientos" className="mt-0">
        <ClinicalListTab
          title="Tratamientos"
          dialogDescription="Anada un nuevo tratamiento para esta consulta."
          fieldLabel="Descripcion del tratamiento"
          items={treatments}
          onAdd={onAddTreatment}
        />
      </TabsContent>
      <TabsContent value="recetas" className="mt-0">
        <ClinicalListTab
          title="Recetas"
          dialogDescription="Anada una nueva receta para esta consulta."
          fieldLabel="Descripcion de la receta"
          items={prescriptions}
          onAdd={onAddPrescription}
        />
      </TabsContent>
      <TabsContent value="archivos" className="mt-0">
        <FilesTab consultationId={consultationId} />
      </TabsContent>
    </Tabs>
  )
}
