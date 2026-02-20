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

const LOOKUP_CHUNK = 400 // stay well under PostgREST URL length limit

// Chunk an array into sub-arrays of at most `size`
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

// Build lookup maps using chunked IN queries to avoid URL length limits
async function buildLookupMaps(supabase: Awaited<ReturnType<typeof createClient>>, rows: ImportRow[]) {
  const cedulas = Array.from(new Set(rows.map((r) => r.cedula).filter(Boolean) as string[]))
  const nroSocios = Array.from(new Set(rows.map((r) => r.nro_socio).filter(Boolean) as string[]))

  const byCedula = new Map<string, number>()
  const byNroSocio = new Map<string, number>()

  // Chunk cedula lookups
  for (const chunk of chunkArray(cedulas, LOOKUP_CHUNK)) {
    const { data } = await supabase.from('personas').select('id, cedula').in('cedula', chunk)
    data?.forEach((p) => { if (p.cedula) byCedula.set(p.cedula, p.id) })
  }

  // Chunk nro_socio lookups
  for (const chunk of chunkArray(nroSocios, LOOKUP_CHUNK)) {
    const { data } = await supabase.from('personas').select('id, nro_socio').in('nro_socio', chunk)
    data?.forEach((p) => { if (p.nro_socio) byNroSocio.set(p.nro_socio, p.id) })
  }

  return { byCedula, byNroSocio }
}

// Deduplicate rows within the file by nro_socio and cedula (keep first occurrence)
function deduplicateRows(rows: { row: ImportRow; i: number }[]): { row: ImportRow; i: number }[] {
  const seenNroSocio = new Set<string>()
  const seenCedula = new Set<string>()
  return rows.filter(({ row }) => {
    if (row.nro_socio) {
      if (seenNroSocio.has(row.nro_socio)) return false
      seenNroSocio.add(row.nro_socio)
    }
    if (row.cedula) {
      if (seenCedula.has(row.cedula)) return false
      seenCedula.add(row.cedula)
    }
    return true
  })
}

function personaPayload(row: ImportRow) {
  return {
    nombre: row.nombre,
    cedula: row.cedula || null,
    nro_socio: row.nro_socio || null,
    telefono: row.telefono || null,
    celular: row.celular || null,
    email: row.email || null,
    direccion: row.direccion || null,
    fecha_nacimiento: row.fecha_nacimiento || null,
  }
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
      (row.nro_socio && byNroSocio.has(row.nro_socio)) ||
      (row.cedula && byCedula.has(row.cedula))
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

  // Validate
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

  // Batch lookup with chunked IN queries
  const { byCedula, byNroSocio } = await buildLookupMaps(supabase, validRows.map((r) => r.row))

  const toInsertRaw: { row: ImportRow; i: number }[] = []
  const toUpdate: { row: ImportRow; i: number; personaId: number }[] = []

  for (const { row, i } of validRows) {
    // Prioritize nro_socio lookup since most rows won't have cedula
    let existingId: number | undefined
    if (row.nro_socio) existingId = byNroSocio.get(row.nro_socio)
    if (!existingId && row.cedula) existingId = byCedula.get(row.cedula)
    if (existingId) toUpdate.push({ row, i, personaId: existingId })
    else toInsertRaw.push({ row, i })
  }

  // Deduplicate inserts by nro_socio/cedula within the file itself
  const toInsert = deduplicateRows(toInsertRaw)

  // --- Bulk insert new personas + electores in chunks of 500 ---
  const INSERT_CHUNK = 500
  for (let c = 0; c < toInsert.length; c += INSERT_CHUNK) {
    const chunk = toInsert.slice(c, c + INSERT_CHUNK)

    // Use upsert with ignoreDuplicates as safety net for any edge cases
    const { data: newPersonas, error: insertError } = await supabase
      .from('personas')
      .upsert(chunk.map(({ row }) => personaPayload(row)), {
        onConflict: 'nro_socio',
        ignoreDuplicates: false,
      })
      .select('id')

    if (insertError || !newPersonas) {
      errors.push(`Error al insertar filas ${c + 1}-${c + chunk.length}: ${insertError?.message ?? 'Error desconocido'}`)
      continue
    }

    // Bulk insert electores for this chunk (skip if already exists)
    const { data: existingElectores } = await supabase
      .from('electores')
      .select('persona_id')
      .in('persona_id', newPersonas.map((p) => p.id))

    const existingSet = new Set(existingElectores?.map((e) => e.persona_id) ?? [])
    const newElectores = newPersonas.filter((p) => !existingSet.has(p.id))

    if (newElectores.length > 0) {
      await supabase
        .from('electores')
        .insert(newElectores.map((p) => ({ persona_id: p.id, estado: 'Pendiente' })))
      created += newElectores.length
    }
  }

  // --- Update existing personas in parallel chunks of 50 ---
  const UPDATE_CHUNK = 50
  for (let c = 0; c < toUpdate.length; c += UPDATE_CHUNK) {
    const chunk = toUpdate.slice(c, c + UPDATE_CHUNK)
    await Promise.all(
      chunk.map(({ row, personaId }) =>
        supabase.from('personas').update(personaPayload(row)).eq('id', personaId)
      )
    )
    updated += chunk.length
  }

  // Ensure electores exist for updated personas (chunked IN queries)
  if (toUpdate.length > 0) {
    const personaIds = toUpdate.map((t) => t.personaId)
    const existingSet = new Set<number>()

    for (const chunk of chunkArray(personaIds, LOOKUP_CHUNK)) {
      const { data } = await supabase.from('electores').select('persona_id').in('persona_id', chunk)
      data?.forEach((e) => existingSet.add(e.persona_id))
    }

    const missing = personaIds.filter((id) => !existingSet.has(id))
    if (missing.length > 0) {
      for (const chunk of chunkArray(missing, INSERT_CHUNK)) {
        await supabase
          .from('electores')
          .insert(chunk.map((pid) => ({ persona_id: pid, estado: 'Pendiente' })))
      }
    }
  }

  revalidatePath('/electores')
  return { created, updated, errors }
}
