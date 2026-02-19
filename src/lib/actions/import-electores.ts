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

export async function importElectores(rows: ImportRow[]): Promise<ImportResult> {
  await requireAdmin()
  const supabase = await createClient()

  let created = 0
  let updated = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    if (!row.nombre) {
      errors.push(`Fila ${i + 1}: nombre es requerido`)
      continue
    }

    try {
      // Try to find existing persona by cedula or nro_socio
      let existingPersona: { id: number } | null = null

      if (row.cedula) {
        const { data } = await supabase
          .from('personas')
          .select('id')
          .eq('cedula', row.cedula)
          .single()
        if (data) existingPersona = data
      }

      if (!existingPersona && row.nro_socio) {
        const { data } = await supabase
          .from('personas')
          .select('id')
          .eq('nro_socio', row.nro_socio)
          .single()
        if (data) existingPersona = data
      }

      if (existingPersona) {
        // Update existing persona
        await supabase
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
          .eq('id', existingPersona.id)

        // Ensure elector exists for this persona
        const { data: existingElector } = await supabase
          .from('electores')
          .select('id')
          .eq('persona_id', existingPersona.id)
          .single()

        if (!existingElector) {
          await supabase.from('electores').insert({
            persona_id: existingPersona.id,
            estado: 'Pendiente',
          })
        }

        updated++
      } else {
        // Create new persona + elector
        const { data: newPersona, error: personaError } = await supabase
          .from('personas')
          .insert({
            nombre: row.nombre,
            cedula: row.cedula || null,
            nro_socio: row.nro_socio || null,
            telefono: row.telefono || null,
            celular: row.celular || null,
            email: row.email || null,
            direccion: row.direccion || null,
            fecha_nacimiento: row.fecha_nacimiento || null,
          })
          .select('id')
          .single()

        if (personaError) {
          errors.push(`Fila ${i + 1}: ${personaError.message}`)
          continue
        }

        await supabase.from('electores').insert({
          persona_id: newPersona.id,
          estado: 'Pendiente',
        })

        created++
      }
    } catch {
      errors.push(`Fila ${i + 1}: Error inesperado`)
    }
  }

  revalidatePath('/electores')
  return { created, updated, errors }
}

export async function previewImport(rows: ImportRow[]): Promise<{
  newRows: number[]
  updateRows: number[]
  errorRows: { index: number; message: string }[]
}> {
  await requireAdmin()
  const supabase = await createClient()

  const newRows: number[] = []
  const updateRows: number[] = []
  const errorRows: { index: number; message: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    if (!row.nombre) {
      errorRows.push({ index: i, message: 'nombre es requerido' })
      continue
    }

    let found = false

    if (row.cedula) {
      const { data } = await supabase
        .from('personas')
        .select('id')
        .eq('cedula', row.cedula)
        .single()
      if (data) found = true
    }

    if (!found && row.nro_socio) {
      const { data } = await supabase
        .from('personas')
        .select('id')
        .eq('nro_socio', row.nro_socio)
        .single()
      if (data) found = true
    }

    if (found) {
      updateRows.push(i)
    } else {
      newRows.push(i)
    }
  }

  return { newRows, updateRows, errorRows }
}
