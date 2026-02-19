'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ElectorConPersona } from '@/types/database'
import { ELECTOR_ESTADOS } from '@/lib/validations/elector'
import { createElector, updateElector } from '@/lib/actions/electores'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  elector: ElectorConPersona | null
  voluntarios: { id: string; nombre: string }[]
}

interface FormValues {
  nombre: string
  cedula: string
  nro_socio: string
  telefono: string
  celular: string
  email: string
  direccion: string
  fecha_nacimiento: string
  estado: string
  notas: string
  asignado_a: string
}

export function ElectorFormDialog({ open, onOpenChange, elector, voluntarios }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const isEditing = elector !== null

  const { register, handleSubmit, setValue, watch, reset } = useForm<FormValues>({
    values: elector
      ? {
          nombre: elector.personas.nombre,
          cedula: elector.personas.cedula ?? '',
          nro_socio: elector.personas.nro_socio ?? '',
          telefono: elector.personas.telefono ?? '',
          celular: elector.personas.celular ?? '',
          email: elector.personas.email ?? '',
          direccion: elector.personas.direccion ?? '',
          fecha_nacimiento: elector.personas.fecha_nacimiento ?? '',
          estado: elector.estado,
          notas: elector.notas ?? '',
          asignado_a: elector.asignado_a ?? '',
        }
      : {
          nombre: '',
          cedula: '',
          nro_socio: '',
          telefono: '',
          celular: '',
          email: '',
          direccion: '',
          fecha_nacimiento: '',
          estado: 'Pendiente',
          notas: '',
          asignado_a: '',
        },
  })

  async function onSubmit(data: FormValues) {
    setSaving(true)
    try {
      const persona = {
        nombre: data.nombre,
        cedula: data.cedula || null,
        nro_socio: data.nro_socio || null,
        telefono: data.telefono || null,
        celular: data.celular || null,
        email: data.email || null,
        direccion: data.direccion || null,
        fecha_nacimiento: data.fecha_nacimiento || null,
      }
      const electorData = {
        estado: data.estado as typeof ELECTOR_ESTADOS[number],
        notas: data.notas || null,
        asignado_a: data.asignado_a || null,
      }

      if (isEditing && elector) {
        await updateElector(elector.id, elector.persona_id, persona, electorData)
      } else {
        await createElector(persona, electorData)
      }

      onOpenChange(false)
      reset()
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Elector' : 'Nuevo Elector'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3">
            <div>
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" {...register('nombre', { required: true })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cedula">Cedula</Label>
                <Input id="cedula" {...register('cedula')} />
              </div>
              <div>
                <Label htmlFor="nro_socio">Nro Socio</Label>
                <Input id="nro_socio" {...register('nro_socio')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="celular">Celular</Label>
                <Input id="celular" {...register('celular')} />
              </div>
              <div>
                <Label htmlFor="telefono">Telefono</Label>
                <Input id="telefono" {...register('telefono')} />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
            </div>

            <div>
              <Label htmlFor="direccion">Direccion</Label>
              <Input id="direccion" {...register('direccion')} />
            </div>

            <div>
              <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
              <Input id="fecha_nacimiento" type="date" {...register('fecha_nacimiento')} />
            </div>

            <div>
              <Label>Estado</Label>
              <Select
                value={watch('estado')}
                onValueChange={(v) => setValue('estado', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ELECTOR_ESTADOS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Asignado a</Label>
              <Select
                value={watch('asignado_a') || 'none'}
                onValueChange={(v) => setValue('asignado_a', v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {voluntarios.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notas">Notas</Label>
              <Textarea id="notas" {...register('notas')} rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
