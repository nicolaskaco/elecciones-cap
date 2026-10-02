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
  rol?: string | null
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
  rolesAssigned?: number
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
  'Colaborador': 'Colaborador',
}

const TIPO_FROM_LABEL_LOWER: Record<string, RolListaTipo> = Object.fromEntries(
  Object.entries(TIPO_FROM_LABEL).map(([k, v]) => [k.toLowerCase(), v])
)

const ROLES_VALIDOS = 'Dirigente, Comisión Electoral, Comisión Fiscal, Asamblea Representativa, Colaborador'

export async function importPersonas(rows: ImportPersonasRow[]): Promise<ImportResult> {
  await requireAdmin()
  const supabase = await createClient()

  let inserted = 0
  let updated = 0
  let rolesAssigned = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const label = `Fila ${i + 2}`

    if (!row.nombre?.trim()) {
      errors.push(`${label}: campo Nombre requerido`)
      continue
    }

    let tipo: RolListaTipo | null = null
    if (row.rol?.trim()) {
      tipo = TIPO_FROM_LABEL_LOWER[row.rol.trim().toLowerCase()] ?? null
      if (!tipo) {
        errors.push(`${label}: Rol inválido "${row.rol}". Use: ${ROLES_VALIDOS}`)
        continue
      }
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

    let personaId: number
    if (existingId) {
      // Only overwrite fields present in the file, so missing columns don't wipe existing data
      const updatePayload = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== null)
      )
      const { error } = await supabase.from('personas').update(updatePayload).eq('id', existingId)
      if (error) {
        errors.push(`${label} (${row.nombre}): ${error.message}`)
        continue
      }
      updated++
      personaId = existingId
    } else {
      const { data, error } = await supabase.from('personas').insert(payload).select('id').single()
      if (error || !data) {
        errors.push(`${label} (${row.nombre}): ${error?.message ?? 'Error al crear persona'}`)
        continue
      }
      inserted++
      personaId = data.id
    }

    if (tipo) {
      const { data: existingRol } = await supabase
        .from('roles_lista')
        .select('id')
        .eq('persona_id', personaId)
        .eq('tipo', tipo)
        .maybeSingle()
      if (!existingRol) {
        const { error } = await supabase.from('roles_lista').insert({ persona_id: personaId, tipo })
        if (error) errors.push(`${label} (${row.nombre}): rol no asignado — ${error.message}`)
        else rolesAssigned++
      }
    }
  }

  revalidatePath('/personas-lista')
  revalidatePath('/lista')
  return { inserted, updated, errors, rolesAssigned }
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
      errors.push(`${label}: Rol inválido "${row.tipo}". Use: ${ROLES_VALIDOS}`)
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
