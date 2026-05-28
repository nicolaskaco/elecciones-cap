'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getEventosParaPersona } from '@/lib/actions/eventos'
import { ROL_LABELS } from '@/lib/constants/lista'
import type { PersonaConRoles, RolListaTipo, Evento } from '@/types/database'

interface PersonaDetailDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  persona: PersonaConRoles | null
}

function formatDate(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

function formatHora(hora: string | null): string {
  if (!hora) return ''
  return hora.slice(0, 5)
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  )
}

export function PersonaDetailDialog({ open, onOpenChange, persona }: PersonaDetailDialogProps) {
  const [eventos, setEventos] = useState<Pick<Evento, 'id' | 'nombre' | 'fecha' | 'hora'>[]>([])
  const [loadingEventos, setLoadingEventos] = useState(false)

  useEffect(() => {
    if (!open || !persona) return
    setLoadingEventos(true)
    getEventosParaPersona(persona.id)
      .then(setEventos)
      .catch(() => setEventos([]))
      .finally(() => setLoadingEventos(false))
  }, [open, persona])

  if (!persona) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{persona.nombre}</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cédula" value={persona.cedula} />
            <Field label="Nº Socio" value={persona.nro_socio} />
            <Field label="Celular" value={persona.celular} />
            <Field label="Teléfono" value={persona.telefono} />
            <Field label="Email" value={persona.email} />
            <Field label="Fecha de nacimiento" value={persona.fecha_nacimiento ? formatDate(persona.fecha_nacimiento) : null} />
          </div>
          <Field label="Dirección" value={persona.direccion} />
          <Field label="Quién lo trajo" value={persona.quien_lo_trajo} />
          {persona.comentario && <Field label="Comentario" value={persona.comentario} />}

          {persona.roles_lista.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Roles</p>
              <div className="flex flex-wrap gap-1">
                {persona.roles_lista.map(r => (
                  <Badge key={r.id} variant="outline" className="text-xs">
                    {ROL_LABELS[r.tipo as RolListaTipo]}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <p className="text-sm font-medium mb-2">Eventos</p>
            {loadingEventos ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : eventos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Esta persona no está asignada a ningún evento.</p>
            ) : (
              <ul className="space-y-1">
                {eventos.map(e => (
                  <li key={e.id} className="flex items-center justify-between text-sm">
                    <span>{e.nombre}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatDate(e.fecha)}{e.hora ? ` · ${formatHora(e.hora)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
