'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, Download, Upload, Plus, Trash2, UserCheck, ListChecks } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { ElectorConPersona, ElectorEstado } from '@/types/database'
import { ELECTOR_ESTADOS } from '@/lib/validations/elector'
import { exportElectoresToCSV } from '@/lib/csv-export'
import { deleteElector, asignarElectoresEnMasa, cambiarEstadoEnMasa } from '@/lib/actions/electores'
import { ElectorFormDialog } from './elector-form'
import { ConfirmDialog } from '@/components/confirm-dialog'

const estadoBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pendiente: 'outline',
  Llamado: 'secondary',
  Confirmado: 'default',
  Para_Enviar: 'secondary',
  Lista_Enviada: 'secondary',
  Numero_Incorrecto: 'outline',
  Descartado: 'destructive',
}

const PAGE_SIZE = 20

function calcEdad(fechaNacimiento: string | null | undefined): string {
  if (!fechaNacimiento) return '-'
  const hoy = new Date()
  const nac = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad >= 0 ? String(edad) : '-'
}

interface Props {
  electores: ElectorConPersona[]
  isAdmin: boolean
  voluntarios: { id: string; nombre: string }[]
}

export function ElectoresDataTable({ electores, isAdmin, voluntarios }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [page, setPage] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingElector, setEditingElector] = useState<ElectorConPersona | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [assignVoluntarioId, setAssignVoluntarioId] = useState<string>('')
  const [bulkEstado, setBulkEstado] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  const totalPages = Math.ceil(electores.length / PAGE_SIZE)
  const paged = electores.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const allIds = electores.map((e) => e.id)
  const pagedIds = paged.map((e) => e.id)
  const allPageSelected = pagedIds.length > 0 && pagedIds.every((id) => selected.has(id))
  const somePageSelected = !allPageSelected && pagedIds.some((id) => selected.has(id))
  const allResultsSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (search) params.set('search', search)
    else params.delete('search')
    params.delete('estado') // keep estado if set
    const estado = searchParams.get('estado')
    if (estado) params.set('estado', estado)
    router.push(`/electores?${params.toString()}`)
  }

  function handleEstadoFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') params.set('estado', value)
    else params.delete('estado')
    router.push(`/electores?${params.toString()}`)
  }

  function handleSinAsignarToggle() {
    const params = new URLSearchParams(searchParams.toString())
    if (searchParams.get('sinAsignar') === '1') {
      params.delete('sinAsignar')
    } else {
      params.set('sinAsignar', '1')
      params.delete('asignadoA')
    }
    router.push(`/electores?${params.toString()}`)
  }

  function handleVoluntarioFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set('asignadoA', value)
      params.delete('sinAsignar')
    } else {
      params.delete('asignadoA')
    }
    router.push(`/electores?${params.toString()}`)
  }

  async function handleDeleteConfirm() {
    if (pendingDeleteId === null) return
    const id = pendingDeleteId
    setPendingDeleteId(null)
    setDeleting(id)
    try {
      await deleteElector(id)
      router.refresh()
    } catch {
      toast.error('Error al eliminar elector')
    } finally {
      setDeleting(null)
    }
  }

  function handleEdit(elector: ElectorConPersona) {
    setEditingElector(elector)
    setDialogOpen(true)
  }

  function handleCreate() {
    setEditingElector(null)
    setDialogOpen(true)
  }

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(pagedIds))
    }
  }

  function selectAllResults() {
    setSelected(new Set(allIds))
  }

  function toggleRow(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleCancelSelection() {
    setSelected(new Set())
    setAssignVoluntarioId('')
    setBulkEstado('')
  }

  function handleApplyAssign() {
    startTransition(async () => {
      try {
        await asignarElectoresEnMasa(
          Array.from(selected),
          assignVoluntarioId === '__none__' ? null : assignVoluntarioId || null
        )
        toast.success(`${selected.size} elector${selected.size !== 1 ? 'es' : ''} asignado${selected.size !== 1 ? 's' : ''}`)
        setSelected(new Set())
        setAssignVoluntarioId('')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al asignar')
      }
    })
  }

  function handleApplyEstado() {
    if (!bulkEstado) return
    startTransition(async () => {
      try {
        await cambiarEstadoEnMasa(Array.from(selected), bulkEstado as ElectorEstado)
        toast.success(`${selected.size} elector${selected.size !== 1 ? 'es' : ''} actualizado${selected.size !== 1 ? 's' : ''}`)
        setSelected(new Set())
        setBulkEstado('')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al cambiar estado')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, cedula, nro socio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-[300px]"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Buscar
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <Select
            defaultValue={searchParams.get('estado') ?? 'all'}
            onValueChange={handleEstadoFilter}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filtrar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {ELECTOR_ESTADOS.map((e) => (
                <SelectItem key={e} value={e}>
                  {e.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdmin && (
            <>
              <Select
                defaultValue={searchParams.get('asignadoA') ?? 'all'}
                onValueChange={handleVoluntarioFilter}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Voluntario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {voluntarios.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={searchParams.get('sinAsignar') === '1' ? 'default' : 'outline'}
                size="sm"
                onClick={handleSinAsignarToggle}
              >
                Sin asignar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportElectoresToCSV(electores)}
              >
                <Download className="mr-1 h-4 w-4" />
                CSV
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/electores/import">
                  <Upload className="mr-1 h-4 w-4" />
                  Importar
                </Link>
              </Button>
              <Button size="sm" onClick={handleCreate}>
                <Plus className="mr-1 h-4 w-4" />
                Nuevo
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bulk actions toolbar */}
      {isAdmin && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium shrink-0">{selected.size} seleccionado{selected.size !== 1 ? 's' : ''}</span>
          <span className="text-muted-foreground text-sm">·</span>

          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={assignVoluntarioId} onValueChange={setAssignVoluntarioId}>
              <SelectTrigger className="w-[170px] h-8">
                <SelectValue placeholder="Asignar a..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin asignar</SelectItem>
                {voluntarios.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={isPending || !assignVoluntarioId} onClick={handleApplyAssign}>
              Aplicar
            </Button>
          </div>

          <span className="text-muted-foreground text-sm">·</span>

          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={bulkEstado} onValueChange={setBulkEstado}>
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue placeholder="Cambiar estado..." />
              </SelectTrigger>
              <SelectContent>
                {ELECTOR_ESTADOS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={isPending || !bulkEstado} onClick={handleApplyEstado}>
              Aplicar
            </Button>
          </div>

          <Button size="sm" variant="ghost" onClick={handleCancelSelection}>
            Cancelar
          </Button>
        </div>
      )}

      {/* Select all results banner (Gmail pattern) */}
      {isAdmin && allPageSelected && !allResultsSelected && electores.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2 rounded-md border bg-muted/30 px-4 py-2 text-sm">
          <span>Seleccionaste {pagedIds.length} registros de esta página.</span>
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 hover:underline"
            onClick={selectAllResults}
          >
            Seleccionar todos los {electores.length} resultados
          </button>
        </div>
      )}
      {isAdmin && allResultsSelected && electores.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2 rounded-md border bg-primary/10 px-4 py-2 text-sm">
          <span>Todos los <span className="font-medium">{electores.length}</span> resultados están seleccionados.</span>
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => setSelected(new Set())}
          >
            Limpiar selección
          </button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
              )}
              <TableHead>Nombre</TableHead>
              {isAdmin && <TableHead>Edad</TableHead>}
              {isAdmin && <TableHead>Nro Socio</TableHead>}
              <TableHead>Celular</TableHead>
              {isAdmin && <TableHead>Estado</TableHead>}
              {isAdmin && <TableHead>Asignado a</TableHead>}
              {isAdmin && <TableHead className="w-[80px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 2} className="text-center text-muted-foreground py-8">
                  No se encontraron electores
                </TableCell>
              </TableRow>
            ) : (
              paged.map((e) => (
                <TableRow
                  key={e.id}
                  className={`cursor-pointer${selected.has(e.id) ? ' bg-muted/50' : ''}`}
                  onClick={() => router.push(`/electores/${e.id}`)}
                >
                  {isAdmin && (
                    <TableCell>
                      <Checkbox
                        checked={selected.has(e.id)}
                        onCheckedChange={() => toggleRow(e.id)}
                        onClick={(ev) => ev.stopPropagation()}
                        aria-label="Seleccionar elector"
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{e.personas?.nombre ?? '-'}</TableCell>
                  {isAdmin && <TableCell>{calcEdad(e.personas?.fecha_nacimiento)}</TableCell>}
                  {isAdmin && <TableCell>{e.personas?.nro_socio ?? '-'}</TableCell>}
                  <TableCell>{e.personas?.celular ?? e.personas?.telefono ?? '-'}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Badge variant={estadoBadgeVariant[e.estado] ?? 'outline'}>
                        {e.estado.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  )}
                  {isAdmin && (
                    <TableCell className="text-sm text-muted-foreground">
                      {e.asignado_a ? (voluntarios.find(v => v.id === e.asignado_a)?.nombre ?? '—') : '—'}
                    </TableCell>
                  )}
                  {isAdmin && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(ev) => {
                            ev.stopPropagation()
                            handleEdit(e)
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleting === e.id}
                          onClick={(ev) => {
                            ev.stopPropagation()
                            setPendingDeleteId(e.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, electores.length)} de{' '}
            {electores.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {isAdmin && (
        <ElectorFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          elector={editingElector}
          voluntarios={voluntarios}
        />
      )}
      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null) }}
        title="¿Eliminar elector?"
        description="Esta acción no se puede deshacer. Se eliminará el elector y sus datos asociados."
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
