'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createRegla, deleteRegla } from '@/lib/actions/flow-config'
import type { PreguntaConReglas } from '@/types/database'
import { Trash2 } from 'lucide-react'

interface ReglasEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pregunta: PreguntaConReglas | null
  allPreguntas: PreguntaConReglas[]
}

export function ReglasEditor({ open, onOpenChange, pregunta, allPreguntas }: ReglasEditorProps) {
  const [respuestaValor, setRespuestaValor] = useState('')
  const [destinoId, setDestinoId] = useState<string>('null')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  if (!pregunta) return null

  const otrasPreguntas = allPreguntas.filter((p) => p.id !== pregunta.id)

  async function handleAdd() {
    if (!pregunta) return
    setLoading(true)
    try {
      await createRegla({
        pregunta_origen_id: pregunta.id,
        respuesta_valor: respuestaValor || null,
        pregunta_destino_id: destinoId === 'null' ? null : parseInt(destinoId),
      })
      toast.success('Regla creada')
      setRespuestaValor('')
      setDestinoId('null')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear regla')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await deleteRegla(id)
      toast.success('Regla eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  function getDestinoNombre(id: number | null) {
    if (id === null) return 'Terminar flow'
    return allPreguntas.find((p) => p.id === id)?.texto ?? `Pregunta ${id}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base leading-tight">
            Reglas: <span className="font-normal">{pregunta.texto}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing rules */}
          <div className="space-y-1">
            {pregunta.reglas_flow.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin reglas configuradas.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-1 font-medium">Respuesta</th>
                    <th className="pb-1 font-medium">Ir a</th>
                    <th className="pb-1" />
                  </tr>
                </thead>
                <tbody>
                  {pregunta.reglas_flow.map((regla) => (
                    <tr key={regla.id} className="border-b last:border-0">
                      <td className="py-1.5 pr-2">
                        {regla.respuesta_valor ?? <span className="text-muted-foreground italic">cualquiera</span>}
                      </td>
                      <td className="py-1.5 pr-2">{getDestinoNombre(regla.pregunta_destino_id)}</td>
                      <td className="py-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDelete(regla.id)}
                          disabled={deletingId === regla.id}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Add rule form */}
          <div className="border rounded-md p-3 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">Agregar regla</p>

            {pregunta.tipo === 'boolean' ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cuando respuesta es</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={respuestaValor === 'Si' ? 'default' : 'outline'}
                    onClick={() => setRespuestaValor('Si')}
                  >
                    Sí
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={respuestaValor === 'No' ? 'default' : 'outline'}
                    onClick={() => setRespuestaValor('No')}
                  >
                    No
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cuando respuesta es</Label>
                <Input
                  value={respuestaValor}
                  onChange={(e) => setRespuestaValor(e.target.value)}
                  placeholder="Valor de respuesta (vacío = cualquiera)"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Ir a pregunta</Label>
              <Select value={destinoId} onValueChange={setDestinoId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Terminar flow</SelectItem>
                  {otrasPreguntas.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.texto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button size="sm" onClick={handleAdd} disabled={loading}>
              {loading ? 'Agregando...' : 'Agregar regla'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
