
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SuperadminPlansPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Planes</h1>
        <p className="text-sm text-muted-foreground">
          Administra los planes disponibles para las clínicas.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Planes configurados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Todavía no hay planes para mostrar.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
﻿
