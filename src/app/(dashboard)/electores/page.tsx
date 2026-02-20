import { getElectores, getVoluntarios } from '@/lib/actions/electores'
import { getRequiredPerfil } from '@/lib/auth'
import { ElectoresDataTable } from './data-table'

export default async function ElectoresPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; estado?: string; sinAsignar?: string }>
}) {
  const params = await searchParams
  const perfil = await getRequiredPerfil()
  const isAdmin = perfil.rol === 'Admin'

  const electores = await getElectores({
    search: params.search,
    estado: (params.estado as '' | undefined) || '',
    sinAsignar: params.sinAsignar === '1',
  })

  const voluntarios = isAdmin ? await getVoluntarios() : []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isAdmin ? 'Electores' : 'Mis Electores'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isAdmin
            ? 'Gestion completa de electores'
            : 'Electores asignados a ti'}
        </p>
      </div>

      <ElectoresDataTable
        electores={electores}
        isAdmin={isAdmin}
        voluntarios={voluntarios}
      />
    </div>
  )
}
