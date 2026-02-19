'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { UserRol } from '@/types/database'

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
