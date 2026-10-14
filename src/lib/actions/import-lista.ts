'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { RolListaTipo } from '@/types/database'

export interface ImportPersonasRow {
  /** Row number in the source sheet, used in error messages */
  fila?: number
  nombre: string
  cedula?: string | null
  nro_socio?: string | null
  celular?: string | null
  telefono?: string | null
  email?: string | null
  fecha_nacimiento?: string | null
  direccion?: string | null
  quien_lo_trajo?: string | null
  comentario?: string | null
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

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

type PersonaMatch =
  | { tipo: 'nueva' }
  | { tipo: 'existente'; id: number; nombre: string }
  | { tipo: 'ambigua' }
  | { tipo: 'conflicto'; mensaje: string }

function describePersona(p: { nombre: string; cedula: string | null }) {
  return p.cedula ? `${p.nombre} (cédula ${p.cedula})` : p.nombre
}

// Matches by cédula, then by nro de socio (unique), then — only if the row has no cédula — by
// name when exactly one persona has it. Reports rows whose cédula and nro de socio point to
// different personas instead of letting the update hit the nro_socio unique constraint.
async function findExistingPersona(
  supabase: SupabaseServer,
  row: ImportPersonasRow,
): Promise<PersonaMatch> {
  const cedula = row.cedula?.trim() || null
  const nroSocio = row.nro_socio?.trim() || null

  const [byCedula, bySocio] = await Promise.all([
    cedula
      ? supabase.from('personas').select('id, nombre, cedula, nro_socio').eq('cedula', cedula).maybeSingle()
      : Promise.resolve({ data: null }),
    nroSocio
      ? supabase.from('personas').select('id, nombre, cedula, nro_socio').eq('nro_socio', nroSocio).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const cedulaMatch = byCedula.data
  const socioMatch = bySocio.data

  if (cedulaMatch && socioMatch && cedulaMatch.id !== socioMatch.id) {
    return {
      tipo: 'conflicto',
      mensaje: `La cédula coincide con ${describePersona(cedulaMatch)} pero el Nro de Socio ${nroSocio} pertenece a ${describePersona(socioMatch)}`,
    }
  }
  if (cedulaMatch) return { tipo: 'existente', id: cedulaMatch.id, nombre: cedulaMatch.nombre }
  if (socioMatch) {
    if (cedula && socioMatch.cedula && socioMatch.cedula !== cedula) {
      return {
        tipo: 'conflicto',
        mensaje: `El Nro de Socio ${nroSocio} pertenece a ${describePersona(socioMatch)}, con otra cédula`,
      }
    }
    return { tipo: 'existente', id: socioMatch.id, nombre: socioMatch.nombre }
  }
  if (cedula) return { tipo: 'nueva' }

  const escaped = row.nombre.trim().replace(/[\\%_]/g, '\\$&')
  const { data } = await supabase
    .from('personas')
    .select('id, nombre')
    .ilike('nombre', escaped)
    .limit(2)
  if (data && data.length > 1) return { tipo: 'ambigua' }
  if (data?.length === 1) return { tipo: 'existente', id: data[0].id, nombre: data[0].nombre }
  return { tipo: 'nueva' }
}

function parseTipo(rol: string | null | undefined): RolListaTipo | null | 'invalido' {
  if (!rol?.trim()) return null
  return TIPO_FROM_LABEL_LOWER[rol.trim().toLowerCase()] ?? 'invalido'
}

export interface ImportPersonaPreview {
  estado: 'nueva' | 'existente' | 'ambigua' | 'error'
  personaNombre?: string
  mensaje?: string
}

export async function previewImportPersonas(rows: ImportPersonasRow[]): Promise<ImportPersonaPreview[]> {
  await requireAdmin()
  const supabase = await createClient()

  const results: ImportPersonaPreview[] = []
  const CHUNK = 20
  for (let start = 0; start < rows.length; start += CHUNK) {
    const chunk = await Promise.all(rows.slice(start, start + CHUNK).map(async (row): Promise<ImportPersonaPreview> => {
      if (!row.nombre?.trim()) return { estado: 'error', mensaje: 'Nombre requerido' }
      if (parseTipo(row.rol) === 'invalido') return { estado: 'error', mensaje: `Rol inválido "${row.rol}"` }
      const match = await findExistingPersona(supabase, row)
      if (match.tipo === 'ambigua') return { estado: 'ambigua', mensaje: 'Varias personas con ese nombre, agregue cédula' }
      if (match.tipo === 'conflicto') return { estado: 'error', mensaje: match.mensaje }
      if (match.tipo === 'existente') return { estado: 'existente', personaNombre: match.nombre }
      return { estado: 'nueva' }
    }))
    results.push(...chunk)
  }
  return results
}

export async function importPersonas(rows: ImportPersonasRow[]): Promise<ImportResult> {
  await requireAdmin()
  const supabase = await createClient()

  let inserted = 0
  let updated = 0
  let rolesAssigned = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const label = `Fila ${row.fila ?? i + 2}`

    if (!row.nombre?.trim()) {
      errors.push(`${label}: campo Nombre requerido`)
      continue
    }

    const tipo = parseTipo(row.rol)
    if (tipo === 'invalido') {
      errors.push(`${label}: Rol inválido "${row.rol}". Use: ${ROLES_VALIDOS}`)
      continue
    }

    const match = await findExistingPersona(supabase, row)
    if (match.tipo === 'ambigua') {
      errors.push(`${label}: nombre "${row.nombre}" coincide con varias personas, agregue cédula`)
      continue
    }
    if (match.tipo === 'conflicto') {
      errors.push(`${label} (${row.nombre}): ${match.mensaje}`)
      continue
    }
    const existingId = match.tipo === 'existente' ? match.id : null

    const payload = {
      nombre: row.nombre.trim(),
      cedula: row.cedula?.trim() || null,
      nro_socio: row.nro_socio?.trim() || null,
      celular: row.celular?.trim() || null,
      telefono: row.telefono?.trim() || null,
      email: row.email?.trim() || null,
      fecha_nacimiento: row.fecha_nacimiento?.trim() || null,
      direccion: row.direccion?.trim() || null,
      quien_lo_trajo: row.quien_lo_trajo?.trim() || null,
      comentario: row.comentario?.trim() || null,
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
