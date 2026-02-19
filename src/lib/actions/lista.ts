'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { Persona, PersonaConRoles, RolListaConPersona, RolListaTipo } from '@/types/database'

export async function getRolesLista(tipo?: RolListaTipo): Promise<RolListaConPersona[]> {
  await requireAdmin()
  const supabase = await createClient()

  let query = supabase
    .from('roles_lista')
    .select('*, personas(*)')
    .order('tipo')
    .order('posicion')

  if (tipo) query = query.eq('tipo', tipo)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as RolListaConPersona[]
}

export async function createPersona(data: {
  nombre: string
  cedula?: string | null
  nro_socio?: string | null
  celular?: string | null
  direccion?: string | null
  fecha_nacimiento?: string | null
  email?: string | null
}): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('personas').insert({
    nombre: data.nombre,
    cedula: data.cedula || null,
    nro_socio: data.nro_socio || null,
    celular: data.celular || null,
    direccion: data.direccion || null,
    fecha_nacimiento: data.fecha_nacimiento || null,
    email: data.email || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/personas-lista')
}

export async function getPersonasAll(): Promise<Persona[]> {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .order('nombre')

  if (error) throw new Error(error.message)
  return (data ?? []) as Persona[]
}

async function checkDirigentePosicion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  posicion: string,
  excludeId?: number
): Promise<void> {
  let query = supabase
    .from('roles_lista')
    .select('id')
    .eq('tipo', 'Dirigente')
    .eq('posicion', posicion)

  if (excludeId !== undefined) query = query.neq('id', excludeId)

  const { data } = await query
  if (data && data.length > 0) {
    throw new Error(`La posición "${posicion}" ya está ocupada por otro Dirigente.`)
  }
}

export async function createRolLista(
  persona_id: number,
  rol: {
    tipo: RolListaTipo
    posicion?: string | null
    quien_lo_trajo?: string | null
    comentario?: string | null
  }
): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  if (rol.tipo === 'Dirigente' && rol.posicion) {
    await checkDirigentePosicion(supabase, rol.posicion)
  }

  const { error } = await supabase.from('roles_lista').insert({
    persona_id,
    tipo: rol.tipo,
    posicion: rol.posicion || null,
    quien_lo_trajo: rol.quien_lo_trajo || null,
    comentario: rol.comentario || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/lista')
}

export async function updateRolLista(
  rolId: number,
  data: {
    tipo: RolListaTipo
    posicion?: string | null
    quien_lo_trajo?: string | null
    comentario?: string | null
  }
): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  if (data.tipo === 'Dirigente' && data.posicion) {
    await checkDirigentePosicion(supabase, data.posicion, rolId)
  }

  const { error } = await supabase
    .from('roles_lista')
    .update({
      tipo: data.tipo,
      posicion: data.posicion || null,
      quien_lo_trajo: data.quien_lo_trajo || null,
      comentario: data.comentario || null,
    })
    .eq('id', rolId)

  if (error) throw new Error(error.message)
  revalidatePath('/lista')
}

export async function deleteRolLista(rolId: number): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('roles_lista').delete().eq('id', rolId)
  if (error) throw new Error(error.message)
  revalidatePath('/lista')
}

export async function getPersonasLista(): Promise<PersonaConRoles[]> {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('personas')
    .select('*, roles_lista(*)')
    .not('roles_lista', 'is', null)
    .order('nombre')

  if (error) throw new Error(error.message)
  // Filter out personas with no roles_lista entries
  return ((data ?? []) as PersonaConRoles[]).filter(p => p.roles_lista.length > 0)
}

export async function updatePersona(
  personaId: number,
  data: {
    nombre: string
    cedula?: string | null
    nro_socio?: string | null
    celular?: string | null
    direccion?: string | null
    fecha_nacimiento?: string | null
    email?: string | null
  }
): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('personas')
    .update({
      nombre: data.nombre,
      cedula: data.cedula || null,
      nro_socio: data.nro_socio || null,
      celular: data.celular || null,
      direccion: data.direccion || null,
      fecha_nacimiento: data.fecha_nacimiento || null,
      email: data.email || null,
    })
    .eq('id', personaId)

  if (error) throw new Error(error.message)
  revalidatePath('/personas-lista')
  revalidatePath('/lista')
}
