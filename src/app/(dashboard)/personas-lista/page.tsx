import { getPersonasLista } from '@/lib/actions/lista'
import { PersonasListaClient } from './personas-lista-client'

export default async function PersonasListaPage() {
  const personas = await getPersonasLista()
  return <PersonasListaClient personas={personas} />
}
