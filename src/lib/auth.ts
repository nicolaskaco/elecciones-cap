import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Perfil } from '@/types/database'

/**
 * Returns the authenticated user's perfil, or redirects to /login.
 */
export async function getRequiredPerfil(): Promise<Perfil> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !perfil) redirect('/login')

  return perfil as Perfil
}

/**
 * Returns the perfil only if the user is an Admin; otherwise redirects to /.
 */
export async function requireAdmin(): Promise<Perfil> {
  const perfil = await getRequiredPerfil()

  if (perfil.rol !== 'Admin') redirect('/')

  return perfil
}
