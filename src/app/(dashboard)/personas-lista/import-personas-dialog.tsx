'use client'

import { useRef, useState, useTransition } from 'react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { importPersonas, type ImportPersonasRow } from '@/lib/actions/import-lista'

// Column headers accepted (case-insensitive)
const COL_MAP: Record<string, keyof ImportPersonasRow> = {
  'nombre': 'nombre',
  'cédula': 'cedula',
  'cedula': 'cedula',
  'nro de socio': 'nro_socio',
  'nro_socio': 'nro_socio',
  'nro socio': 'nro_socio',
  'celular': 'celular',
  'teléfono': 'telefono',
  'telefono': 'telefono',
  'email': 'email',
  'correo': 'email',
  'fecha de nacimiento': 'fecha_nacimiento',
  'fecha_nacimiento': 'fecha_nacimiento',
  'dirección': 'direccion',
  'direccion': 'direccion',
}

function parseSheet(data: unknown[][]): ImportPersonasRow[] {
  if (data.length < 2) return []
  const headers = (data[0] as string[]).map(h => String(h ?? '').toLowerCase().trim())
  return data.slice(1).map(raw => {
    const row: ImportPersonasRow = { nombre: '' }
    headers.forEach((h, i) => {
      const field = COL_MAP[h]
      if (field) (row as unknown as Record<string, unknown>)[field] = String((raw as unknown[])[i] ?? '').trim() || null
    })
    row.nombre = row.nombre?.trim() || ''
    return row
  }).filter(r => r.nombre)
}

export function ImportPersonasDialog() {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<ImportPersonasRow[]>([])
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
      const rows = parseSheet(data)
      if (rows.length === 0) {
        toast.error('No se encontraron filas válidas. Asegúrese de incluir columna "Nombre".')
        return
      }
      setPreview(rows)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  function handleConfirm() {
    startTransition(async () => {
      try {
        const result = await importPersonas(preview)
        const msgs = [`${result.inserted} insertadas`, `${result.updated} actualizadas`]
        if (result.errors.length > 0) {
          toast.warning(`${msgs.join(', ')}. ${result.errors.length} errores: ${result.errors.slice(0, 3).join('; ')}`)
        } else {
          toast.success(`Importación completada: ${msgs.join(', ')}`)
        }
        setPreview([])
        setOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al importar')
      }
    })
  }

  function handleOpen() {
    setPreview([])
    setOpen(true)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <Upload className="h-4 w-4 mr-2" />
        Importar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Importar Personas desde Excel</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 space-y-4 pr-1">
            {preview.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sube un archivo Excel (.xlsx) con las siguientes columnas (el orden no importa):
                </p>
                <div className="rounded-md border bg-muted/40 p-3 text-xs font-mono space-y-0.5">
                  <p><span className="font-semibold">Nombre</span> <span className="text-muted-foreground">(requerido)</span></p>
                  <p>Cédula · Nro de Socio · Celular · Teléfono · Email · Fecha de Nacimiento · Dirección</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Si la cédula coincide con una persona existente, sus datos serán actualizados. Si no, se creará una nueva persona.
                </p>
                <Button variant="outline" onClick={() => inputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Seleccionar archivo
                </Button>
                <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Vista previa — {preview.length} persona{preview.length !== 1 ? 's' : ''} encontradas:
                </p>
                <div className="rounded-md border overflow-auto max-h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Cédula</TableHead>
                        <TableHead>Nro Socio</TableHead>
                        <TableHead>Celular</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.slice(0, 10).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{r.nombre}</TableCell>
                          <TableCell>{r.cedula ?? '—'}</TableCell>
                          <TableCell>{r.nro_socio ?? '—'}</TableCell>
                          <TableCell>{r.celular ?? '—'}</TableCell>
                          <TableCell>{r.email ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {preview.length > 10 && (
                  <p className="text-xs text-muted-foreground">...y {preview.length - 10} más</p>
                )}
                <Button variant="ghost" size="sm" onClick={() => setPreview([])}>
                  Cambiar archivo
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            {preview.length > 0 && (
              <Button onClick={handleConfirm}>
                Importar {preview.length} persona{preview.length !== 1 ? 's' : ''}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
