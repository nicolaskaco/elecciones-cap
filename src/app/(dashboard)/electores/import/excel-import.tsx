'use client'

import { useState, useRef } from 'react'
import { Upload, ArrowLeft, Check, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { previewImport, importElectores } from '@/lib/actions/import-electores'
import Link from 'next/link'

const PERSONA_FIELDS = [
  { key: 'nombre', label: 'Nombre (requerido)' },
  { key: 'cedula', label: 'Cedula' },
  { key: 'nro_socio', label: 'Nro Socio' },
  { key: 'telefono', label: 'Telefono' },
  { key: 'celular', label: 'Celular' },
  { key: 'email', label: 'Email' },
  { key: 'direccion', label: 'Direccion' },
  { key: 'fecha_nacimiento', label: 'Fecha Nacimiento' },
] as const

type Step = 'upload' | 'map' | 'preview' | 'done'

interface MappedRow {
  nombre: string
  cedula?: string
  nro_socio?: string
  telefono?: string
  celular?: string
  email?: string
  direccion?: string
  fecha_nacimiento?: string
}

export function ExcelImport() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [excelHeaders, setExcelHeaders] = useState<string[]>([])
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([])
  const [preview, setPreview] = useState<{
    newRows: number[]
    updateRows: number[]
    errorRows: { index: number; message: string }[]
  } | null>(null)
  const [result, setResult] = useState<{
    created: number
    updated: number
    errors: string[]
  } | null>(null)
  const [loading, setLoading] = useState(false)

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array', cellDates: true })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
        raw: false, // format dates as strings using sheet format
      })

      if (json.length === 0) {
        alert('El archivo esta vacio')
        return
      }

      const headers = Object.keys(json[0])
      setExcelHeaders(headers)
      setRawData(json)

      // Auto-map by similar names
      const autoMap: Record<string, string> = {}
      for (const field of PERSONA_FIELDS) {
        const match = headers.find(
          (h) => h.toLowerCase().replace(/[^a-z]/g, '') === field.key.toLowerCase().replace(/[^a-z]/g, '')
        )
        if (match) autoMap[field.key] = match
      }
      setMapping(autoMap)
      setStep('map')
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleMapConfirm() {
    if (!mapping.nombre) {
      alert('Debes mapear al menos el campo Nombre')
      return
    }

    const rows: MappedRow[] = rawData.map((row) => {
      const mapped: Record<string, string> = {}
      for (const field of PERSONA_FIELDS) {
        const excelCol = mapping[field.key]
        if (excelCol && row[excelCol]) {
          mapped[field.key] = String(row[excelCol]).trim()
        }
      }
      return mapped as unknown as MappedRow
    })

    setMappedRows(rows)
    setLoading(true)

    try {
      const prev = await previewImport(rows)
      setPreview(prev)
      setStep('preview')
    } catch {
      alert('Error al generar preview')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmImport() {
    setLoading(true)
    try {
      const res = await importElectores(mappedRows)
      setResult(res)
      setStep('done')
    } catch {
      alert('Error al importar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/electores">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver a Electores
        </Link>
      </Button>

      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Paso 1: Subir archivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Haz click para seleccionar un archivo .xlsx
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'map' && (
        <Card>
          <CardHeader>
            <CardTitle>Paso 2: Mapear columnas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {rawData.length} filas encontradas. Mapea las columnas del Excel a los campos del sistema.
            </p>

            <div className="grid gap-3">
              {PERSONA_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-4">
                  <span className="text-sm w-[180px]">{field.label}</span>
                  <Select
                    value={mapping[field.key] || 'skip'}
                    onValueChange={(v) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field.key]: v === 'skip' ? '' : v,
                      }))
                    }
                  >
                    <SelectTrigger className="w-[240px]">
                      <SelectValue placeholder="Omitir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">-- Omitir --</SelectItem>
                      {excelHeaders.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Atras
              </Button>
              <Button onClick={handleMapConfirm} disabled={loading}>
                {loading ? 'Procesando...' : 'Previsualizar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && preview && (
        <Card>
          <CardHeader>
            <CardTitle>Paso 3: Previsualizar importacion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="default">{preview.newRows.length} nuevos</Badge>
              <Badge variant="secondary">{preview.updateRows.length} actualizaciones</Badge>
              <Badge variant="destructive">{preview.errorRows.length} errores</Badge>
            </div>

            <div className="rounded-md border max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Cedula</TableHead>
                    <TableHead>Nro Socio</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedRows.slice(0, 100).map((row, i) => {
                    const isNew = preview.newRows.includes(i)
                    const isUpdate = preview.updateRows.includes(i)
                    const error = preview.errorRows.find((e) => e.index === i)

                    return (
                      <TableRow
                        key={i}
                        className={
                          error
                            ? 'bg-destructive/10'
                            : isUpdate
                            ? 'bg-yellow-50 dark:bg-yellow-950/20'
                            : isNew
                            ? 'bg-green-50 dark:bg-green-950/20'
                            : ''
                        }
                      >
                        <TableCell className="text-xs text-muted-foreground">
                          {i + 1}
                        </TableCell>
                        <TableCell>{row.nombre || '-'}</TableCell>
                        <TableCell>{row.cedula || '-'}</TableCell>
                        <TableCell>{row.nro_socio || '-'}</TableCell>
                        <TableCell>
                          {error ? (
                            <Badge variant="destructive">Error: {error.message}</Badge>
                          ) : isUpdate ? (
                            <Badge variant="secondary">Actualizar</Badge>
                          ) : (
                            <Badge variant="default">Nuevo</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {mappedRows.length > 100 && (
              <p className="text-sm text-muted-foreground">
                Mostrando 100 de {mappedRows.length} filas
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('map')}>
                Atras
              </Button>
              <Button onClick={handleConfirmImport} disabled={loading}>
                {loading ? 'Importando...' : `Confirmar importacion (${mappedRows.length} filas)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'done' && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Importacion completada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="default">{result.created} creados</Badge>
              <Badge variant="secondary">{result.updated} actualizados</Badge>
              {result.errors.length > 0 && (
                <Badge variant="destructive">{result.errors.length} errores</Badge>
              )}
            </div>

            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc pl-4 text-sm">
                    {result.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {result.errors.length > 10 && (
                      <li>... y {result.errors.length - 10} errores mas</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button asChild>
              <Link href="/electores">Ver Electores</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
