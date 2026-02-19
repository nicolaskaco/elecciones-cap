import { getComisionesInteres, getPersonasParaComisiones } from '@/lib/actions/comisiones'
import { ComisionesClient } from './comisiones-client'

export default async function ComisionesPage() {
  const [comisiones, personas] = await Promise.all([
    getComisionesInteres(),
    getPersonasParaComisiones(),
  ])
  return <ComisionesClient comisiones={comisiones} personas={personas} />
}
