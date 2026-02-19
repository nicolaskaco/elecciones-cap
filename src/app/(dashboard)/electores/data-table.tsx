'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, Download, Upload, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { ElectorConPersona } from '@/types/database'
import { ELECTOR_ESTADOS } from '@/lib/validations/elector'
import { exportElectoresToCSV } from '@/lib/csv-export'
import { deleteElector } from '@/lib/actions/electores'
import { ElectorFormDialog } from './elector-form'

const estadoBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pendiente: 'outline',
  Llamado: 'secondary',
  Acepto: 'default',
  Sobre_Enviado: 'secondary',
  Descartado: 'destructive',
}

const PAGE_SIZE = 20

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

  const totalPages = Math.ceil(electores.length / PAGE_SIZE)
  const paged = electores.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

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

  async function handleDelete(id: number) {
    if (!confirm('Estas seguro de eliminar este elector?')) return
    setDeleting(id)
    try {
      await deleteElector(id)
      router.refresh()
    } catch {
      alert('Error al eliminar elector')
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              {isAdmin && <TableHead>Cedula</TableHead>}
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
                <TableCell colSpan={isAdmin ? 7 : 2} className="text-center text-muted-foreground py-8">
                  No se encontraron electores
                </TableCell>
              </TableRow>
            ) : (
              paged.map((e) => (
                <TableRow
                  key={e.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/electores/${e.id}`)}
                >
                  <TableCell className="font-medium">{e.personas.nombre}</TableCell>
                  {isAdmin && <TableCell>{e.personas.cedula ?? '-'}</TableCell>}
                  {isAdmin && <TableCell>{e.personas.nro_socio ?? '-'}</TableCell>}
                  <TableCell>{e.personas.celular ?? e.personas.telefono ?? '-'}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Badge variant={estadoBadgeVariant[e.estado] ?? 'outline'}>
                        {e.estado.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  )}
                  {isAdmin && (
                    <TableCell className="text-sm text-muted-foreground">
                      {/* Would show voluntario name, but we only have UUID */}
                      {e.asignado_a ? 'Asignado' : '-'}
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
                            handleDelete(e.id)
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
    </div>
  )
}
