'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { Gasto, GastoRubro } from '@/types/database'

export async function getGastos(): Promise<Gasto[]> {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('gastos')
    .select('*')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Gasto[]
}

export async function createGasto(data: {
  rubro: GastoRubro
  monto: number
  fecha: string
  concepto?: string | null
  programa_campana?: string | null
  quien_pago?: string | null
}): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('gastos').insert({
    rubro: data.rubro,
    monto: data.monto,
    fecha: data.fecha,
    concepto: data.concepto || null,
    programa_campana: data.programa_campana || null,
    quien_pago: data.quien_pago || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/gastos')
}

export async function updateGasto(
  id: number,
  data: {
    rubro: GastoRubro
    monto: number
    fecha: string
    concepto?: string | null
    programa_campana?: string | null
    quien_pago?: string | null
  }
): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('gastos')
    .update({
      rubro: data.rubro,
      monto: data.monto,
      fecha: data.fecha,
      concepto: data.concepto || null,
      programa_campana: data.programa_campana || null,
      quien_pago: data.quien_pago || null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/gastos')
}

export async function deleteGasto(id: number): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('gastos').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/gastos')
}
