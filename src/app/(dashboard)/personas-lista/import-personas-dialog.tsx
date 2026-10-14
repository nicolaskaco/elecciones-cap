'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  importPersonas, previewImportPersonas,
  type ImportPersonasRow, type ImportPersonaPreview,
} from '@/lib/actions/import-lista'

type Field = Exclude<keyof ImportPersonasRow, 'fila'>

const FIELD_LABELS: Record<Field, string> = {
  nombre: 'Nombre',
  cedula: 'Cédula',
  nro_socio: 'Nro de Socio',
  celular: 'Celular',
  telefono: 'Teléfono',
  email: 'Email',
  fecha_nacimiento: 'Fecha de Nacimiento',
  direccion: 'Dirección',
  quien_lo_trajo: 'Quién lo trajo',
  comentario: 'Comentario',
  rol: 'Rol',
}

const FIELDS = Object.keys(FIELD_LABELS) as Field[]
const IGNORE = '__ignore__'

// Column headers auto-detected (case-insensitive)
const COL_MAP: Record<string, Field> = {
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
  'quién lo trajo': 'quien_lo_trajo',
  'quien lo trajo': 'quien_lo_trajo',
  'quien_lo_trajo': 'quien_lo_trajo',
  'comentario': 'comentario',
  'comentarios': 'comentario',
  'rol': 'rol',
  'tipo': 'rol',
}

const ESTADO_BADGE: Record<ImportPersonaPreview['estado'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  nueva: { label: 'Nueva', variant: 'default' },
  existente: { label: 'Actualiza', variant: 'secondary' },
  ambigua: { label: 'Ambigua', variant: 'destructive' },
  error: { label: 'Error', variant: 'destructive' },
}

interface SheetData {
  headers: string[]
  rows: unknown[][]
}

function autoMapping(headers: string[]): (Field | null)[] {
  const used = new Set<Field>()
  return headers.map(h => {
    const field = COL_MAP[h.toLowerCase().trim()]
    if (!field || used.has(field)) return null
    used.add(field)
    return field
  })
}

function buildRows(sheet: SheetData, mapping: (Field | null)[]): ImportPersonasRow[] {
  return sheet.rows.map((raw, idx) => {
    // +2: header row, and spreadsheets are 1-based
    const row: ImportPersonasRow = { fila: idx + 2, nombre: '' }
    mapping.forEach((field, i) => {
      if (field) (row as unknown as Record<string, unknown>)[field] = String(raw[i] ?? '').trim() || null
    })
    row.nombre = row.nombre?.trim() || ''
    return row
  }).filter(r => r.nombre)
}

function sampleValue(sheet: SheetData, col: number): string {
  const value = sheet.rows.map(r => String(r[col] ?? '').trim()).find(Boolean)
  return value ?? ''
}

