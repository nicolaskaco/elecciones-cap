import { getRequiredPerfil } from '@/lib/auth'
import { getElectoresParaLlamar, getAllLlamadas } from '@/lib/actions/llamadas'
import { VoluntarioView, AdminView } from './llamadas-client'

export default async function LlamadasPage() {
  const perfil = await getRequiredPerfil()

  if (perfil.rol === 'Admin') {
    const llamadas = await getAllLlamadas()
    return <AdminView llamadas={llamadas} />
  }

  const electores = await getElectoresParaLlamar()
  return <VoluntarioView electores={electores} />
}
