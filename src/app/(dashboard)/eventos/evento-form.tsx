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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createEvento, updateEvento, setPersonasParaEvento } from '@/lib/actions/eventos'
import type { EventoConPersonas, Persona } from '@/types/database'
import { Search, X } from 'lucide-react'

const schema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  descripcion: z.string().optional(),
  fecha: z.string().min(1, 'Fecha requerida'),
  hora: z.string().optional(),
  direccion: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface EventoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  evento?: EventoConPersonas | null
  personasTodas: Persona[]
}

function buildDefaults(evento?: EventoConPersonas | null): FormValues {
  if (evento) return {
    nombre: evento.nombre,
    descripcion: evento.descripcion ?? '',
    fecha: evento.fecha,
    hora: evento.hora ? evento.hora.slice(0, 5) : '',
    direccion: evento.direccion ?? '',
  }
  return {
    nombre: '',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    hora: '',
    direccion: '',
  }
}

export function EventoFormDialog({ open, onOpenChange, evento, personasTodas }: EventoFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>(
    () => evento?.evento_personas.map(ep => ep.persona_id) ?? []
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(evento),
  })

  function togglePersona(id: number) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const filtered = search.trim()
    ? personasTodas.filter(p =>
        p.nombre.toLowerCase().includes(search.toLowerCase())
      )
    : personasTodas

  const selectedPersonas = personasTodas.filter(p => selectedIds.includes(p.id))

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const payload = {
        nombre: values.nombre,
        descripcion: values.descripcion || null,
        fecha: values.fecha,
        hora: values.hora || null,
        direccion: values.direccion || null,
      }
      let eventoId: number
      if (evento) {
        await updateEvento(evento.id, payload)
        eventoId = evento.id
        toast.success('Evento actualizado')
      } else {
        const result = await createEvento(payload)
        eventoId = result.id
        toast.success('Evento creado')
      }
      await setPersonasParaEvento(eventoId, selectedIds)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{evento ? 'Editar evento' : 'Nuevo evento'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0">
            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              <FormField control={form.control} name="nombre" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl><Input {...field} placeholder="Nombre del evento" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="fecha" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha *</FormLabel>
                    <FormControl><Input {...field} type="date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="hora" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora</FormLabel>
                    <FormControl><Input {...field} type="time" /></FormControl>
                  </FormItem>
                )} />
              </div>
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

              {/* Personas section */}
              <div className="space-y-2">
                <p className="text-sm font-medium leading-none">Personas</p>
                {selectedPersonas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {selectedPersonas.map(p => (
                      <Badge key={p.id} variant="secondary" className="gap-1 pr-1">
                        {p.nombre}
                        <button
                          type="button"
                          onClick={() => togglePersona(p.id)}
                          className="ml-0.5 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar personas..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <div className="border rounded-md max-h-36 overflow-y-auto divide-y">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">Sin resultados</p>
                  ) : (
                    filtered.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePersona(p.id)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                          selectedIds.includes(p.id) ? 'bg-muted font-medium' : ''
                        }`}
                      >
                        {p.nombre}
                        {selectedIds.includes(p.id) && (
                          <span className="ml-2 text-xs text-muted-foreground">✓</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
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
