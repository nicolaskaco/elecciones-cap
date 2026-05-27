'use server'

import { createClient } from '@/lib/supabase/server'
import { getRequiredPerfil, requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { Elector, ElectorEstado } from '@/types/database'

export async function getElectores(opts?: {
  search?: string
  estado?: ElectorEstado | ''
  sinAsignar?: boolean
  asignadoA?: string
}): Promise<Elector[]> {
  const supabase = await createClient()
  const perfil = await getRequiredPerfil()

  let query = supabase
    .from('electores')
    .select('*')
    .order('created_at', { ascending: false })

  if (perfil.rol === 'Voluntario') {
    query = query.eq('asignado_a', perfil.id)
  }

  if (opts?.estado) {
    query = query.eq('estado', opts.estado)
  }

  if (opts?.sinAsignar) {
    query = query.is('asignado_a', null)
  }

  if (opts?.asignadoA) {
    query = query.eq('asignado_a', opts.asignadoA)
  }

  if (opts?.search) {
    query = query.or(
      `nombre.ilike.%${opts.search}%,nro_socio.ilike.%${opts.search}%`
    )
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as Elector[]
}

export async function getElectorById(id: number): Promise<Elector | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('electores')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as Elector
}

export async function createElector(data: {
  nombre: string
  cedula?: string | null
  nro_socio?: string | null
  telefono?: string | null
  celular?: string | null
  email?: string | null
  direccion?: string | null
  fecha_nacimiento?: string | null
  estado?: ElectorEstado
  notas?: string | null
  asignado_a?: string | null
}) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('electores')
    .insert({
      nombre: data.nombre,
      cedula: data.cedula || null,
      nro_socio: data.nro_socio || null,
      telefono: data.telefono || null,
      celular: data.celular || null,
      email: data.email || null,
      direccion: data.direccion || null,
      fecha_nacimiento: data.fecha_nacimiento || null,
      estado: data.estado ?? 'Pendiente',
      notas: data.notas || null,
      asignado_a: data.asignado_a || null,
    })

  if (error) throw new Error(error.message)

  revalidatePath('/electores')
}

export async function updateElector(
  electorId: number,
  data: {
    nombre: string
    cedula?: string | null
    nro_socio?: string | null
    telefono?: string | null
    celular?: string | null
    email?: string | null
    direccion?: string | null
    fecha_nacimiento?: string | null
    estado?: ElectorEstado
    notas?: string | null
    asignado_a?: string | null
  }
) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('electores')
    .update({
      nombre: data.nombre,
      cedula: data.cedula || null,
      nro_socio: data.nro_socio || null,
      telefono: data.telefono || null,
      celular: data.celular || null,
      email: data.email || null,
      direccion: data.direccion || null,
      fecha_nacimiento: data.fecha_nacimiento || null,
      estado: data.estado ?? 'Pendiente',
      notas: data.notas || null,
      asignado_a: data.asignado_a || null,
    })
    .eq('id', electorId)

  if (error) throw new Error(error.message)

  revalidatePath('/electores')
  revalidatePath(`/electores/${electorId}`)
}

export async function deleteElector(electorId: number) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('electores')
    .delete()
    .eq('id', electorId)

  if (error) throw new Error(error.message)

  revalidatePath('/electores')
}

export async function getVoluntarios() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('perfiles')
    .select('id, nombre')
    .eq('rol', 'Voluntario')
    .order('nombre')
  return data ?? []
}

export async function asignarElectoresEnMasa(
  ids: number[],
  voluntarioId: string | null
): Promise<void> {
  await requireAdmin()
  if (ids.length === 0) return
  const supabase = await createClient()
  const { error } = await supabase
    .from('electores')
    .update({ asignado_a: voluntarioId })
    .in('id', ids)
  if (error) throw new Error(error.message)
  revalidatePath('/electores')
}

export async function cambiarEstadoEnMasa(
  ids: number[],
  estado: ElectorEstado
): Promise<void> {
  await requireAdmin()
  if (ids.length === 0) return
  const supabase = await createClient()
  const { error } = await supabase
    .from('electores')
    .update({ estado })
    .in('id', ids)
  if (error) throw new Error(error.message)
  revalidatePath('/electores')
}

export async function updateNotas(electorId: number, notas: string | null): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('electores')
    .update({ notas: notas || null })
    .eq('id', electorId)
  if (error) throw new Error(error.message)
  revalidatePath(`/electores/${electorId}`)
}

export async function marcarCartasEnviadas(ids: number[]): Promise<void> {
  await requireAdmin()
  if (ids.length === 0) return
  const supabase = await createClient()
  const { error } = await supabase
    .from('electores')
    .update({ estado: 'Lista_Enviada' })
    .in('id', ids)
  if (error) throw new Error(error.message)
  revalidatePath('/cartas')
  revalidatePath('/electores')
}
