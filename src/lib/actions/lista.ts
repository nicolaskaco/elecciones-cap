'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { RolListaConPersona, RolListaTipo } from '@/types/database'

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

export async function createRolLista(
  persona: {
    nombre: string
    cedula?: string | null
    nro_socio?: string | null
    celular?: string | null
  },
  rol: {
    tipo: RolListaTipo
    posicion?: string | null
    quien_lo_trajo?: string | null
    comentario?: string | null
  }
): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { data: personaData, error: personaError } = await supabase
    .from('personas')
    .insert({
      nombre: persona.nombre,
      cedula: persona.cedula || null,
      nro_socio: persona.nro_socio || null,
      celular: persona.celular || null,
    })
    .select('id')
    .single()

  if (personaError) throw new Error(personaError.message)

  const { error: rolError } = await supabase.from('roles_lista').insert({
    persona_id: personaData.id,
    tipo: rol.tipo,
    posicion: rol.posicion || null,
    quien_lo_trajo: rol.quien_lo_trajo || null,
    comentario: rol.comentario || null,
  })

  if (rolError) throw new Error(rolError.message)
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
