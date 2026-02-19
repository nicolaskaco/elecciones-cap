'use server'

import { createClient } from '@/lib/supabase/server'
import { getRequiredPerfil, requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { RESULTADO_TO_ESTADO, type SubmitLlamadaInput } from '@/lib/validations/llamada'
import type { ElectorConPersona, LlamadaConDetalles, PreguntaFlow, ReglaFlow } from '@/types/database'

export async function getElectoresParaLlamar(): Promise<ElectorConPersona[]> {
  const supabase = await createClient()
  const perfil = await getRequiredPerfil()

  let query = supabase
    .from('electores')
    .select('*, personas(*)')
    .order('created_at', { ascending: false })

  if (perfil.rol === 'Voluntario') {
    query = query.eq('asignado_a', perfil.id)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as ElectorConPersona[]
}

export async function getAllLlamadas(): Promise<LlamadaConDetalles[]> {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('llamadas')
    .select('*, electores(personas(nombre)), perfiles(nombre)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as LlamadaConDetalles[]
}

export async function getFlowData(): Promise<{
  preguntas: PreguntaFlow[]
  reglas: ReglaFlow[]
}> {
  const supabase = await createClient()
  await getRequiredPerfil()

  const [preguntasResult, reglasResult] = await Promise.all([
    supabase
      .from('preguntas_flow')
      .select('*')
      .eq('activa', true)
      .order('orden_default', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
    supabase.from('reglas_flow').select('*'),
  ])

  if (preguntasResult.error) throw new Error(preguntasResult.error.message)
  if (reglasResult.error) throw new Error(reglasResult.error.message)

  return {
    preguntas: (preguntasResult.data ?? []) as PreguntaFlow[],
    reglas: (reglasResult.data ?? []) as ReglaFlow[],
  }
}

export async function confirmEnviarLista(
  electorId: number,
  personaId: number,
  direccion: string | null
): Promise<void> {
  const supabase = await createClient()
  const perfil = await getRequiredPerfil()

  if (perfil.rol === 'Voluntario') {
    const { data: elector } = await supabase
      .from('electores')
      .select('asignado_a')
      .eq('id', electorId)
      .single()
    if (!elector || elector.asignado_a !== perfil.id) throw new Error('Sin permiso')
  }

  const [electorUpdate, personaUpdate] = await Promise.all([
    supabase.from('electores').update({ enviar_lista: true }).eq('id', electorId),
    supabase.from('personas').update({ direccion: direccion ?? null }).eq('id', personaId),
  ])

  if (electorUpdate.error) throw new Error(electorUpdate.error.message)
  if (personaUpdate.error) throw new Error(personaUpdate.error.message)

  revalidatePath('/electores')
  revalidatePath(`/electores/${electorId}`)
}

export async function submitLlamada(input: SubmitLlamadaInput): Promise<{ llamada_id: number }> {
  const supabase = await createClient()
  const perfil = await getRequiredPerfil()

  // Voluntarios can only submit for their assigned electores
  if (perfil.rol === 'Voluntario') {
    const { data: elector, error: electorError } = await supabase
      .from('electores')
      .select('asignado_a')
      .eq('id', input.elector_id)
      .single()

    if (electorError || !elector) throw new Error('Elector no encontrado')
    if (elector.asignado_a !== perfil.id) throw new Error('No tienes permiso para registrar esta llamada')
  }

  // Insert llamada
  const { data: llamada, error: llamadaError } = await supabase
    .from('llamadas')
    .insert({
      elector_id: input.elector_id,
      voluntario_id: perfil.id,
      resultado: input.resultado,
      fecha: new Date().toISOString().split('T')[0],
    })
    .select('id')
    .single()

  if (llamadaError || !llamada) throw new Error(llamadaError?.message ?? 'Error al guardar llamada')

  // Bulk insert respuestas
  if (input.respuestas.length > 0) {
    const { error: respuestasError } = await supabase.from('respuestas_flow').insert(
      input.respuestas.map((r) => ({
        llamada_id: llamada.id,
        pregunta_id: r.pregunta_id,
        valor: r.valor,
      }))
    )
    if (respuestasError) throw new Error(respuestasError.message)
  }

  // Update elector estado
  // For Nos_Vota: use Para_Enviar if they confirmed lista delivery, otherwise Confirmado
  const { data: electorActual } = await supabase
    .from('electores')
    .select('enviar_lista')
    .eq('id', input.elector_id)
    .single()

  const nuevoEstado =
    input.resultado === 'Nos_Vota' && electorActual?.enviar_lista
      ? 'Para_Enviar'
      : RESULTADO_TO_ESTADO[input.resultado]

  const { error: updateError } = await supabase
    .from('electores')
    .update({ estado: nuevoEstado })
    .eq('id', input.elector_id)

  if (updateError) throw new Error(updateError.message)

  revalidatePath('/llamadas')
  revalidatePath('/electores')
  revalidatePath(`/electores/${input.elector_id}`)

  return { llamada_id: llamada.id }
}
