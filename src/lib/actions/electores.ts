'use server'

import { createClient } from '@/lib/supabase/server'
import { getRequiredPerfil, requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ElectorConPersona, ElectorEstado } from '@/types/database'

export async function getElectores(opts?: {
  search?: string
  estado?: ElectorEstado | ''
}): Promise<ElectorConPersona[]> {
  const supabase = await createClient()
  const perfil = await getRequiredPerfil()

  let query = supabase
    .from('electores')
    .select('*, personas!inner(*)')
    .order('created_at', { ascending: false })

  if (perfil.rol === 'Voluntario') {
    query = query.eq('asignado_a', perfil.id)
  }

  if (opts?.estado) {
    query = query.eq('estado', opts.estado)
  }

  if (opts?.search) {
    query = query.or(
      `nombre.ilike.%${opts.search}%,cedula.ilike.%${opts.search}%,nro_socio.ilike.%${opts.search}%,celular.ilike.%${opts.search}%`,
      { referencedTable: 'personas' }
    )
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as ElectorConPersona[]
}

export async function getElectorById(id: number): Promise<ElectorConPersona | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('electores')
    .select('*, personas!inner(*)')
    .eq('id', id)
    .single()

  if (error) return null
  return data as ElectorConPersona
}

export async function createElector(persona: {
  nombre: string
  cedula?: string | null
  nro_socio?: string | null
  telefono?: string | null
  celular?: string | null
  email?: string | null
  direccion?: string | null
  fecha_nacimiento?: string | null
}, elector: {
  estado?: ElectorEstado
  notas?: string | null
  asignado_a?: string | null
}) {
  await requireAdmin()
  const supabase = await createClient()

  const { data: personaData, error: personaError } = await supabase
    .from('personas')
    .insert({
      nombre: persona.nombre,
      cedula: persona.cedula || null,
      nro_socio: persona.nro_socio || null,
      telefono: persona.telefono || null,
      celular: persona.celular || null,
      email: persona.email || null,
      direccion: persona.direccion || null,
      fecha_nacimiento: persona.fecha_nacimiento || null,
    })
    .select('id')
    .single()

  if (personaError) throw new Error(personaError.message)

  const { error: electorError } = await supabase
    .from('electores')
    .insert({
      persona_id: personaData.id,
      estado: elector.estado ?? 'Pendiente',
      notas: elector.notas || null,
      asignado_a: elector.asignado_a || null,
    })

  if (electorError) throw new Error(electorError.message)

  revalidatePath('/electores')
}

export async function updateElector(
  electorId: number,
  personaId: number,
  persona: {
    nombre: string
    cedula?: string | null
    nro_socio?: string | null
    telefono?: string | null
    celular?: string | null
    email?: string | null
    direccion?: string | null
    fecha_nacimiento?: string | null
  },
  elector: {
    estado?: ElectorEstado
    notas?: string | null
    asignado_a?: string | null
  }
) {
  await requireAdmin()
  const supabase = await createClient()

  const { error: personaError } = await supabase
    .from('personas')
    .update({
      nombre: persona.nombre,
      cedula: persona.cedula || null,
      nro_socio: persona.nro_socio || null,
      telefono: persona.telefono || null,
      celular: persona.celular || null,
      email: persona.email || null,
      direccion: persona.direccion || null,
      fecha_nacimiento: persona.fecha_nacimiento || null,
    })
    .eq('id', personaId)

  if (personaError) throw new Error(personaError.message)

  const { error: electorError } = await supabase
    .from('electores')
    .update({
      estado: elector.estado ?? 'Pendiente',
      notas: elector.notas || null,
      asignado_a: elector.asignado_a || null,
    })
    .eq('id', electorId)

  if (electorError) throw new Error(electorError.message)

  revalidatePath('/electores')
  revalidatePath(`/electores/${electorId}`)
}

export async function deleteElector(electorId: number) {
  await requireAdmin()
  const supabase = await createClient()

  // Get persona_id before deleting elector
  const { data: elector } = await supabase
    .from('electores')
    .select('persona_id')
    .eq('id', electorId)
    .single()

  if (!elector) throw new Error('Elector no encontrado')

  // Delete elector (cascade will handle)
  const { error: electorError } = await supabase
    .from('electores')
    .delete()
    .eq('id', electorId)

  if (electorError) throw new Error(electorError.message)

  // Delete persona if not referenced by other electores
  const { count } = await supabase
    .from('electores')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', elector.persona_id)

  if (count === 0) {
    await supabase.from('personas').delete().eq('id', elector.persona_id)
  }

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
