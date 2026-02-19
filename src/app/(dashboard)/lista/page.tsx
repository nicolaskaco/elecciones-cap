import { getRolesLista, getPersonasAll } from '@/lib/actions/lista'
import { ListaClient } from './lista-client'

export default async function ListaPage() {
  const [roles, personas] = await Promise.all([getRolesLista(), getPersonasAll()])
  return <ListaClient roles={roles} personas={personas} />
}
