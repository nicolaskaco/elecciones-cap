'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export interface ExportField<T> {
  key: string
  label: string
  defaultChecked: boolean
  getValue: (row: T) => string | number | null | undefined
}

interface ExportDialogProps<T> {
  data: T[]
  fields: ExportField<T>[]
  filename: string
  disabled?: boolean
}

export function ExportDialog<T>({ data, fields, filename, disabled }: ExportDialogProps<T>) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(fields.filter(f => f.defaultChecked).map(f => f.key))
  )

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleExport() {
    const activeFields = fields.filter(f => selected.has(f.key))
    const rows = data.map(row => {
      const obj: Record<string, string | number> = {}
      for (const f of activeFields) {
        obj[f.label] = f.getValue(row) ?? ''
      }
      return obj
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Datos')
    const now = new Date()
    const ts = now.getFullYear().toString()
      + '-' + String(now.getMonth() + 1).padStart(2, '0')
      + '-' + String(now.getDate()).padStart(2, '0')
      + '_' + String(now.getHours()).padStart(2, '0')
      + '-' + String(now.getMinutes()).padStart(2, '0')
    XLSX.writeFile(wb, `${filename}_${ts}.xlsx`)
    setOpen(false)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={disabled || data.length === 0}>
        <Download className="h-4 w-4 mr-2" />
        Exportar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Exportar a Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Selecciona los campos a incluir ({data.length} filas):
            </p>
            {fields.map(f => (
              <div key={f.key} className="flex items-center gap-2">
                <Checkbox
                  id={`export-${f.key}`}
                  checked={selected.has(f.key)}
                  onCheckedChange={() => toggle(f.key)}
                />
                <Label htmlFor={`export-${f.key}`} className="cursor-pointer font-normal">
                  {f.label}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleExport} disabled={selected.size === 0}>
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
