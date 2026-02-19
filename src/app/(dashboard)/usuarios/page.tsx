import { requireAdmin } from '@/lib/auth'
import { getUsuarios } from '@/lib/actions/usuarios'
import { UsuariosTable } from './usuarios-table'

export default async function UsuariosPage() {
  const perfil = await requireAdmin()
  const usuarios = await getUsuarios()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground text-sm">Gestion de usuarios del sistema</p>
      </div>

      <UsuariosTable usuarios={usuarios} currentUserId={perfil.id} />
    </div>
  )
}
