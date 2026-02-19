import { getRolesLista } from '@/lib/actions/lista'
import { ListaClient } from './lista-client'

export default async function ListaPage() {
  const roles = await getRolesLista()
  return <ListaClient roles={roles} />
}
