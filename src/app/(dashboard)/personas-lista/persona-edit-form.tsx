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
import { Button } from '@/components/ui/button'
import { updatePersona } from '@/lib/actions/lista'
import type { PersonaConRoles } from '@/types/database'

const schema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  cedula: z.string().optional(),
  nro_socio: z.string().optional(),
  celular: z.string().optional(),
  direccion: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface PersonaEditFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  persona: PersonaConRoles | null
}

export function PersonaEditForm({ open, onOpenChange, persona }: PersonaEditFormProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', cedula: '', nro_socio: '', celular: '', direccion: '' },
  })

  useEffect(() => {
    if (open && persona) {
      form.reset({
        nombre: persona.nombre,
        cedula: persona.cedula ?? '',
        nro_socio: persona.nro_socio ?? '',
        celular: persona.celular ?? '',
        direccion: persona.direccion ?? '',
      })
    }
  }, [open, persona, form])

  async function onSubmit(values: FormValues) {
    if (!persona) return
    setLoading(true)
    try {
      await updatePersona(persona.id, {
        nombre: values.nombre,
        cedula: values.cedula || null,
        nro_socio: values.nro_socio || null,
        celular: values.celular || null,
        direccion: values.direccion || null,
      })
      toast.success('Persona actualizada')
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
          <DialogTitle>Editar persona</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="nombre" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre *</FormLabel>
                <FormControl><Input {...field} placeholder="Nombre completo" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="cedula" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cédula</FormLabel>
                  <FormControl><Input {...field} placeholder="1.234.567-8" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="nro_socio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nº Socio</FormLabel>
                  <FormControl><Input {...field} placeholder="123456" /></FormControl>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="celular" render={({ field }) => (
              <FormItem>
                <FormLabel>Celular</FormLabel>
                <FormControl><Input {...field} placeholder="099 123 456" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="direccion" render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl><Input {...field} placeholder="Calle 1234" /></FormControl>
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
