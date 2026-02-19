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
import { GastoFormDialog } from './gasto-form'
import { deleteGasto } from '@/lib/actions/gastos'
import { RUBRO_LABELS } from '@/lib/constants/gastos'
import type { Gasto, GastoRubro } from '@/types/database'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'

const RUBROS = Object.keys(RUBRO_LABELS) as GastoRubro[]

function formatMonto(monto: number) {
  return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', minimumFractionDigits: 0 }).format(monto)
}

function formatFecha(fecha: string) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface GastosClientProps {
  gastos: Gasto[]
}

export function GastosClient({ gastos }: GastosClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null)
  const [filtroRubro, setFiltroRubro] = useState<GastoRubro | 'todos'>('todos')
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  const filtered = filtroRubro === 'todos'
    ? gastos
    : gastos.filter(g => g.rubro === filtroRubro)

  const totalFiltered = filtered.reduce((sum, g) => sum + g.monto, 0)
  const totalGeneral = gastos.reduce((sum, g) => sum + g.monto, 0)

  // Totals per rubro for summary chips
  const totalesPorRubro = RUBROS.reduce((acc, r) => {
    acc[r] = gastos.filter(g => g.rubro === r).reduce((s, g) => s + g.monto, 0)
    return acc
  }, {} as Record<GastoRubro, number>)

  function openCreate() { setEditingGasto(null); setFormOpen(true) }
  function openEdit(g: Gasto) { setEditingGasto(g); setFormOpen(true) }

  function handleDeleteConfirm() {
    if (pendingId === null) return
    const id = pendingId
    setPendingId(null)
    startTransition(async () => {
      try {
        await deleteGasto(id)
        toast.success('Gasto eliminado')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al eliminar')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gastos</h1>
          <p className="text-muted-foreground text-sm">Control de gastos de campaña.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo gasto
        </Button>
      </div>

      {/* Summary chips by rubro */}
      <div className="flex flex-wrap gap-2">
        {RUBROS.filter(r => totalesPorRubro[r] > 0).map(r => (
          <button
            key={r}
            onClick={() => setFiltroRubro(filtroRubro === r ? 'todos' : r)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              filtroRubro === r
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:bg-muted'
            }`}
          >
            {RUBRO_LABELS[r]}
            <span className={`rounded-full px-1.5 py-0.5 text-xs ${
              filtroRubro === r ? 'bg-primary-foreground/20' : 'bg-muted'
            }`}>
              {formatMonto(totalesPorRubro[r])}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={filtroRubro} onValueChange={v => setFiltroRubro(v as GastoRubro | 'todos')}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los rubros</SelectItem>
              {RUBROS.map(r => (
                <SelectItem key={r} value={r}>{RUBRO_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="text-sm font-medium">
          Total{filtroRubro !== 'todos' ? ` (${RUBRO_LABELS[filtroRubro]})` : ''}: {formatMonto(totalFiltered)}
          {filtroRubro !== 'todos' && (
            <span className="text-muted-foreground font-normal ml-2">/ {formatMonto(totalGeneral)} total general</span>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Rubro</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Programa / Campaña</TableHead>
              <TableHead>Quién pagó</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No hay gastos{filtroRubro !== 'todos' ? ` en ${RUBRO_LABELS[filtroRubro]}` : ''}.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(g => (
                <TableRow key={g.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{formatFecha(g.fecha)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{RUBRO_LABELS[g.rubro]}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate">{g.concepto ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[140px] truncate">{g.programa_campana ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{g.quien_pago ?? '—'}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatMonto(g.monto)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(g)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setPendingId(g.id)}>
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

      <GastoFormDialog open={formOpen} onOpenChange={setFormOpen} gasto={editingGasto} />
      <ConfirmDialog
        open={pendingId !== null}
        onOpenChange={(open) => { if (!open) setPendingId(null) }}
        title="¿Eliminar gasto?"
        description="Esta acción no se puede deshacer."
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
