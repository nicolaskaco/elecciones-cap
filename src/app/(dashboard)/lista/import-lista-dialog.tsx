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
import { importRolesLista, type ImportRolRow } from '@/lib/actions/import-lista'

const COL_MAP: Record<string, keyof ImportRolRow> = {
  'cédula': 'cedula',
  'cedula': 'cedula',
  'nombre': 'nombre',
  'rol': 'tipo',
  'tipo': 'tipo',
  'posición': 'posicion',
  'posicion': 'posicion',
  'quién lo trajo': 'quien_lo_trajo',
  'quien lo trajo': 'quien_lo_trajo',
  'quien_lo_trajo': 'quien_lo_trajo',
  'comentario': 'comentario',
}

function parseSheet(data: unknown[][]): ImportRolRow[] {
  if (data.length < 2) return []
  const headers = (data[0] as string[]).map(h => String(h ?? '').toLowerCase().trim())
  return data.slice(1).map(raw => {
    const row: ImportRolRow = { tipo: '' }
    headers.forEach((h, i) => {
      const field = COL_MAP[h]
      if (field) (row as unknown as Record<string, unknown>)[field] = String((raw as unknown[])[i] ?? '').trim() || null
    })
    row.tipo = row.tipo?.trim() || ''
    return row
  }).filter(r => r.tipo && (r.cedula || r.nombre))
}

export function ImportListaDialog() {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<ImportRolRow[]>([])
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
        toast.error('No se encontraron filas válidas. Se requieren columnas "Rol" y "Cédula" o "Nombre".')
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
        const result = await importRolesLista(preview)
        if (result.errors.length > 0) {
          toast.warning(`${result.inserted} insertados. ${result.errors.length} errores: ${result.errors.slice(0, 3).join('; ')}`)
        } else {
          toast.success(`Importación completada: ${result.inserted} integrantes insertados`)
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
            <DialogTitle>Importar Lista desde Excel</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 space-y-4 pr-1">
            {preview.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sube un archivo Excel (.xlsx) con las siguientes columnas (el orden no importa):
                </p>
                <div className="rounded-md border bg-muted/40 p-3 text-xs font-mono space-y-0.5">
                  <p>
                    <span className="font-semibold">Cédula</span> o <span className="font-semibold">Nombre</span>
                    <span className="text-muted-foreground"> (al menos uno requerido — identifica la persona)</span>
                  </p>
                  <p>
                    <span className="font-semibold">Rol</span>
                    <span className="text-muted-foreground"> (requerido) — Dirigente, Comisión Electoral, Comisión Fiscal, Asamblea Representativa</span>
                  </p>
                  <p>Posición · Quién lo trajo · Comentario</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  La persona debe existir previamente en el sistema. Si la cédula coincide se usa de prioridad; si no, se busca por nombre exacto.
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
                  Vista previa — {preview.length} integrante{preview.length !== 1 ? 's' : ''} encontrados:
                </p>
                <div className="rounded-md border overflow-auto max-h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cédula</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Posición</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.slice(0, 10).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.cedula ?? '—'}</TableCell>
                          <TableCell>{r.nombre ?? '—'}</TableCell>
                          <TableCell>{r.tipo}</TableCell>
                          <TableCell>{r.posicion ?? '—'}</TableCell>
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
                Importar {preview.length} integrante{preview.length !== 1 ? 's' : ''}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
