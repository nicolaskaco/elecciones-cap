'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { createPregunta, updatePregunta } from '@/lib/actions/flow-config'
import type { PreguntaFlow, PreguntaTipo } from '@/types/database'
import { X, Plus } from 'lucide-react'

const schema = z.object({
  texto: z.string().min(1, 'El texto es requerido'),
  tipo: z.enum(['text', 'select', 'boolean'] as const),
  orden_default: z.string().optional(),
  activa: z.boolean(),
  accion_enviar_lista: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface PreguntaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pregunta?: PreguntaFlow | null
}

export function PreguntaFormDialog({ open, onOpenChange, pregunta }: PreguntaFormDialogProps) {
  const [opciones, setOpciones] = useState<string[]>([])
  const [newOpcion, setNewOpcion] = useState('')
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      texto: '',
      tipo: 'boolean',
      orden_default: '',
      activa: true,
      accion_enviar_lista: false,
    },
  })

  const tipoWatched = form.watch('tipo')
  const accionWatched = form.watch('accion_enviar_lista')

  useEffect(() => {
    if (open) {
      if (pregunta) {
        form.reset({
          texto: pregunta.texto,
          tipo: pregunta.tipo as PreguntaTipo,
          orden_default: pregunta.orden_default?.toString() ?? '',
          activa: pregunta.activa,
          accion_enviar_lista: pregunta.accion === 'enviar_lista',
        })
        setOpciones(pregunta.opciones ?? [])
      } else {
        form.reset({ texto: '', tipo: 'boolean', orden_default: '', activa: true, accion_enviar_lista: false })
        setOpciones([])
      }
      setNewOpcion('')
    }
  }, [open, pregunta, form])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const payload = {
        texto: values.texto,
        tipo: values.tipo,
        orden_default: values.orden_default ? parseInt(values.orden_default) : null,
        activa: values.activa,
        opciones: values.tipo === 'select' ? opciones : null,
        accion: values.accion_enviar_lista ? 'enviar_lista' : null,
      }

      if (pregunta) {
        await updatePregunta(pregunta.id, payload)
        toast.success('Pregunta actualizada')
      } else {
        await createPregunta(payload)
        toast.success('Pregunta creada')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  function addOpcion() {
    if (newOpcion.trim()) {
      setOpciones((prev) => [...prev, newOpcion.trim()])
      setNewOpcion('')
    }
  }

  function removeOpcion(idx: number) {
    setOpciones((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{pregunta ? 'Editar pregunta' : 'Nueva pregunta'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="texto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="¿Te gustaría votar por...?" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="boolean">Sí / No</SelectItem>
                      <SelectItem value="select">Selección</SelectItem>
                      <SelectItem value="text">Texto libre</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {tipoWatched === 'select' && (
              <div className="space-y-2">
                <Label>Opciones</Label>
                <div className="space-y-1">
                  {opciones.map((op, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="flex-1 text-sm border rounded px-2 py-1 bg-muted">{op}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeOpcion(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newOpcion}
                    onChange={(e) => setNewOpcion(e.target.value)}
                    placeholder="Nueva opción..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addOpcion()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addOpcion}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <FormField
              control={form.control}
              name="orden_default"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orden (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="1, 2, 3..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="activa"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">Activa</FormLabel>
                </FormItem>
              )}
            />
            {tipoWatched === 'boolean' && (
              <FormField
                control={form.control}
                name="accion_enviar_lista"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0 rounded-md border p-3 bg-muted/30">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-0.5">
                      <FormLabel className="font-normal cursor-pointer">
                        Acción: Enviar lista
                      </FormLabel>
                      {accionWatched && (
                        <p className="text-xs text-muted-foreground">
                          Al responder Sí, se mostrará la dirección del elector para confirmar o corregir.
                        </p>
                      )}
                    </div>
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
