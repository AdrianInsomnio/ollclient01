import { CalendarClock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminSettingsAgendaPage() {
  return <Card><CardHeader><CardTitle className='flex items-center gap-2'><CalendarClock /> Agenda y citas</CardTitle><CardDescription>La agenda operativa se administra desde el módulo actual.</CardDescription></CardHeader><CardContent className='text-sm text-muted-foreground'>Las configuraciones específicas de agenda se integrarán cuando exista persistencia dedicada en el backend.</CardContent></Card>
}
