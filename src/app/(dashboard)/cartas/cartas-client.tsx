'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { marcarCartasEnviadas } from '@/lib/actions/electores'
import type { ElectorConPersona } from '@/types/database'

interface CartasClientProps {
  electores: ElectorConPersona[]
}

export function CartasClient({ electores }: CartasClientProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [isPending, startTransition] = useTransition()

  const allSelected = electores.length > 0 && selected.size === electores.length

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(electores.map(e => e.id)))
    }
  }

  function toggleOne(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleEnviar() {
    startTransition(async () => {
      try {
        await marcarCartasEnviadas(Array.from(selected))
        toast.success(`${selected.size} carta${selected.size !== 1 ? 's' : ''} marcada${selected.size !== 1 ? 's' : ''} como enviada${selected.size !== 1 ? 's' : ''}`)
        setSelected(new Set())
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al actualizar')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cartas</h1>
          <p className="text-muted-foreground text-sm">
            Electores pendientes de envío de carta.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
            </span>
          )}
          <Button
            onClick={handleEnviar}
            disabled={selected.size === 0 || isPending}
          >
            <Mail className="h-4 w-4 mr-2" />
            {isPending
              ? 'Actualizando...'
              : `Marcar como enviada${selected.size !== 1 ? 's' : ''}${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  disabled={electores.length === 0}
                  aria-label="Seleccionar todos"
                />
              </TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Nº Socio</TableHead>
              <TableHead>Celular</TableHead>
              <TableHead>Dirección</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {electores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No hay electores pendientes de envío.
                </TableCell>
              </TableRow>
            ) : (
              electores.map(e => (
                <TableRow
                  key={e.id}
                  className="cursor-pointer"
                  onClick={() => toggleOne(e.id)}
                >
                  <TableCell onClick={ev => ev.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(e.id)}
                      onCheckedChange={() => toggleOne(e.id)}
                      aria-label={`Seleccionar ${e.personas.nombre}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{e.personas.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{e.personas.cedula ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{e.personas.nro_socio ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{e.personas.celular ?? e.personas.telefono ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">{e.personas.direccion ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {electores.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {electores.length} elector{electores.length !== 1 ? 'es' : ''} pendiente{electores.length !== 1 ? 's' : ''} de envío
        </p>
      )}
    </div>
  )
}
