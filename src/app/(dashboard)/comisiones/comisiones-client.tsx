'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ComisionFormDialog } from './comision-form'
import { deleteComisionInteres } from '@/lib/actions/comisiones'
import { COMISION_LABELS } from '@/lib/constants/comisiones'
import type { ComisionConPersona, ComisionTipo, Persona } from '@/types/database'
import { Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'

const COMISION_TIPOS = Object.keys(COMISION_LABELS) as ComisionTipo[]

interface ComisionesClientProps {
  comisiones: ComisionConPersona[]
  personas: Persona[]
}

export function ComisionesClient({ comisiones, personas }: ComisionesClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [filtro, setFiltro] = useState<ComisionTipo | 'todas'>('todas')
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  const filtered = filtro === 'todas'
    ? comisiones
    : comisiones.filter(c => c.comision === filtro)

  // Count per comisión for summary
  const counts = COMISION_TIPOS.reduce((acc, c) => {
    acc[c] = comisiones.filter(x => x.comision === c).length
    return acc
  }, {} as Record<ComisionTipo, number>)

  function handleDeleteConfirm() {
    if (pendingId === null) return
    const id = pendingId
    setPendingId(null)
    startTransition(async () => {
      try {
        await deleteComisionInteres(id)
        toast.success('Eliminado')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al eliminar')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comisiones</h1>
          <p className="text-muted-foreground text-sm">Interés en comisiones de trabajo.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar interés
        </Button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {COMISION_TIPOS.map(c => (
          <button
            key={c}
            onClick={() => setFiltro(filtro === c ? 'todas' : c)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              filtro === c
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:bg-muted'
            }`}
          >
            {COMISION_LABELS[c]}
            <span className={`rounded-full px-1.5 py-0.5 text-xs ${
              filtro === c ? 'bg-primary-foreground/20' : 'bg-muted'
            }`}>
              {counts[c]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Select value={filtro} onValueChange={(v) => setFiltro(v as ComisionTipo | 'todas')}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las comisiones</SelectItem>
            {COMISION_TIPOS.map(c => (
              <SelectItem key={c} value={c}>{COMISION_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Comisión</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Celular</TableHead>
              <TableHead className="w-16 text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No hay registros{filtro !== 'todas' ? ` para ${COMISION_LABELS[filtro as ComisionTipo]}` : ''}.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.personas.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{COMISION_LABELS[c.comision]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.personas.cedula ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.personas.celular ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setPendingId(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ComisionFormDialog open={formOpen} onOpenChange={setFormOpen} personas={personas} />
      <ConfirmDialog
        open={pendingId !== null}
        onOpenChange={(open) => { if (!open) setPendingId(null) }}
        title="¿Eliminar interés?"
        description="Esta acción no se puede deshacer."
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
