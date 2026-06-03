'use client'

import { useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { createPersona, updatePersona } from '@/lib/actions/lista'
import { ROL_LABELS } from '@/lib/constants/lista'
import type { PersonaConRoles, RolListaTipo } from '@/types/database'

const ROL_OPTIONS = Object.entries(ROL_LABELS) as [RolListaTipo, string][]

const schema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  cedula: z.string().optional(),
  nro_socio: z.string().optional(),
  celular: z.string().optional(),
  direccion: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  quien_lo_trajo: z.string().optional(),
  comentario: z.string().optional(),
  roles: z.array(z.string()),
})

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = {
  nombre: '', cedula: '', nro_socio: '', celular: '',
  direccion: '', fecha_nacimiento: '', email: '',
  quien_lo_trajo: '', comentario: '', roles: [],
}

interface PersonaEditFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  persona: PersonaConRoles | null  // null = create mode
}

export function PersonaEditForm({ open, onOpenChange, persona }: PersonaEditFormProps) {
  const [loading, setLoading] = useState(false)
  const isEdit = persona !== null

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: isEdit ? {
      nombre: persona.nombre,
      cedula: persona.cedula ?? '',
      nro_socio: persona.nro_socio ?? '',
      celular: persona.celular ?? '',
      direccion: persona.direccion ?? '',
      fecha_nacimiento: persona.fecha_nacimiento ?? '',
      email: persona.email ?? '',
      quien_lo_trajo: persona.quien_lo_trajo ?? '',
      comentario: persona.comentario ?? '',
      roles: persona.roles_lista.map(r => r.tipo),
    } : EMPTY,
  })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const payload = {
        nombre: values.nombre,
        cedula: values.cedula || null,
        nro_socio: values.nro_socio || null,
        celular: values.celular || null,
        direccion: values.direccion || null,
        fecha_nacimiento: values.fecha_nacimiento || null,
        email: values.email || null,
        comentario: values.comentario || null,
        quien_lo_trajo: values.quien_lo_trajo || null,
        roles: (values.roles ?? []) as RolListaTipo[],
      }
      if (isEdit) {
        await updatePersona(persona.id, payload)
        toast.success('Persona actualizada')
      } else {
        await createPersona(payload)
        toast.success('Persona creada')
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
      <DialogContent className="max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar persona' : 'Nueva persona'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0">
            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
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
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="celular" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Celular</FormLabel>
                    <FormControl><Input {...field} placeholder="099 123 456" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="fecha_nacimiento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de nacimiento</FormLabel>
                    <FormControl><Input {...field} type="date" /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl><Input {...field} type="email" placeholder="nombre@email.com" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="direccion" render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl><Input {...field} placeholder="Calle 1234" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="quien_lo_trajo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quién lo trajo</FormLabel>
                  <FormControl><Input {...field} placeholder="Nombre de quien lo refirió" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="comentario" render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentario</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Notas adicionales..." className="resize-none" rows={3} />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="roles" render={() => (
                <FormItem>
                  <FormLabel>Roles</FormLabel>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {ROL_OPTIONS.map(([value, label]) => (
                      <FormField
                        key={value}
                        control={form.control}
                        name="roles"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(value)}
                                onCheckedChange={(checked) => {
                                  const current = field.value ?? []
                                  field.onChange(
                                    checked
                                      ? [...current, value]
                                      : current.filter(v => v !== value)
                                  )
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">{label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </FormItem>
              )} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
