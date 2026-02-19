'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EventoFormDialog } from './evento-form'
import { deleteEvento } from '@/lib/actions/eventos'
import type { Evento } from '@/types/database'
import { Plus, Pencil, Trash2, CalendarDays, MapPin, Clock } from 'lucide-react'

function formatFecha(fecha: string) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-UY', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatHora(hora: string) {
  return hora.slice(0, 5)
}

function getEventDateTime(fecha: string, hora: string | null): Date {
  const base = new Date(fecha + 'T00:00:00')
  if (hora) {
    const [h, m] = hora.split(':').map(Number)
    base.setHours(h, m, 0, 0)
  } else {
    // No time set: treat as end of day so the whole day counts as upcoming
    base.setHours(23, 59, 59, 999)
  }
  return base
}

function getEventoStatus(fecha: string, hora: string | null): 'upcoming' | 'today' | 'past' {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const eventDt = getEventDateTime(fecha, hora)
  if (eventDt <= now) return 'past'
  if (fecha === today) return 'today'
  return 'upcoming'
}

interface EventosClientProps {
  eventos: Evento[]
}

export function EventosClient({ eventos }: EventosClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingEvento, setEditingEvento] = useState<Evento | null>(null)
  const [, startTransition] = useTransition()

  const now = new Date()
  const upcoming = eventos.filter(e => getEventDateTime(e.fecha, e.hora) > now)
  const past = eventos.filter(e => getEventDateTime(e.fecha, e.hora) <= now)

  function openCreate() { setEditingEvento(null); setFormOpen(true) }
  function openEdit(e: Evento) { setEditingEvento(e); setFormOpen(true) }

  function handleDelete(id: number) {
    if (!confirm('¿Eliminar este evento?')) return
    startTransition(async () => {
      try {
        await deleteEvento(id)
        toast.success('Evento eliminado')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al eliminar')
      }
    })
  }

  function EventoRow({ e }: { e: Evento }) {
    const status = getEventoStatus(e.fecha, e.hora)
    return (
      <TableRow key={e.id}>
        <TableCell className="whitespace-nowrap">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className={e.fecha === new Date().toISOString().split('T')[0] ? 'font-semibold text-primary' : ''}>
                {formatFecha(e.fecha)}
              </span>
              {e.fecha === new Date().toISOString().split('T')[0] && (
                <Badge className="text-xs py-0">Hoy</Badge>
              )}
            </div>
            {e.hora && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" />
                {formatHora(e.hora)}
              </div>
            )}
          </div>
        </TableCell>
        <TableCell className="font-medium">{e.nombre}</TableCell>
        <TableCell className="text-muted-foreground max-w-[200px] truncate">
          {e.descripcion ?? '—'}
        </TableCell>
        <TableCell>
          {e.direccion ? (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate max-w-[160px]">{e.direccion}</span>
            </div>
          ) : '—'}
        </TableCell>
        <TableCell>
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(e.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Eventos</h1>
          <p className="text-muted-foreground text-sm">Calendario de eventos de campaña.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo evento
        </Button>
      </div>

      {/* Upcoming */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Próximos · {upcoming.length}
        </h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Lugar</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcoming.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No hay eventos próximos.
                  </TableCell>
                </TableRow>
              ) : (
                upcoming.map(e => <EventoRow key={e.id} e={e} />)
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Pasados · {past.length}
          </h2>
          <div className="rounded-md border opacity-70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Lugar</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {past.slice().reverse().map(e => <EventoRow key={e.id} e={e} />)}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <EventoFormDialog open={formOpen} onOpenChange={setFormOpen} evento={editingEvento} />
    </div>
  )
}
