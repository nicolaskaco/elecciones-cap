'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ComisionConPersona, ComisionTipo, Persona } from '@/types/database'

export async function getComisionesInteres(comision?: ComisionTipo): Promise<ComisionConPersona[]> {
  await requireAdmin()
  const supabase = await createClient()

  let query = supabase
    .from('comisiones_interes')
    .select('*, personas(*)')
    .order('comision')

  if (comision) query = query.eq('comision', comision)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as ComisionConPersona[]
}

export async function getPersonasParaComisiones(): Promise<Persona[]> {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .order('nombre')

  if (error) throw new Error(error.message)
  return (data ?? []) as Persona[]
}

export async function createComisionInteres(
  persona_id: number,
  comision: ComisionTipo
): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('comisiones_interes').insert({ persona_id, comision })
  if (error) throw new Error(error.message)
  revalidatePath('/comisiones')
}

export async function deleteComisionInteres(id: number): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('comisiones_interes').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/comisiones')
}
