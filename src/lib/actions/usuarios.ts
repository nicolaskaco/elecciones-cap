'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { UserRol } from '@/types/database'
import type { InviteUsuarioFormData } from '@/lib/validations/invite'

export async function getUsuarios() {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, email, rol, created_at')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function updateUsuarioRol(userId: string, rol: UserRol) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('perfiles')
    .update({ rol })
    .eq('id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/usuarios')
}

export async function inviteUsuario(input: InviteUsuarioFormData): Promise<{ inviteUrl: string }> {
  const perfil = await requireAdmin()
  const supabase = await createClient()

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.access_token) {
    throw new Error('No se pudo obtener la sesión activa')
  }

  const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invite-user`

  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      email: input.email,
      role: input.role,
      permissions: {
        can_manage_electores: input.can_manage_electores,
        can_access_gastos: input.can_access_gastos,
        can_access_lista: input.can_access_lista,
        can_access_eventos: input.can_access_eventos,
        can_access_campanas: input.can_access_campanas,
      },
      invitedBy: perfil.id,
    }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `Error al invitar usuario (${response.status})`)
  }

  const { inviteUrl } = await response.json() as { inviteUrl: string }
  revalidatePath('/usuarios')
  return { inviteUrl }
}
