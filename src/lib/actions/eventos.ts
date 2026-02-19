'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { Evento } from '@/types/database'

export async function getEventos(): Promise<Evento[]> {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('eventos')
    .select('*')
    .order('fecha', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as Evento[]
}

export async function createEvento(data: {
  nombre: string
  descripcion?: string | null
  fecha: string
  direccion?: string | null
}): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('eventos').insert({
    nombre: data.nombre,
    descripcion: data.descripcion || null,
    fecha: data.fecha,
    direccion: data.direccion || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/eventos')
}

export async function updateEvento(
  id: number,
  data: {
    nombre: string
    descripcion?: string | null
    fecha: string
    direccion?: string | null
  }
): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('eventos')
    .update({
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      fecha: data.fecha,
      direccion: data.direccion || null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/eventos')
}

export async function deleteEvento(id: number): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('eventos').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/eventos')
}
