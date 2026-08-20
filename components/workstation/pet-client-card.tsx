"use client"

import { Calendar, ChevronRight, PawPrint, Phone, User } from "lucide-react"

import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export interface PetClientCardProps {
  petName: string
  petSpecies?: string
  petBreed?: string
  petAgeLabel?: string
  clientName: string
  clientPhone?: string
  clientDocumentId?: string
  historyCount?: number
  onViewHistory?: () => void
}

export function PetClientCard(props: PetClientCardProps) {
  const {
    petName,
    petSpecies,
    petBreed,
    petAgeLabel,
    clientName,
    clientPhone,
    clientDocumentId,
    historyCount,
    onViewHistory,
  } = props

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-start gap-3 md:items-center">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
            <PawPrint className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-muted-foreground text-xs">Paciente</div>
            <div className="truncate text-sm font-semibold" title={petName}>
              {petName}
            </div>
            <div className="text-muted-foreground truncate text-xs">
              {[petSpecies, petBreed].filter(Boolean).join(" / ") || "Sin especie"}
              {petAgeLabel ? ` · ${petAgeLabel}` : ""}
            </div>
          </div>
        </div>

        <Separator orientation="vertical" className="hidden h-12 md:block" />

        <div className="flex flex-1 items-start gap-3 md:items-center">
          <div className="bg-secondary text-secondary-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
            <User className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-muted-foreground text-xs">Tutor</div>
            <div className="truncate text-sm font-semibold" title={clientName}>
              {clientName}
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
              {clientPhone ? (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3" aria-hidden /> {clientPhone}
                </span>
              ) : null}
              {clientDocumentId ? (
                <span>CI {clientDocumentId}</span>
              ) : null}
            </div>
          </div>
        </div>

        {onViewHistory ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewHistory}
            className="shrink-0"
          >
            <Calendar className="size-3.5" />
            Historial
            {historyCount != null ? (
              <span className="bg-muted text-muted-foreground ml-1 rounded px-1 text-xs">
                {historyCount}
              </span>
            ) : null}
            <ChevronRight className="size-3.5" />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
