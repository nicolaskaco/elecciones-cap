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
import { createGasto, updateGasto } from '@/lib/actions/gastos'
import { RUBRO_LABELS } from '@/lib/constants/gastos'
import type { Gasto, GastoRubro } from '@/types/database'

const RUBROS = Object.keys(RUBRO_LABELS) as GastoRubro[]

const schema = z.object({
  rubro: z.enum([
    'Publicidad_Radio', 'TV', 'Redes', 'Comida', 'Evento',
    'Sonido', 'Community_Manager', 'Disenador_Grafico',
  ] as const),
  monto: z.string().min(1, 'Monto requerido').refine(
    v => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
    'Debe ser un número mayor a 0'
  ),
  fecha: z.string().min(1, 'Fecha requerida'),
  concepto: z.string().optional(),
  programa_campana: z.string().optional(),
  quien_pago: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface GastoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gasto?: Gasto | null
}

export function GastoFormDialog({ open, onOpenChange, gasto }: GastoFormDialogProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      rubro: 'Evento', monto: '', fecha: '',
      concepto: '', programa_campana: '', quien_pago: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (gasto) {
        form.reset({
          rubro: gasto.rubro,
          monto: String(gasto.monto),
          fecha: gasto.fecha,
          concepto: gasto.concepto ?? '',
          programa_campana: gasto.programa_campana ?? '',
          quien_pago: gasto.quien_pago ?? '',
        })
      } else {
        form.reset({
          rubro: 'Evento', monto: '',
          fecha: new Date().toISOString().split('T')[0],
          concepto: '', programa_campana: '', quien_pago: '',
        })
      }
    }
  }, [open, gasto, form])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const payload = {
        rubro: values.rubro,
        monto: parseFloat(values.monto),
        fecha: values.fecha,
        concepto: values.concepto || null,
        programa_campana: values.programa_campana || null,
        quien_pago: values.quien_pago || null,
      }
      if (gasto) {
        await updateGasto(gasto.id, payload)
        toast.success('Gasto actualizado')
      } else {
        await createGasto(payload)
        toast.success('Gasto registrado')
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
          <DialogTitle>{gasto ? 'Editar gasto' : 'Nuevo gasto'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="rubro" render={({ field }) => (
              <FormItem>
                <FormLabel>Rubro *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {RUBROS.map(r => (
                      <SelectItem key={r} value={r}>{RUBRO_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="monto" render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto *</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="0" step="0.01" placeholder="0.00" />
                  </FormControl>
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
            </div>
            <FormField control={form.control} name="concepto" render={({ field }) => (
              <FormItem>
                <FormLabel>Concepto</FormLabel>
                <FormControl><Input {...field} placeholder="Descripción del gasto..." /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="programa_campana" render={({ field }) => (
              <FormItem>
                <FormLabel>Programa / Campaña</FormLabel>
                <FormControl><Input {...field} placeholder="Ej: Campaña redes Mayo" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="quien_pago" render={({ field }) => (
              <FormItem>
                <FormLabel>Quién pagó</FormLabel>
                <FormControl><Input {...field} placeholder="Nombre del responsable" /></FormControl>
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
