'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { RolListaTipo } from '@/types/database'

export interface ImportPersonasRow {
  nombre: string
  cedula?: string | null
  nro_socio?: string | null
  celular?: string | null
  telefono?: string | null
  email?: string | null
  fecha_nacimiento?: string | null
  direccion?: string | null
}

export interface ImportRolRow {
  cedula?: string | null
  nombre?: string | null
  tipo: string
  posicion?: string | null
  quien_lo_trajo?: string | null
  comentario?: string | null
}

export interface ImportResult {
  inserted: number
  updated: number
  errors: string[]
}

// Maps display label → DB enum value (accepts both accented and unaccented)
const TIPO_FROM_LABEL: Record<string, RolListaTipo> = {
  'Dirigente': 'Dirigente',
  'Comisión Electoral': 'Comision_Electoral',
  'Comision Electoral': 'Comision_Electoral',
  'Comision_Electoral': 'Comision_Electoral',
  'Comisión Fiscal': 'Comision_Fiscal',
  'Comision Fiscal': 'Comision_Fiscal',
  'Comision_Fiscal': 'Comision_Fiscal',
  'Asamblea Representativa': 'Asamblea_Representativa',
  'Asamblea_Representativa': 'Asamblea_Representativa',
}

export async function importPersonas(rows: ImportPersonasRow[]): Promise<ImportResult> {
  await requireAdmin()
  const supabase = await createClient()

  let inserted = 0
  let updated = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const label = `Fila ${i + 2}`

    if (!row.nombre?.trim()) {
      errors.push(`${label}: campo Nombre requerido`)
      continue
    }

    // Find existing persona by cédula
    let existingId: number | null = null
    if (row.cedula?.trim()) {
      const { data } = await supabase
        .from('personas')
        .select('id')
        .eq('cedula', row.cedula.trim())
        .maybeSingle()
      if (data) existingId = data.id
    }

    const payload = {
      nombre: row.nombre.trim(),
      cedula: row.cedula?.trim() || null,
      nro_socio: row.nro_socio?.trim() || null,
      celular: row.celular?.trim() || null,
      telefono: row.telefono?.trim() || null,
      email: row.email?.trim() || null,
      fecha_nacimiento: row.fecha_nacimiento?.trim() || null,
      direccion: row.direccion?.trim() || null,
    }

    if (existingId) {
      const { error } = await supabase.from('personas').update(payload).eq('id', existingId)
      if (error) errors.push(`${label} (${row.nombre}): ${error.message}`)
      else updated++
    } else {
      const { error } = await supabase.from('personas').insert(payload)
      if (error) errors.push(`${label} (${row.nombre}): ${error.message}`)
      else inserted++
    }
  }

  revalidatePath('/personas-lista')
  revalidatePath('/lista')
  return { inserted, updated, errors }
}

export async function importRolesLista(rows: ImportRolRow[]): Promise<ImportResult> {
  await requireAdmin()
  const supabase = await createClient()

  let inserted = 0
  const updated = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const label = `Fila ${i + 2}`

    // Validate tipo
    const tipo = TIPO_FROM_LABEL[row.tipo?.trim() ?? '']
    if (!tipo) {
      errors.push(`${label}: Rol inválido "${row.tipo}". Use: Dirigente, Comisión Electoral, Comisión Fiscal, Asamblea Representativa`)
      continue
    }

    // Find persona by cédula first, then by nombre
    let personaId: number | null = null
    if (row.cedula?.trim()) {
      const { data } = await supabase
        .from('personas')
        .select('id')
        .eq('cedula', row.cedula.trim())
        .maybeSingle()
      if (data) personaId = data.id
    }
    if (!personaId && row.nombre?.trim()) {
      const { data } = await supabase
        .from('personas')
        .select('id')
        .eq('nombre', row.nombre.trim())
        .maybeSingle()
      if (data) personaId = data.id
    }
    if (!personaId) {
      errors.push(`${label}: persona no encontrada (cédula: ${row.cedula || '—'}, nombre: ${row.nombre || '—'})`)
      continue
    }

    // Check uniqueness if posicion is set
    if (row.posicion?.trim()) {
      const { data: existing } = await supabase
        .from('roles_lista')
        .select('id')
        .eq('tipo', tipo)
        .eq('posicion', row.posicion.trim())
        .maybeSingle()
      if (existing) {
        errors.push(`${label}: posición "${row.posicion}" ya ocupada en ${tipo}`)
        continue
      }
    }

    const { error } = await supabase.from('roles_lista').insert({
      persona_id: personaId,
      tipo,
      posicion: row.posicion?.trim() || null,
      quien_lo_trajo: row.quien_lo_trajo?.trim() || null,
      comentario: row.comentario?.trim() || null,
    })

    if (error) errors.push(`${label}: ${error.message}`)
    else inserted++
  }

  revalidatePath('/lista')
  return { inserted, updated, errors }
}
