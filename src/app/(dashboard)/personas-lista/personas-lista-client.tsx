'use client'

import { useState } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PersonaEditForm } from './persona-edit-form'
import { ImportPersonasDialog } from './import-personas-dialog'
import { ExportDialog, type ExportField } from '@/components/export-dialog'
import { ROL_LABELS } from '@/lib/constants/lista'
import type { PersonaConRoles, RolListaTipo } from '@/types/database'
import { Pencil, Plus, Search } from 'lucide-react'

const EXPORT_FIELDS: ExportField<PersonaConRoles>[] = [
  { key: 'nombre',           label: 'Nombre',             defaultChecked: true,  getValue: p => p.nombre },
  { key: 'cedula',           label: 'Cédula',             defaultChecked: true,  getValue: p => p.cedula },
  { key: 'nro_socio',        label: 'Nro de Socio',       defaultChecked: true,  getValue: p => p.nro_socio },
  { key: 'celular',          label: 'Celular',            defaultChecked: true,  getValue: p => p.celular },
  { key: 'telefono',         label: 'Teléfono',           defaultChecked: false, getValue: p => p.telefono },
  { key: 'email',            label: 'Email',              defaultChecked: false, getValue: p => p.email },
  { key: 'fecha_nacimiento', label: 'Fecha de Nacimiento',defaultChecked: false, getValue: p => p.fecha_nacimiento },
  { key: 'direccion',        label: 'Dirección',          defaultChecked: false, getValue: p => p.direccion },
  { key: 'roles',            label: 'Roles',              defaultChecked: false, getValue: p => p.roles_lista.map(r => ROL_LABELS[r.tipo as RolListaTipo]).join(', ') },
]

interface PersonasListaClientProps {
  personas: PersonaConRoles[]
}

export function PersonasListaClient({ personas }: PersonasListaClientProps) {
  const [editingPersona, setEditingPersona] = useState<PersonaConRoles | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [search, setSearch] = useState('')

  function openCreate() { setEditingPersona(null); setFormOpen(true) }

  const filtered = search.trim()
    ? personas.filter(p =>
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (p.cedula ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : personas

  function openEdit(p: PersonaConRoles) {
    setEditingPersona(p)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personas de la Lista</h1>
          <p className="text-muted-foreground text-sm">Datos personales de los integrantes de la lista electoral.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva persona
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o cédula..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} persona{filtered.length !== 1 ? 's' : ''}</span>
        <div className="ml-auto flex gap-2">
          <ImportPersonasDialog />
          <ExportDialog
            data={filtered}
            fields={EXPORT_FIELDS}
            filename="personas-lista"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Nº Socio</TableHead>
              <TableHead>Celular</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="w-16 text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {search ? 'No se encontraron personas.' : 'No hay personas en la lista.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{p.cedula ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{p.nro_socio ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{p.celular ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[160px] truncate">{p.direccion ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.roles_lista.map(r => (
                        <Badge key={r.id} variant="outline" className="text-xs">
                          {ROL_LABELS[r.tipo as RolListaTipo]}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PersonaEditForm open={formOpen} onOpenChange={setFormOpen} persona={editingPersona} />
    </div>
  )
}
