'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { PreguntaConReglas, PreguntaTipo } from '@/types/database'

export async function getPreguntasConReglas(): Promise<PreguntaConReglas[]> {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('preguntas_flow')
    .select('*, reglas_flow!pregunta_origen_id(*)')
    .order('orden_default', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as PreguntaConReglas[]
}

export async function createPregunta(data: {
  texto: string
  tipo: PreguntaTipo
  orden_default?: number | null
  activa: boolean
  opciones?: string[] | null
}): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('preguntas_flow').insert({
    texto: data.texto,
    tipo: data.tipo,
    orden_default: data.orden_default ?? null,
    activa: data.activa,
    opciones: data.opciones ?? null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/flow-config')
}

export async function updatePregunta(
  id: number,
  data: {
    texto: string
    tipo: PreguntaTipo
    orden_default?: number | null
    activa: boolean
    opciones?: string[] | null
  }
): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('preguntas_flow')
    .update({
      texto: data.texto,
      tipo: data.tipo,
      orden_default: data.orden_default ?? null,
      activa: data.activa,
      opciones: data.opciones ?? null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/flow-config')
}

export async function togglePreguntaActiva(id: number, activa: boolean): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('preguntas_flow')
    .update({ activa })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/flow-config')
}

export async function deletePregunta(id: number): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('preguntas_flow').delete().eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/flow-config')
}

export async function createRegla(data: {
  pregunta_origen_id: number
  respuesta_valor: string | null
  pregunta_destino_id: number | null
}): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('reglas_flow').insert({
    pregunta_origen_id: data.pregunta_origen_id,
    respuesta_valor: data.respuesta_valor,
    pregunta_destino_id: data.pregunta_destino_id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/flow-config')
}

export async function deleteRegla(id: number): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('reglas_flow').delete().eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/flow-config')
}
