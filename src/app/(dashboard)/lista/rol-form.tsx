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
import type { Persona, RolListaConPersona, RolListaTipo } from '@/types/database'

const ROL_TIPOS = Object.keys(ROL_LABELS) as RolListaTipo[]
const SUFIJOS = ['Titular', '1er Suplente', '2do Suplente'] as const

/** Tipos that use the structured number × suffix picker, and their number range */
const STRUCTURED_NUMEROS: Partial<Record<RolListaTipo, string[]>> = {
  Dirigente: Array.from({ length: 11 }, (_, i) => String(i + 1)),
  Comision_Electoral: Array.from({ length: 3 }, (_, i) => String(i + 1)),
  Comision_Fiscal: Array.from({ length: 3 }, (_, i) => String(i + 1)),
}

function isStructured(tipo: RolListaTipo): boolean {
  return tipo in STRUCTURED_NUMEROS
}

/** Parses "3 1er Suplente" → { numero: "3", sufijo: "1er Suplente" } */
function parsePosicion(posicion: string | null): { numero: string; sufijo: string } {
  if (!posicion) return { numero: '', sufijo: '' }
  const spaceIdx = posicion.indexOf(' ')
  if (spaceIdx === -1) return { numero: posicion, sufijo: '' }
  return { numero: posicion.substring(0, spaceIdx), sufijo: posicion.substring(spaceIdx + 1) }
}

const schema = z.object({
  persona_id: z.string().min(1, 'Seleccioná una persona'),
  tipo: z.enum(['Dirigente', 'Comision_Electoral', 'Comision_Fiscal', 'Asamblea_Representativa'] as const),
  posicion_numero: z.string().optional(),
  posicion_sufijo: z.string().optional(),
  posicion: z.string().optional(),
  quien_lo_trajo: z.string().optional(),
  comentario: z.string().optional(),
}).superRefine((data, ctx) => {
  if (isStructured(data.tipo)) {
    if (!data.posicion_numero) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Seleccioná un número', path: ['posicion_numero'] })
    }
    if (!data.posicion_sufijo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Seleccioná una categoría', path: ['posicion_sufijo'] })
    }
  }
})

type FormValues = z.infer<typeof schema>

interface RolFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rol?: RolListaConPersona | null
  personas: Persona[]
  existingRoles: RolListaConPersona[]
}

export function RolFormDialog({ open, onOpenChange, rol, personas, existingRoles }: RolFormDialogProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      persona_id: '', tipo: 'Dirigente',
      posicion_numero: '', posicion_sufijo: '',
      posicion: '', quien_lo_trajo: '', comentario: '',
    },
  })

  const tipoWatched = form.watch('tipo')
  const numeroWatched = form.watch('posicion_numero')

  // Positions taken by other records of the same tipo (excluding the one being edited)
  const takenPositions = new Set(
    existingRoles
      .filter(r => r.tipo === tipoWatched && r.posicion && r.id !== rol?.id)
      .map(r => r.posicion!)
  )

  function isTaken(numero: string, sufijo: string) {
    return takenPositions.has(`${numero} ${sufijo}`)
  }

  useEffect(() => {
    if (open) {
      if (rol) {
        const { numero, sufijo } = parsePosicion(rol.posicion)
        form.reset({
          persona_id: rol.persona_id.toString(),
          tipo: rol.tipo,
          posicion_numero: numero,
          posicion_sufijo: sufijo,
          posicion: rol.posicion ?? '',
          quien_lo_trajo: rol.quien_lo_trajo ?? '',
          comentario: rol.comentario ?? '',
        })
      } else {
        form.reset({
          persona_id: '', tipo: 'Dirigente',
          posicion_numero: '', posicion_sufijo: '',
          posicion: '', quien_lo_trajo: '', comentario: '',
        })
      }
    }
  }, [open, rol, form])

  // Clear sufijo when número changes if the current sufijo is now taken
  useEffect(() => {
    if (isStructured(tipoWatched)) {
      const sufijo = form.getValues('posicion_sufijo')
      if (sufijo && isTaken(numeroWatched ?? '', sufijo)) {
        form.setValue('posicion_sufijo', '')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeroWatched, tipoWatched])

  async function onSubmit(values: FormValues) {
    const posicion = isStructured(values.tipo)
      ? `${values.posicion_numero} ${values.posicion_sufijo}`
      : values.posicion || null

    setLoading(true)
    try {
      if (rol) {
        await updateRolLista(rol.id, {
          tipo: values.tipo,
          posicion,
          quien_lo_trajo: values.quien_lo_trajo || null,
          comentario: values.comentario || null,
        })
        toast.success('Integrante actualizado')
      } else {
        await createRolLista(parseInt(values.persona_id), {
          tipo: values.tipo,
          posicion,
          quien_lo_trajo: values.quien_lo_trajo || null,
          comentario: values.comentario || null,
        })
        toast.success('Integrante agregado')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const numeros = STRUCTURED_NUMEROS[tipoWatched]
  const maxLabel = tipoWatched === 'Dirigente' ? '1 – 11' : '1 – 3'

  // For Asamblea_Representativa, show taken positions as a hint
  const asambleaTaken = tipoWatched === 'Asamblea_Representativa'
    ? Array.from(takenPositions).sort()
    : []

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
                <FormField control={form.control} name="persona_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Persona *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar persona..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {personas.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.nombre}{p.cedula ? ` — ${p.cedula}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {rol && (
                <div className="rounded-md border px-3 py-2 bg-muted/30 text-sm">
                  <span className="text-muted-foreground text-xs uppercase tracking-wide font-medium">Persona</span>
                  <p className="font-medium mt-0.5">{rol.personas.nombre}</p>
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

                {numeros ? (
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="posicion_numero" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder={maxLabel} /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {numeros.map(n => (
                              <SelectItem key={n} value={n}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="posicion_sufijo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!numeroWatched}
                        >
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SUFIJOS.map(s => {
                              const taken = isTaken(numeroWatched ?? '', s)
                              return (
                                <SelectItem key={s} value={s} disabled={taken}>
                                  {s}{taken ? ' (ocupado)' : ''}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                ) : (
                  <FormField control={form.control} name="posicion" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Posición</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="1, 2, 3..." />
                      </FormControl>
                      {asambleaTaken.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Ocupadas: {asambleaTaken.join(', ')}
                        </p>
                      )}
                    </FormItem>
                  )} />
                )}

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
