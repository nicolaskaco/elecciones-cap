'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { PreguntaFormDialog } from './pregunta-form'
import { ReglasEditor } from './reglas-editor'
import { togglePreguntaActiva, deletePregunta } from '@/lib/actions/flow-config'
import type { PreguntaConReglas } from '@/types/database'
import { Plus, Pencil, GitBranch, Trash2 } from 'lucide-react'

const TIPO_LABELS: Record<string, string> = {
  boolean: 'Sí / No',
  select: 'Selección',
  text: 'Texto',
}

interface FlowConfigClientProps {
  preguntas: PreguntaConReglas[]
}

export function FlowConfigClient({ preguntas }: FlowConfigClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingPregunta, setEditingPregunta] = useState<PreguntaConReglas | null>(null)
  const [reglasOpen, setReglasOpen] = useState(false)
  const [reglasTarget, setReglasTarget] = useState<PreguntaConReglas | null>(null)
  const [, startTransition] = useTransition()

  function openCreate() {
    setEditingPregunta(null)
    setFormOpen(true)
  }

  function openEdit(p: PreguntaConReglas) {
    setEditingPregunta(p)
    setFormOpen(true)
  }

  function openReglas(p: PreguntaConReglas) {
    setReglasTarget(p)
    setReglasOpen(true)
  }

  function handleToggle(id: number, current: boolean) {
    startTransition(async () => {
      try {
        await togglePreguntaActiva(id, !current)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al actualizar')
      }
    })
  }

  function handleDelete(id: number) {
    if (!confirm('¿Eliminar esta pregunta y sus reglas?')) return
    startTransition(async () => {
      try {
        await deletePregunta(id)
        toast.success('Pregunta eliminada')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al eliminar')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flow Config</h1>
          <p className="text-muted-foreground text-sm">Configuración del flow de llamadas.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva pregunta
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Orden</TableHead>
              <TableHead>Texto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-24">Activa</TableHead>
              <TableHead className="w-36 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preguntas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No hay preguntas configuradas.
                </TableCell>
              </TableRow>
            ) : (
              preguntas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">
                    {p.orden_default ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <span className="line-clamp-2">{p.texto}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{TIPO_LABELS[p.tipo] ?? p.tipo}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.activa}
                      onCheckedChange={() => handleToggle(p.id, p.activa)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Editar"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={`Reglas (${p.reglas_flow.length})`}
                        onClick={() => openReglas(p)}
                      >
                        <GitBranch className="h-3.5 w-3.5" />
                        {p.reglas_flow.length > 0 && (
                          <span className="ml-0.5 text-xs">{p.reglas_flow.length}</span>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Eliminar"
                        onClick={() => handleDelete(p.id)}
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

      <PreguntaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        pregunta={editingPregunta}
      />
      <ReglasEditor
        open={reglasOpen}
        onOpenChange={setReglasOpen}
        pregunta={reglasTarget}
        allPreguntas={preguntas}
      />
    </div>
  )
}
