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

// Build lookup maps from electores table directly (cedula/nro_socio → elector id)
async function buildLookupMaps(supabase: Awaited<ReturnType<typeof createClient>>, rows: ImportRow[]) {
  const cedulas = Array.from(new Set(rows.map((r) => r.cedula).filter(Boolean) as string[]))
  const nroSocios = Array.from(new Set(rows.map((r) => r.nro_socio).filter(Boolean) as string[]))

  const byCedula = new Map<string, number>()
  const byNroSocio = new Map<string, number>()

  for (const chunk of chunkArray(cedulas, LOOKUP_CHUNK)) {
    const { data } = await supabase.from('electores').select('id, cedula').in('cedula', chunk)
    data?.forEach((e) => { if (e.cedula) byCedula.set(e.cedula, e.id) })
  }

  for (const chunk of chunkArray(nroSocios, LOOKUP_CHUNK)) {
    const { data } = await supabase.from('electores').select('id, nro_socio').in('nro_socio', chunk)
    data?.forEach((e) => { if (e.nro_socio) byNroSocio.set(e.nro_socio, e.id) })
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

function electorPayload(row: ImportRow) {
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
  const toUpdate: { row: ImportRow; i: number; electorId: number }[] = []

  for (const { row, i } of validRows) {
    let existingId: number | undefined
    if (row.nro_socio) existingId = byNroSocio.get(row.nro_socio)
    if (!existingId && row.cedula) existingId = byCedula.get(row.cedula)
    if (existingId) toUpdate.push({ row, i, electorId: existingId })
    else toInsertRaw.push({ row, i })
  }

  // Deduplicate inserts by nro_socio/cedula within the file itself
  const toInsert = deduplicateRows(toInsertRaw)

  // --- Bulk insert new electores in chunks of 500 ---
  const INSERT_CHUNK = 500
  for (let c = 0; c < toInsert.length; c += INSERT_CHUNK) {
    const chunk = toInsert.slice(c, c + INSERT_CHUNK)

    const { error: insertError } = await supabase
      .from('electores')
      .insert(chunk.map(({ row }) => ({ ...electorPayload(row), estado: 'Pendiente' })))

    if (insertError) {
      errors.push(`Error al insertar filas ${c + 1}-${c + chunk.length}: ${insertError.message}`)
      continue
    }

    created += chunk.length
  }

  // --- Update existing electores in parallel chunks of 50 ---
  const UPDATE_CHUNK = 50
  for (let c = 0; c < toUpdate.length; c += UPDATE_CHUNK) {
    const chunk = toUpdate.slice(c, c + UPDATE_CHUNK)
    await Promise.all(
      chunk.map(({ row, electorId }) =>
        supabase.from('electores').update(electorPayload(row)).eq('id', electorId)
      )
    )
    updated += chunk.length
  }

  revalidatePath('/electores')
  return { created, updated, errors }
}