export function ImportPersonasDialog() {
  const [open, setOpen] = useState(false)
  const [sheet, setSheet] = useState<SheetData | null>(null)
  const [mapping, setMapping] = useState<(Field | null)[]>([])
  const [statuses, setStatuses] = useState<ImportPersonaPreview[] | null>(null)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const statusRequest = useRef(0)

  const preview = useMemo(() => (sheet ? buildRows(sheet, mapping) : []), [sheet, mapping])
  const hasNombre = mapping.includes('nombre')

  const counts = useMemo(() => {
    const c = { nueva: 0, existente: 0, ambigua: 0, error: 0 }
    statuses?.forEach(s => { c[s.estado]++ })
    return c
  }, [statuses])

  function refreshStatuses(rows: ImportPersonasRow[]) {
    const request = ++statusRequest.current
    setStatuses(null)
    if (rows.length === 0) return
    previewImportPersonas(rows)
      .then(result => { if (statusRequest.current === request) setStatuses(result) })
      .catch(() => { if (statusRequest.current === request) toast.error('No se pudo verificar personas existentes') })
  }

  function resetFile() {
    statusRequest.current++
    setSheet(null)
    setMapping([])
    setStatuses(null)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
      if (data.length < 2) {
        toast.error('El archivo no tiene filas para importar.')
        return
      }
      const nextSheet: SheetData = {
        headers: (data[0] as unknown[]).map(h => String(h ?? '').trim()),
        rows: data.slice(1),
      }
      const nextMapping = autoMapping(nextSheet.headers)
      setSheet(nextSheet)
      setMapping(nextMapping)
      refreshStatuses(buildRows(nextSheet, nextMapping))
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  function handleMappingChange(col: number, value: string) {
    if (!sheet) return
    const field = value === IGNORE ? null : (value as Field)
    // A field can only come from one column: unassign it elsewhere
    const next = mapping.map((f, i) => (i === col ? field : f === field ? null : f))
    setMapping(next)
    refreshStatuses(buildRows(sheet, next))
  }

  function handleConfirm() {
    startTransition(async () => {
      try {
        const result = await importPersonas(preview)
        const msgs = [`${result.inserted} insertadas`, `${result.updated} actualizadas`]
        if (result.rolesAssigned) msgs.push(`${result.rolesAssigned} roles asignados`)
        if (result.errors.length > 0) {
          toast.warning(`${msgs.join(', ')}. ${result.errors.length} errores: ${result.errors.slice(0, 3).join('; ')}`)
        } else {
          toast.success(`Importación completada: ${msgs.join(', ')}`)
        }
        resetFile()
        setOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al importar')
      }
    })
  }

  function handleOpen() {
    resetFile()
    setOpen(true)
  }

  const previewFields = FIELDS.filter(f => mapping.includes(f))

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} className="dark:border-primary dark:text-primary dark:hover:bg-primary/20">
        <Upload className="h-4 w-4 mr-2" />
        Importar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Importar Personas desde Excel</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 space-y-4 pr-1">
            {!sheet ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sube un archivo Excel (.xlsx). Las columnas se detectan por su encabezado y luego puedes ajustarlas manualmente:
                </p>
                <div className="rounded-md border bg-muted/40 p-3 text-xs font-mono space-y-0.5">
                  <p><span className="font-semibold">Nombre</span> <span className="text-muted-foreground">(requerido)</span></p>
                  <p>Cédula · Nro de Socio · Celular · Teléfono · Email · Fecha de Nacimiento · Dirección · Quién lo trajo · Comentario · Rol</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Rol (opcional): Dirigente, Comisión Electoral, Comisión Fiscal, Asamblea Representativa o Colaborador.
                </p>
                <p className="text-xs text-muted-foreground">
                  Si la cédula o el Nro de Socio coinciden con una persona existente (o el nombre, cuando la fila no tiene cédula), sus datos serán actualizados. Si no, se creará una nueva persona. Las celdas vacías no borran datos existentes.
                </p>
                <Button variant="outline" onClick={() => inputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Seleccionar archivo
                </Button>
                <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Columnas</p>
                  <div className="rounded-md border overflow-auto max-h-56">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Columna del archivo</TableHead>
                          <TableHead>Ejemplo</TableHead>
                          <TableHead className="w-56">Campo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sheet.headers.map((h, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{h || <span className="text-muted-foreground">(sin encabezado)</span>}</TableCell>
                            <TableCell className="text-muted-foreground max-w-[200px] truncate">{sampleValue(sheet, i) || '—'}</TableCell>
                            <TableCell>
                              <Select value={mapping[i] ?? IGNORE} onValueChange={v => handleMappingChange(i, v)}>
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={IGNORE}>— Ignorar —</SelectItem>
                                  {FIELDS.map(f => (
                                    <SelectItem key={f} value={f}>{FIELD_LABELS[f]}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {!hasNombre && (
                    <p className="text-xs text-destructive">Asigne una columna al campo Nombre para continuar.</p>
                  )}
                </div>

                {hasNombre && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Vista previa — {preview.length} persona{preview.length !== 1 ? 's' : ''}
                      {statuses
                        ? `: ${counts.nueva} nuevas, ${counts.existente} actualizan${counts.ambigua + counts.error > 0 ? `, ${counts.ambigua + counts.error} con problemas` : ''}`
                        : preview.length > 0 ? ' (verificando…)' : ''}
                    </p>
                    <div className="rounded-md border overflow-auto max-h-64">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Fila</TableHead>
                            <TableHead>Estado</TableHead>
                            {previewFields.map(f => <TableHead key={f}>{FIELD_LABELS[f]}</TableHead>)}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.map((r, i) => {
                            const status = statuses?.[i]
                            const badge = status && ESTADO_BADGE[status.estado]
                            const detail = status?.mensaje
                              ?? (status?.personaNombre && status.personaNombre !== r.nombre ? `Coincide con ${status.personaNombre}` : undefined)
                            return (
                              <TableRow key={i}>
                                <TableCell className="text-muted-foreground">{r.fila}</TableCell>
                                <TableCell>
                                  {badge
                                    ? <Badge variant={badge.variant} className="text-xs" title={detail}>{badge.label}</Badge>
                                    : <span className="text-xs text-muted-foreground">…</span>}
                                  {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
                                </TableCell>
                                {previewFields.map(f => (
                                  <TableCell key={f} className={f === 'nombre' ? 'font-medium' : undefined}>{r[f] || '—'}</TableCell>
                                ))}
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <Button variant="ghost" size="sm" onClick={resetFile}>
                  Cambiar archivo
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            {hasNombre && preview.length > 0 && (
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
