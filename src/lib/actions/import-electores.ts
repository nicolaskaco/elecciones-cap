'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

interface ImportRow {
  nombre: string
  cedula?: string
  nro_socio?: string
  telefono?: string
  celular?: string
  email?: string
  direccion?: string
  fecha_nacimiento?: string
}

interface ImportResult {
  created: number
  updated: number
  errors: string[]
}

// Build lookup maps for existing personas in bulk (2 queries total regardless of row count)
async function buildLookupMaps(supabase: Awaited<ReturnType<typeof createClient>>, rows: ImportRow[]) {
  const cedulas = Array.from(new Set(rows.map((r) => r.cedula).filter(Boolean) as string[]))
  const nroSocios = Array.from(new Set(rows.map((r) => r.nro_socio).filter(Boolean) as string[]))

  const [cedulaRes, nroSocioRes] = await Promise.all([
    cedulas.length > 0
      ? supabase.from('personas').select('id, cedula').in('cedula', cedulas)
      : Promise.resolve({ data: [] as { id: number; cedula: string | null }[], error: null }),
    nroSocios.length > 0
      ? supabase.from('personas').select('id, nro_socio').in('nro_socio', nroSocios)
      : Promise.resolve({ data: [] as { id: number; nro_socio: string | null }[], error: null }),
  ])

  const byCedula = new Map<string, number>()
  cedulaRes.data?.forEach((p) => { if (p.cedula) byCedula.set(p.cedula, p.id) })

  const byNroSocio = new Map<string, number>()
  nroSocioRes.data?.forEach((p) => { if (p.nro_socio) byNroSocio.set(p.nro_socio, p.id) })

  return { byCedula, byNroSocio }
}

export async function previewImport(rows: ImportRow[]): Promise<{
  newRows: number[]
  updateRows: number[]
  errorRows: { index: number; message: string }[]
}> {
  await requireAdmin()
  const supabase = await createClient()

  const { byCedula, byNroSocio } = await buildLookupMaps(supabase, rows)

  const newRows: number[] = []
  const updateRows: number[] = []
  const errorRows: { index: number; message: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row.nombre) {
      errorRows.push({ index: i, message: 'nombre es requerido' })
      continue
    }
    const found =
      (row.cedula && byCedula.has(row.cedula)) ||
      (row.nro_socio && byNroSocio.has(row.nro_socio))
    if (found) updateRows.push(i)
    else newRows.push(i)
  }

  return { newRows, updateRows, errorRows }
}

export async function importElectores(rows: ImportRow[]): Promise<ImportResult> {
  await requireAdmin()
  const supabase = await createClient()

  const errors: string[] = []
  let created = 0
  let updated = 0

  // Validate rows
  const validRows = rows
    .map((row, i) => {
      if (!row.nombre) {
        errors.push(`Fila ${i + 1}: nombre es requerido`)
        return null
      }
      return { row, i }
    })
    .filter(Boolean) as { row: ImportRow; i: number }[]

  if (validRows.length === 0) return { created, updated, errors }

  // Batch lookup
  const { byCedula, byNroSocio } = await buildLookupMaps(supabase, validRows.map((r) => r.row))

  const toInsert: { row: ImportRow; i: number }[] = []
  const toUpdate: { row: ImportRow; i: number; personaId: number }[] = []

  for (const { row, i } of validRows) {
    let existingId: number | undefined
    if (row.cedula) existingId = byCedula.get(row.cedula)
    if (!existingId && row.nro_socio) existingId = byNroSocio.get(row.nro_socio)
    if (existingId) toUpdate.push({ row, i, personaId: existingId })
    else toInsert.push({ row, i })
  }

  // --- Bulk insert new personas + electores in chunks of 500 ---
  const INSERT_CHUNK = 500
  for (let c = 0; c < toInsert.length; c += INSERT_CHUNK) {
    const chunk = toInsert.slice(c, c + INSERT_CHUNK)
    const { data: newPersonas, error: insertError } = await supabase
      .from('personas')
      .insert(
        chunk.map(({ row }) => ({
          nombre: row.nombre,
          cedula: row.cedula || null,
          nro_socio: row.nro_socio || null,
          telefono: row.telefono || null,
          celular: row.celular || null,
          email: row.email || null,
          direccion: row.direccion || null,
          fecha_nacimiento: row.fecha_nacimiento || null,
        }))
      )
      .select('id')

    if (insertError || !newPersonas) {
      errors.push(`Error al insertar filas ${c + 1}-${c + chunk.length}: ${insertError?.message ?? 'Error desconocido'}`)
      continue
    }

    // Bulk insert electores for this chunk
    const { error: electorError } = await supabase
      .from('electores')
      .insert(newPersonas.map((p) => ({ persona_id: p.id, estado: 'Pendiente' })))
    if (electorError) {
      errors.push(`Error al crear electores para filas ${c + 1}-${c + chunk.length}: ${electorError.message}`)
    } else {
      created += newPersonas.length
    }
  }

  // --- Update existing personas in parallel chunks ---
  const CHUNK = 50
  for (let c = 0; c < toUpdate.length; c += CHUNK) {
    const chunk = toUpdate.slice(c, c + CHUNK)
    await Promise.all(
      chunk.map(({ row, personaId }) =>
        supabase
          .from('personas')
          .update({
            nombre: row.nombre,
            cedula: row.cedula || null,
            nro_socio: row.nro_socio || null,
            telefono: row.telefono || null,
            celular: row.celular || null,
            email: row.email || null,
            direccion: row.direccion || null,
            fecha_nacimiento: row.fecha_nacimiento || null,
          })
          .eq('id', personaId)
      )
    )
    updated += chunk.length
  }

  // Ensure electores exist for updated personas (bulk check + insert missing)
  if (toUpdate.length > 0) {
    const personaIds = toUpdate.map((t) => t.personaId)
    const { data: existingElectores } = await supabase
      .from('electores')
      .select('persona_id')
      .in('persona_id', personaIds)

    const existingSet = new Set(existingElectores?.map((e) => e.persona_id) ?? [])
    const missing = personaIds.filter((id) => !existingSet.has(id))
    if (missing.length > 0) {
      await supabase
        .from('electores')
        .insert(missing.map((pid) => ({ persona_id: pid, estado: 'Pendiente' })))
    }
  }

  revalidatePath('/electores')
  return { created, updated, errors }
}
