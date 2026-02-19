import { requireAdmin } from '@/lib/auth'
import { getElectores } from '@/lib/actions/electores'
import { CartasClient } from './cartas-client'

export default async function CartasPage() {
  await requireAdmin()
  const electores = await getElectores({ estado: 'Para_Enviar' })
  return <CartasClient electores={electores} />
}
