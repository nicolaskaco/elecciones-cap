'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createEvento, updateEvento } from '@/lib/actions/eventos'
import type { Evento } from '@/types/database'

const schema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  descripcion: z.string().optional(),
  fecha: z.string().min(1, 'Fecha requerida'),
  direccion: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface EventoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  evento?: Evento | null
}

export function EventoFormDialog({ open, onOpenChange, evento }: EventoFormDialogProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', descripcion: '', fecha: '', direccion: '' },
  })

  useEffect(() => {
    if (open) {
      if (evento) {
        form.reset({
          nombre: evento.nombre,
          descripcion: evento.descripcion ?? '',
          fecha: evento.fecha,
          direccion: evento.direccion ?? '',
        })
      } else {
        form.reset({
          nombre: '',
          descripcion: '',
          fecha: new Date().toISOString().split('T')[0],
          direccion: '',
        })
      }
    }
  }, [open, evento, form])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const payload = {
        nombre: values.nombre,
        descripcion: values.descripcion || null,
        fecha: values.fecha,
        direccion: values.direccion || null,
      }
      if (evento) {
        await updateEvento(evento.id, payload)
        toast.success('Evento actualizado')
      } else {
        await createEvento(payload)
        toast.success('Evento creado')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{evento ? 'Editar evento' : 'Nuevo evento'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="nombre" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre *</FormLabel>
                <FormControl><Input {...field} placeholder="Nombre del evento" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="fecha" render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha *</FormLabel>
                <FormControl><Input {...field} type="date" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="direccion" render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl><Input {...field} placeholder="Lugar del evento" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="descripcion" render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Detalles del evento..." className="resize-none" rows={3} />
                </FormControl>
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
