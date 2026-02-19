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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createRolLista, updateRolLista } from '@/lib/actions/lista'
import { ROL_LABELS } from '@/lib/constants/lista'
import type { RolListaConPersona, RolListaTipo } from '@/types/database'

const ROL_TIPOS = Object.keys(ROL_LABELS) as RolListaTipo[]

const schema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  cedula: z.string().optional(),
  nro_socio: z.string().optional(),
  celular: z.string().optional(),
  tipo: z.enum(['Dirigente', 'Comision_Electoral', 'Comision_Fiscal', 'Asamblea_Representativa'] as const),
  posicion: z.string().optional(),
  quien_lo_trajo: z.string().optional(),
  comentario: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface RolFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rol?: RolListaConPersona | null
}

export function RolFormDialog({ open, onOpenChange, rol }: RolFormDialogProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: '', cedula: '', nro_socio: '', celular: '',
      tipo: 'Dirigente', posicion: '', quien_lo_trajo: '', comentario: '',
    },
  })

  const tipoWatched = form.watch('tipo')

  useEffect(() => {
    if (open) {
      if (rol) {
        form.reset({
          nombre: rol.personas.nombre,
          cedula: rol.personas.cedula ?? '',
          nro_socio: rol.personas.nro_socio ?? '',
          celular: rol.personas.celular ?? '',
          tipo: rol.tipo,
          posicion: rol.posicion ?? '',
          quien_lo_trajo: rol.quien_lo_trajo ?? '',
          comentario: rol.comentario ?? '',
        })
      } else {
        form.reset({
          nombre: '', cedula: '', nro_socio: '', celular: '',
          tipo: 'Dirigente', posicion: '', quien_lo_trajo: '', comentario: '',
        })
      }
    }
  }, [open, rol, form])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      if (rol) {
        await updateRolLista(rol.id, {
          tipo: values.tipo,
          posicion: values.posicion || null,
          quien_lo_trajo: values.quien_lo_trajo || null,
          comentario: values.comentario || null,
        })
        toast.success('Integrante actualizado')
      } else {
        await createRolLista(
          { nombre: values.nombre, cedula: values.cedula || null, nro_socio: values.nro_socio || null, celular: values.celular || null },
          { tipo: values.tipo, posicion: values.posicion || null, quien_lo_trajo: values.quien_lo_trajo || null, comentario: values.comentario || null }
        )
        toast.success('Integrante agregado')
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
          <DialogTitle>{rol ? 'Editar integrante' : 'Nuevo integrante'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0">
            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
            {!rol && (
              <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Persona</p>
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
              </div>
            )}

            <div className="space-y-3 rounded-md border p-3 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rol en la lista</p>
              <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ROL_TIPOS.map(t => (
                        <SelectItem key={t} value={t}>{ROL_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="posicion" render={({ field }) => (
                <FormItem>
                  <FormLabel>Posición</FormLabel>
                  <FormControl><Input {...field} placeholder="1, 2, 1er Suplente..." /></FormControl>
                </FormItem>
              )} />
              {tipoWatched === 'Asamblea_Representativa' && (
                <FormField control={form.control} name="quien_lo_trajo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quién lo trajo</FormLabel>
                    <FormControl><Input {...field} placeholder="Nombre del referente" /></FormControl>
                  </FormItem>
                )} />
              )}
              <FormField control={form.control} name="comentario" render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentario</FormLabel>
                  <FormControl><Input {...field} placeholder="Opcional..." /></FormControl>
                </FormItem>
              )} />
            </div>

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
