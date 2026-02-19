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
import { RolFormDialog } from './rol-form'
import { deleteRolLista } from '@/lib/actions/lista'
import { ROL_LABELS } from '@/lib/constants/lista'
import type { Persona, RolListaConPersona, RolListaTipo } from '@/types/database'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const ROL_TIPOS = Object.keys(ROL_LABELS) as RolListaTipo[]

const ROL_BADGE_VARIANT: Record<RolListaTipo, 'default' | 'secondary' | 'outline'> = {
  Dirigente: 'default',
  Comision_Electoral: 'secondary',
  Comision_Fiscal: 'secondary',
  Asamblea_Representativa: 'outline',
}

interface ListaClientProps {
  roles: RolListaConPersona[]
  personas: Persona[]
}

export function ListaClient({ roles, personas }: ListaClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingRol, setEditingRol] = useState<RolListaConPersona | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<RolListaTipo | 'todos'>('todos')
  const [, startTransition] = useTransition()

  const filtered = filtroTipo === 'todos'
    ? roles
    : roles.filter(r => r.tipo === filtroTipo)

  function openCreate() { setEditingRol(null); setFormOpen(true) }
  function openEdit(r: RolListaConPersona) { setEditingRol(r); setFormOpen(true) }

  function handleDelete(id: number) {
    if (!confirm('¿Eliminar este integrante de la lista?')) return
    startTransition(async () => {
      try {
        await deleteRolLista(id)
        toast.success('Integrante eliminado')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al eliminar')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lista</h1>
          <p className="text-muted-foreground text-sm">Integrantes de la lista electoral.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo integrante
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as RolListaTipo | 'todos')}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los roles</SelectItem>
            {ROL_TIPOS.map(t => (
              <SelectItem key={t} value={t}>{ROL_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} integrante{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Posición</TableHead>
              <TableHead>Quién lo trajo</TableHead>
              <TableHead>Comentario</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No hay integrantes{filtroTipo !== 'todos' ? ` en ${ROL_LABELS[filtroTipo]}` : ''}.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.personas.nombre}</TableCell>
                  <TableCell>
                    <Badge variant={ROL_BADGE_VARIANT[r.tipo]}>{ROL_LABELS[r.tipo]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.posicion ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{r.quien_lo_trajo ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">{r.comentario ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(r.id)}>
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

      <RolFormDialog open={formOpen} onOpenChange={setFormOpen} rol={editingRol} personas={personas} />
    </div>
  )
}
