'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createComisionInteres } from '@/lib/actions/comisiones'
import { COMISION_LABELS } from '@/lib/constants/comisiones'
import type { ComisionTipo, Persona } from '@/types/database'

const COMISION_TIPOS = Object.keys(COMISION_LABELS) as ComisionTipo[]

interface ComisionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  personas: Persona[]
}

export function ComisionFormDialog({ open, onOpenChange, personas }: ComisionFormDialogProps) {
  const [personaId, setPersonaId] = useState<string>('')
  const [comision, setComision] = useState<ComisionTipo | ''>('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!personaId || !comision) return
    setLoading(true)
    try {
      await createComisionInteres(parseInt(personaId), comision)
      toast.success('Interés registrado')
      setPersonaId('')
      setComision('')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar interés en comisión</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Persona</Label>
            <Select value={personaId} onValueChange={setPersonaId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar persona..." />
              </SelectTrigger>
              <SelectContent>
                {personas.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Comisión</Label>
            <Select value={comision} onValueChange={(v) => setComision(v as ComisionTipo)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar comisión..." />
              </SelectTrigger>
              <SelectContent>
                {COMISION_TIPOS.map(c => (
                  <SelectItem key={c} value={c}>{COMISION_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!personaId || !comision || loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
