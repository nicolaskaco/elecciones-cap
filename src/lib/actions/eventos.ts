'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { Evento, EventoConPersonas } from '@/types/database'

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

export async function getEventosConPersonas(): Promise<EventoConPersonas[]> {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('eventos')
    .select('*, evento_personas(persona_id, personas(id, nombre))')
    .order('fecha', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as EventoConPersonas[]
}

export async function createEvento(data: {
  nombre: string
  descripcion?: string | null
  fecha: string
  hora?: string | null
  direccion?: string | null
}): Promise<{ id: number }> {
  await requireAdmin()
  const supabase = await createClient()

  const { data: inserted, error } = await supabase.from('eventos').insert({
    nombre: data.nombre,
    descripcion: data.descripcion || null,
    fecha: data.fecha,
    hora: data.hora || null,
    direccion: data.direccion || null,
  }).select('id').single()

  if (error) throw new Error(error.message)
  revalidatePath('/eventos')
  return { id: inserted.id }
}

export async function updateEvento(
  id: number,
  data: {
    nombre: string
    descripcion?: string | null
    fecha: string
    hora?: string | null
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
      hora: data.hora || null,
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

export async function setPersonasParaEvento(
  eventoId: number,
  personaIds: number[]
): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error: delError } = await supabase
    .from('evento_personas')
    .delete()
    .eq('evento_id', eventoId)
  if (delError) throw new Error(delError.message)

  if (personaIds.length > 0) {
    const { error: insError } = await supabase.from('evento_personas').insert(
      personaIds.map(persona_id => ({ evento_id: eventoId, persona_id }))
    )
    if (insError) throw new Error(insError.message)
  }

  revalidatePath('/eventos')
}
