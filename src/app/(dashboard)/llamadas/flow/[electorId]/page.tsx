import { notFound } from 'next/navigation'
import { getRequiredPerfil } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getFlowData } from '@/lib/actions/llamadas'
import { FlowEngine } from './flow-engine'
import type { Elector } from '@/types/database'

interface Props {
  params: Promise<{ electorId: string }>
}

export default async function FlowPage({ params }: Props) {
  const { electorId } = await params
  const id = parseInt(electorId)
  if (isNaN(id)) notFound()

  const perfil = await getRequiredPerfil()
  const supabase = await createClient()

  const { data: elector } = await supabase
    .from('electores')
    .select('*')
    .eq('id', id)
    .single()

  if (!elector) notFound()

  // Voluntarios can only call their assigned electores
  if (perfil.rol === 'Voluntario' && elector.asignado_a !== perfil.id) {
    notFound()
  }

  const { preguntas, reglas } = await getFlowData()

  return (
    <FlowEngine
      elector={elector as Elector}
      preguntas={preguntas}
      reglas={reglas}
    />
  )
}
